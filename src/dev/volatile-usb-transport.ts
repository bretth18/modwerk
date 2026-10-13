// SPDX-License-Identifier: GPL-3.0-or-later
// Private preparation only. No public site/MCP import or interface-claiming side effect.
import type { ControlDevice } from '../engine/elekloader/upload-usb.ts'
import { digestBytes, ZERO_DIGEST } from '../engine/elekloader/upload-wire.ts'
import { VOLATILE_CAPABILITY, VOLATILE_COMMAND_BYTES, VOLATILE_MAX_FRAME,
  VOLATILE_HOST_CHUNK, VOLATILE_HOST_MAX_BYTES, VOLATILE_STATUS_BYTES, parseVolatileStatus } from './volatile-batch-wire.ts'

interface Observation { base: string; session: string; capabilities: number }
/** The caller must already hold the vendor interface exclusively. This adapter
 * neither claims/releases it nor authorizes a transaction or source package. */
export class VolatileUsbTransport {
  private readonly device: ControlDevice
  private readonly index: number
  private readonly observed: Readonly<Observation>
  private readonly timeout: number
  private busy = false
  private broken = false
  constructor(device: ControlDevice, index: number, observed: Observation, timeoutMs = 8000) {
    if (!Number.isInteger(index) || index < 0 || index > 255 || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 9000)
      throw new Error('Private volatile USB requires a valid interface and bounded timeout.')
    if (!Number.isInteger(observed.capabilities) || observed.capabilities < 0 || observed.capabilities > 0xffffffff ||
      !(observed.capabilities & VOLATILE_CAPABILITY)) throw new Error('Private volatile USB service is unavailable.')
    for (const identity of [observed.base, observed.session]) {
      if (identity === ZERO_DIGEST) throw new Error('Private volatile USB requires exact nonzero identities.')
      digestBytes(identity)
    }
    this.device = device; this.index = index; this.observed = Object.freeze({ ...observed }); this.timeout = timeoutMs
  }
  get connectionTrusted() { return !this.broken }
  private setup(request: 34 | 35 | 36) {
    return { requestType: 'vendor', recipient: 'interface', request, value: 0, index: this.index } as const
  }
  private frame(input: Uint8Array) {
    // Bound before copying; only fixed MWVB commands, never arbitrary USB packets.
    if (input.byteLength < VOLATILE_COMMAND_BYTES || input.byteLength > VOLATILE_MAX_FRAME || input.byteLength % 64 === 0)
      throw new Error('Invalid private volatile frame length.')
    const bytes = new Uint8Array(input), view = new DataView(bytes.buffer)
    if (view.getUint32(0) !== 0x4d575642 || bytes[4] !== 1 || bytes[5] < 1 || bytes[5] > 8 ||
      view.getUint16(6) || !view.getUint32(8) || view.getUint32(20) !== bytes.length - VOLATILE_COMMAND_BYTES ||
      bytes.subarray(88, 96).some(byte => byte)) throw new Error('Invalid private volatile command header.')
    for (const [offset, identity] of [[24, this.observed.base], [56, this.observed.session]] as const) {
      const expected = digestBytes(identity)
      if (expected.some((byte, i) => bytes[offset + i] !== byte)) throw new Error('Private volatile command identity changed.')
    }
    const body = bytes.length - VOLATILE_COMMAND_BYTES
    if (bytes[5] === 1) {
      if (view.getUint32(12) || view.getUint32(16) || body !== 72 ||
        !bytes.subarray(96, 128).some(byte => byte) || !bytes.subarray(128, 160).some(byte => byte) ||
        !view.getUint32(160) || view.getUint32(160) > VOLATILE_HOST_MAX_BYTES || view.getUint32(164))
        throw new Error('Invalid unowned private volatile Begin.')
    } else {
      if (!view.getUint32(12) || !view.getUint32(16)) throw new Error('Missing private volatile owned tokens.')
      if (bytes[5] === 2 ? body < 5 || body > 4 + VOLATILE_HOST_CHUNK ||
        view.getUint32(96) > VOLATILE_HOST_MAX_BYTES - (body - 4) : body !== 0)
        throw new Error('Invalid private volatile owned body.')
    }
    return bytes
  }
  /** A canceled native transfer may still finish on the device. Poisoning the
   * adapter prevents every later command; the independent board expiry must
   * resolve unknown work. A cached read cannot recover this adapter. */
  private async transfer<T>(signal: AbortSignal, operation: () => Promise<T>): Promise<T> {
    if (this.broken) throw new Error('Private volatile USB is unconfirmed; reconnect only through the qualified recovery flow.')
    signal.throwIfAborted()
    if (this.busy) throw new Error('Another complete private volatile USB transfer is in progress.')
    this.busy = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancel: (() => void) | undefined
    try {
      const stopped = new Promise<never>((_, reject) => {
        cancel = () => reject(new Error('Private volatile USB transfer canceled.'))
        signal.addEventListener('abort', cancel, { once: true })
        timer = setTimeout(() => reject(new Error('Private volatile USB transfer deadline expired.')), this.timeout)
      })
      return await Promise.race([operation(), stopped])
    } catch (error) {
      this.broken = true; throw error
    } finally {
      if (timer !== undefined) clearTimeout(timer)
      if (cancel) signal.removeEventListener('abort', cancel)
      this.busy = false
    }
  }
  async submit(input: Uint8Array, signal: AbortSignal): Promise<void> {
    const frame = this.frame(input)
    return this.transfer(signal, async () => {
      const reply = await this.device.controlTransferOut(this.setup(34), frame)
      signal.throwIfAborted()
      if (reply.status !== 'ok' || reply.bytesWritten !== frame.length) throw new Error('Private volatile OUT was not completely confirmed.')
    })
  }
  private read(request: 35 | 36, signal: AbortSignal): Promise<Uint8Array> {
    return this.transfer(signal, async () => {
      const reply = await this.device.controlTransferIn(this.setup(request), VOLATILE_STATUS_BYTES)
      signal.throwIfAborted()
      if (reply.status !== 'ok' || reply.data?.byteLength !== VOLATILE_STATUS_BYTES) throw new Error('Private volatile status was not completely confirmed.')
      const copy = new Uint8Array(reply.data.buffer, reply.data.byteOffset, reply.data.byteLength).slice()
      parseVolatileStatus(copy, this.observed) // Structural facts only; never transaction ownership.
      return copy
    })
  }
  result(signal: AbortSignal) { return this.read(35, signal) }
  state(signal: AbortSignal) { return this.read(36, signal) }
}
