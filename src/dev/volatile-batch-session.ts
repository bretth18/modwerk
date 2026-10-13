// SPDX-License-Identifier: GPL-3.0-or-later
// Private preparation only. No production USB adapter, public/MCP import or persistent command.
import { encodeVolatileBundle, encodeVolatileRequest, parseVolatileStatus, splitVolatileChunks, VOLATILE_CAPABILITY,
  type VolatileRecord, type VolatileRequest, type VolatileStatus } from './volatile-batch-wire.ts'

/** Fixed MWVB submit / MWVS result / MWVS state operations only. No automatic retries.
 * The adapter must serialize whole transfers and stop late replies after cancellation. */
export interface VolatileTransport {
  submit(frame: Uint8Array, signal: AbortSignal): Promise<void>
  result(signal: AbortSignal): Promise<Uint8Array>
  state(signal: AbortSignal): Promise<Uint8Array>
}
export interface VolatileObservation { base: string; session: string; capabilities: number }
export interface VolatileSessionOptions {
  timeoutMs?: number; trialMs?: number; visible: () => boolean
}
interface Offer { baseline: string; digest: string; length: number; records: number; transaction: number; generation: number; verified: boolean }
export class VolatileUnconfirmedError extends Error {
  readonly lastConfirmed?: Readonly<VolatileStatus>
  constructor(message: string, lastConfirmed?: Readonly<VolatileStatus>, cause?: unknown) {
    super(message, { cause }); this.name = 'VolatileUnconfirmedError'; this.lastConfirmed = lastConfirmed
  }
}

/** One serial, volatile transaction. Only an acknowledged engine Begin grants
 * ownership. Lost/ambiguous writes or replies poison this channel permanently;
 * cached state cannot adopt a transaction, retry Begin or manufacture rollback.
 * The independently qualified board expiry remains responsible for unknown work. */
export class VolatileBatchSession {
  private current?: Readonly<VolatileStatus>
  private offer?: Offer
  private broken = false
  private busy = false
  private used = false
  private sequence = 0
  private expires = 0
  private lastTouch = 0
  private readonly timeout: number
  private readonly trialMs: number
  private readonly transport: VolatileTransport
  private readonly observed: VolatileObservation
  private readonly options: VolatileSessionOptions
  private constructor(transport: VolatileTransport, observed: VolatileObservation, options: VolatileSessionOptions) {
    this.transport = transport; this.observed = observed; this.options = options
    this.timeout = options.timeoutMs ?? 8000; this.trialMs = options.trialMs ?? 60000
    if (!Number.isInteger(observed.capabilities) || observed.capabilities < 0 || observed.capabilities > 0xffffffff ||
      !(observed.capabilities & VOLATILE_CAPABILITY)) throw new Error('Private volatile service is unavailable.')
    if (!Number.isInteger(this.timeout) || this.timeout < 1 || this.timeout > 9000 ||
      !Number.isInteger(this.trialMs) || this.trialMs < 1 || this.trialMs > 120000 || typeof options.visible !== 'function')
      throw new Error('Private volatile session requires a bounded timeout/trial and visibility provider.')
  }
  static async connect(transport: VolatileTransport, observed: VolatileObservation, options: VolatileSessionOptions) {
    const client = new VolatileBatchSession(transport, Object.freeze({ ...observed }), { ...options })
    await client.bounded('state', async signal => {
      const status = parseVolatileStatus(await transport.state(signal), client.observed)
      client.expect(!signal.aborted && status.phase === 'idle' && status.result === 'ok', 'Device is not confirmed idle.')
      client.current = status; client.sequence = status.sequence
    })
    return client
  }
  get status(): Readonly<VolatileStatus> {
    if (!this.current) throw new Error('Device state has not been confirmed.')
    return this.current
  }
  get connectionTrusted(): boolean { return !this.broken }
  get ownsTransaction(): boolean { return !!this.offer && !this.broken }
  private uncertain(message: string, cause?: unknown): never {
    this.broken = true
    throw new VolatileUnconfirmedError(message, this.current, cause)
  }
  private expect(condition: boolean, message: string) {
    if (!condition) this.uncertain(message)
  }
  private async exclusive<T>(run: () => Promise<T>): Promise<T> {
    if (this.broken) throw new VolatileUnconfirmedError('No commands after an unconfirmed operation.', this.current)
    if (this.busy) throw new Error('Another volatile operation is in progress.')
    this.busy = true
    try { return await run() } finally { this.busy = false }
  }
  private async bounded<T>(label: string, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([run(controller.signal), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('Acknowledgment deadline expired.')) }, this.timeout)
      })])
    } catch (error) {
      controller.abort(); return this.uncertain(label + ' was not confirmed; no further commands are permitted.', error)
    } finally { if (timer !== undefined) clearTimeout(timer) }
  }
  private next(): number {
    if (this.sequence === 0xffffffff) throw new Error('Volatile command sequence is exhausted.')
    return ++this.sequence
  }
  private sameLimits(status: Readonly<VolatileStatus>) {
    const before = this.status
    this.expect(status.limits.stageBytes === before.limits.stageBytes && status.limits.records === before.limits.records &&
      status.limits.participants === before.limits.participants && status.poolBytes === before.poolBytes, 'Device limits changed.')
  }
  private owned(): Offer {
    if (!this.offer) throw new Error('This client has no acknowledged transaction.')
    return this.offer
  }
  private sameOffer(status: Readonly<VolatileStatus>, offer: Offer) {
    this.expect(status.transaction === offer.transaction && status.generation === offer.generation &&
      status.baseline === offer.baseline && status.offer === offer.digest && status.total === offer.length &&
      (!offer.verified || status.records === offer.records),
    'Transaction, baseline or complete offer changed.')
  }
  private async command(request: VolatileRequest, validate: (status: Readonly<VolatileStatus>, pending: boolean) => void) {
    const frame = encodeVolatileRequest(request)
    return this.bounded(request.command, async signal => {
      // An uncertain OUT is never followed by result adoption, even for Begin.
      await this.transport.submit(frame, signal)
      this.expect(!signal.aborted, 'Command acknowledgement expired.')
      for (;;) {
        const status = parseVolatileStatus(await this.transport.result(signal), this.observed)
        this.expect(!signal.aborted, 'Result acknowledgement expired.')
        this.sameLimits(status)
        // A lower sequence is the preceding cached result, never this command's ACK.
        this.expect(status.sequence <= request.sequence, 'Another command replaced the owned result.')
        if (status.sequence === request.sequence) {
          const pending = status.result === 'queued' || status.result === 'pending'
          validate(status, pending)
          this.expect(pending || status.result === 'ok', 'Device refused the owned command: ' + status.result)
          if (!pending) { this.current = status; return status }
        }
        await new Promise<void>((resolve, reject) => {
          const finish = () => { signal.removeEventListener('abort', cancel); resolve() }
          const timer = setTimeout(finish, 25)
          const cancel = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(new Error('Result polling cancelled.')) }
          if (signal.aborted) cancel(); else signal.addEventListener('abort', cancel, { once: true })
        })
      }
    })
  }
  private ownerRequest(command: 'verify' | 'activate' | 'startTrial' | 'rollback' | 'abort' | 'touch'): VolatileRequest {
    const offer = this.owned()
    return { command, ...this.observed, transaction: offer.transaction, generation: offer.generation, sequence: this.next() }
  }
  /** Copies and validates packages before the first write. Does not initialize
   * DSPs, publish a record, start playback, accept or write a saved file. */
  async stage(records: readonly VolatileRecord[], options: { signal?: AbortSignal } = {}) {
    return this.exclusive(async () => {
      if (this.used || this.offer || this.status.phase !== 'idle') throw new Error('Use a fresh idle session for one transaction.')
      const baseline = this.status.current!
      const bundle = await encodeVolatileBundle(this.observed.base, baseline, records, this.status.limits)
      const cancelled = () => { if (options.signal?.aborted) throw new DOMException('Staging cancelled.', 'AbortError') }
      cancelled()
      // Recheck the exact whole baseline immediately before Begin; no state read grants ownership.
      const before = await this.bounded('baseline', async signal => parseVolatileStatus(await this.transport.state(signal), this.observed))
      this.sameLimits(before)
      this.expect(before.phase === 'idle' && before.result === 'ok' && before.current === baseline &&
        before.transaction === this.status.transaction && before.generation === this.status.generation &&
        before.sequence === this.status.sequence, 'Baseline changed before Begin.')
      cancelled(); this.used = true
      const sequence = this.next()
      const begun = await this.command({ command: 'begin', ...this.observed, sequence, baseline,
        digest: bundle.sha256, length: bundle.data.length }, (status, pending) => {
        if (pending && status.phase === 'idle') {
          this.expect(status.result === 'queued' && status.transaction === 0 && status.generation === 0 &&
            status.current === baseline, 'Queued Begin changed unowned state.')
          return
        }
        this.expect(status.phase === 'receiving' && status.result === 'ok' && status.received === 0 &&
          status.transaction > before.transaction && status.generation > before.generation &&
          status.baseline === baseline && status.current === baseline && status.offer === bundle.sha256 &&
          status.total === bundle.data.length, 'Begin did not acknowledge a fresh bound transaction.')
      })
      const offer: Offer = { baseline, digest: bundle.sha256, length: bundle.data.length,
        records: new DataView(bundle.data.buffer).getUint16(10), transaction: begun.transaction, generation: begun.generation, verified: false }
      this.offer = offer
      for (const chunk of splitVolatileChunks(bundle.data)) {
        cancelled()
        await this.command({ command: 'chunk', ...this.observed, transaction: offer.transaction,
          generation: offer.generation, sequence: this.next(), ...chunk }, (status, pending) => {
          this.sameOffer(status, offer)
          this.expect(status.phase === 'receiving' && status.current === baseline &&
            status.received === chunk.offset + (pending ? 0 : chunk.data.length), 'Chunk was not completely acknowledged.')
        })
      }
      cancelled()
      const verified = await this.command(this.ownerRequest('verify'), (status, pending) => {
        this.sameOffer(status, offer)
        this.expect(status.current === baseline && (pending ? status.phase === 'receiving' :
          status.phase === 'verified' && status.records === offer.records), 'Complete bundle was not verified.')
      })
      offer.verified = true; return verified
    })
  }
  async activate() {
    return this.exclusive(async () => {
      const offer = this.owned()
      if (this.status.phase !== 'verified') throw new Error('Verify the complete bundle first.')
      const result = await this.command(this.ownerRequest('activate'), (status, pending) => {
        this.sameOffer(status, offer)
        this.expect(pending ? ['verified', 'initializing', 'publishing'].includes(status.phase) :
          status.phase === 'stoppedTrial' && status.records === offer.records && !!status.current,
        'Complete stopped trial publication was not confirmed.')
      })
      this.expires = performance.now() + this.trialMs; this.lastTouch = performance.now()
      return result
    })
  }
  async startTrial() {
    return this.exclusive(async () => {
      const offer = this.owned(), current = this.status.current
      if (this.status.phase !== 'stoppedTrial') throw new Error('A complete stopped trial is required.')
      if (!this.options.visible() || performance.now() >= this.expires) return this.rollbackInternal()
      return this.command(this.ownerRequest('startTrial'), (status, pending) => {
        this.sameOffer(status, offer)
        this.expect(status.current === current && status.records === offer.records &&
          status.phase === (pending ? 'stoppedTrial' : 'runningTrial'), 'Trial release was not confirmed.')
      })
    })
  }
  /** Manual visible-owner renewal; no hidden timer. Hiding or reaching the
   * absolute duration requests rollback instead of renewing the board lease. */
  async touch() {
    return this.exclusive(async () => {
      const offer = this.owned(), before = this.status
      if (!['stoppedTrial', 'runningTrial'].includes(before.phase)) throw new Error('No active trial to renew.')
      if (!this.options.visible() || performance.now() >= this.expires) return this.rollbackInternal()
      if (performance.now() - this.lastTouch < 1000) throw new Error('Touch is limited to once per second.')
      const result = await this.command(this.ownerRequest('touch'), (status) => {
        this.sameOffer(status, offer)
        this.expect(status.phase === before.phase && status.current === before.current && status.records === offer.records,
          'Touch changed the trial.')
      })
      this.lastTouch = performance.now(); return result
    })
  }
  private async rollbackInternal(abort = false) {
    const offer = this.owned()
    const result = await this.command(this.ownerRequest(abort ? 'abort' : 'rollback'), (status, pending) => {
      if (pending) {
        this.sameOffer(status, offer)
        this.expect(status.phase === 'rollingBack' || status.phase === this.status.phase, 'Rollback journal changed.')
      } else this.expect(status.phase === 'idle' && status.transaction === offer.transaction &&
        status.generation === offer.generation && status.baseline === offer.baseline && status.current === offer.baseline,
      'Complete baseline restoration was not confirmed.')
    })
    this.offer = undefined; return result
  }
  async rollback() { return this.exclusive(() => this.rollbackInternal()) }
  async abort() {
    return this.exclusive(() => {
      if (!['receiving', 'verified'].includes(this.status.phase) || this.status.touched)
        throw new Error('Abort requires an untouched staged bundle.')
      return this.rollbackInternal(true)
    })
  }
}
