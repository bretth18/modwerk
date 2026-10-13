// SPDX-License-Identifier: GPL-3.0-or-later
// Private framing preparation only: no USB calls, public imports or persistence commands.
// The board must independently verify package/source associations and all lifetime/resource gates.
import { digestBytes, ZERO_DIGEST } from '../engine/elekloader/upload-wire.ts'

export const VOLATILE_CAPABILITY = 64
export const VOLATILE_COMMAND_BYTES = 96
export const VOLATILE_STATUS_BYTES = 212
export const VOLATILE_MAX_FRAME = 4096
export const VOLATILE_HOST_CHUNK = 3995 // Avoid a full 64-byte multiple on the Windows control data stage.
export const VOLATILE_HOST_MAX_BYTES = 2097152 // Host allocation bound; never proof of board stage/pool fit.
export const VolatileCommand = Object.freeze({ begin: 1, chunk: 2, verify: 3, activate: 4,
  startTrial: 5, rollback: 6, abort: 7, touch: 8 } as const)
export type VolatileCommandName = keyof typeof VolatileCommand
export interface VolatileBinding { base: string; session: string; transaction: number; generation: number }
type OwnedRequest = VolatileBinding & { sequence: number }
export type VolatileRequest =
  | { command: 'begin'; sequence: number; base: string; session: string; baseline: string; digest: string; length: number }
  | (OwnedRequest & { command: 'chunk'; offset: number; data: Uint8Array })
  | (OwnedRequest & { command: Exclude<VolatileCommandName, 'begin' | 'chunk'> })
export interface VolatileLimits { stageBytes: number; records: number; participants: number }
export interface VolatileRecord { module: number; participants: readonly number[]; data: Uint8Array; sha256: string }
export const VolatilePhase = ['idle', 'receiving', 'verified', 'initializing', 'publishing',
  'stoppedTrial', 'runningTrial', 'rollingBack', 'quarantined'] as const
export const VolatileResult = ['ok', 'queued', 'busy', 'state', 'identity', 'stale', 'limit', 'length',
  'conflict', 'hash', 'refused', 'pending', 'quarantined', 'unsupported'] as const
export interface VolatileStatus extends VolatileBinding {
  sequence: number; result: typeof VolatileResult[number]; phase: typeof VolatilePhase[number]
  baseline: string | null; current: string | null; offer: string | null; latchHeld: boolean
  received: number; total: number; records: number; published: number
  required: number; touched: number; confirmed: number; limits: VolatileLimits; poolBytes: number
}

function fail(message: string): never { throw new Error('Private volatile framing: ' + message) }
function uint(value: number, max = 0xffffffff, nonzero = false): number {
  if (!Number.isInteger(value) || value < (nonzero ? 1 : 0) || value > max) fail('invalid unsigned integer')
  return value
}
function digest(value: string): Uint8Array {
  if (value === ZERO_DIGEST) fail('missing exact identity')
  return digestBytes(value)
}
function hex(bytes: Uint8Array): string { return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('') }
function limits(value: VolatileLimits): VolatileLimits {
  return { stageBytes: uint(value.stageBytes, VOLATILE_HOST_MAX_BYTES, true),
    records: uint(value.records, 20, true), participants: uint(value.participants, 20, true) }
}

/** Sequence assignment and ownership must come from a later qualified transaction client. */
export function encodeVolatileRequest(request: VolatileRequest): Uint8Array {
  if (!Object.hasOwn(VolatileCommand, request.command)) fail('unknown command')
  uint(request.sequence, 0xffffffff, true)
  let body = new Uint8Array(0)
  if (request.command === 'begin') {
    uint(request.length, VOLATILE_HOST_MAX_BYTES, true)
    body = new Uint8Array(72)
    body.set(digest(request.baseline)); body.set(digest(request.digest), 32)
    new DataView(body.buffer).setUint32(64, request.length)
  } else {
    uint(request.transaction, 0xffffffff, true); uint(request.generation, 0xffffffff, true)
    if (request.command === 'chunk') {
      const count = uint(request.data.byteLength, VOLATILE_HOST_CHUNK, true)
      uint(request.offset, VOLATILE_HOST_MAX_BYTES - count)
      body = new Uint8Array(4 + count)
      new DataView(body.buffer).setUint32(0, request.offset); body.set(request.data, 4)
    }
  }
  const frame = new Uint8Array(VOLATILE_COMMAND_BYTES + body.byteLength), view = new DataView(frame.buffer)
  if (frame.byteLength > VOLATILE_MAX_FRAME || frame.byteLength % 64 === 0) fail('unsafe control-transfer length')
  frame.set([0x4d, 0x57, 0x56, 0x42]); view.setUint8(4, 1); view.setUint8(5, VolatileCommand[request.command])
  view.setUint32(8, request.sequence)
  view.setUint32(12, request.command === 'begin' ? 0 : request.transaction)
  view.setUint32(16, request.command === 'begin' ? 0 : request.generation)
  view.setUint32(20, body.byteLength); frame.set(digest(request.base), 24); frame.set(digest(request.session), 56)
  frame.set(body, VOLATILE_COMMAND_BYTES)
  return frame
}

/** Complete nonoverlapping chunks. This never retries a command or issues a device sequence. */
export function splitVolatileChunks(bytes: Uint8Array): readonly { offset: number; data: Uint8Array }[] {
  uint(bytes.byteLength, VOLATILE_HOST_MAX_BYTES, true)
  const chunks: { offset: number; data: Uint8Array }[] = []
  for (let offset = 0; offset < bytes.byteLength;) {
    let count = Math.min(VOLATILE_HOST_CHUNK, bytes.byteLength - offset)
    if ((VOLATILE_COMMAND_BYTES + 4 + count) % 64 === 0) --count
    if (!count) fail('empty chunk')
    chunks.push({ offset, data: new Uint8Array(bytes.subarray(offset, offset + count)) }); offset += count
  }
  return chunks
}

/** Cached facts only. A parsed result never grants a lease, adopts Begin or confirms publication. */
export function parseVolatileStatus(input: Uint8Array, observed: { base: string; session: string; capabilities: number }): Readonly<VolatileStatus> {
  digest(observed.base); digest(observed.session); uint(observed.capabilities)
  if (!(observed.capabilities & VOLATILE_CAPABILITY)) fail('service capability is unavailable')
  if (input.byteLength !== VOLATILE_STATUS_BYTES) fail('incomplete status')
  const bytes = new Uint8Array(input), view = new DataView(bytes.buffer)
  if (view.getUint32(0) !== 0x4d575653 || view.getUint8(4) !== 1 || view.getUint8(7) & ~15 ||
    view.getUint8(195) || view.getUint32(208)) fail('unsupported status header')
  const result = VolatileResult[view.getUint8(5)], phase = VolatilePhase[view.getUint8(6)], flags = view.getUint8(7)
  if (!result || !phase || !(flags & 8) || result === 'unsupported') fail('service status is unavailable')
  const base = hex(bytes.subarray(32, 64)), session = hex(bytes.subarray(64, 96))
  if (base !== observed.base || session !== observed.session) fail('base or boot session changed')
  const sequence = view.getUint32(8), transaction = view.getUint32(12), generation = view.getUint32(16)
  const received = view.getUint32(20), total = view.getUint32(24), records = view.getUint16(28), published = view.getUint16(30)
  const baselineHash = hex(bytes.subarray(96, 128)), offerHash = hex(bytes.subarray(128, 160)), currentHash = hex(bytes.subarray(160, 192))
  const baselineKnown = !!(flags & 1), currentKnown = !!(flags & 2), latchHeld = !!(flags & 4)
  if (baselineKnown !== (baselineHash !== ZERO_DIGEST) || currentKnown !== (currentHash !== ZERO_DIGEST)) fail('unknown digest is not zero')
  const available = limits({ stageBytes: view.getUint32(196), records: view.getUint16(204), participants: view.getUint16(206) })
  const poolBytes = uint(view.getUint32(200), 0xffffffff, true)
  const required = view.getUint8(192), touched = view.getUint8(193), confirmed = view.getUint8(194)
  if (required > 3 || touched > 3 || confirmed > 3 || confirmed & ~required || confirmed & ~touched ||
    received > total || total > available.stageBytes || records > available.records || published > records) fail('inconsistent counters or core acknowledgments')
  if (phase === 'idle') {
    if (latchHeld || received || total || records || published || offerHash !== ZERO_DIGEST || required || touched || confirmed || !currentKnown ||
      (baselineKnown ? !transaction || !generation || !sequence || baselineHash !== currentHash : transaction || generation || (sequence && result !== 'queued')))
      fail('inconsistent idle state')
  } else {
    if (!transaction || !generation || !sequence || !baselineKnown || !latchHeld || !total || offerHash === ZERO_DIGEST) fail('unbound active journal')
    if (phase === 'receiving' && (records || published || required || touched || confirmed || !currentKnown)) fail('inconsistent receiving state')
    if (!['receiving', 'rollingBack', 'quarantined'].includes(phase) && (received !== total || !records)) fail('unverified published offer')
    if (phase === 'verified' && (published || required || touched || confirmed || !currentKnown)) fail('inconsistent verified state')
    if (['stoppedTrial', 'runningTrial'].includes(phase) && (!currentKnown || published !== records || required || confirmed)) fail('incomplete trial publication')
  }
  return Object.freeze({ base, session, sequence, transaction, generation, result, phase, received, total, records, published,
    baseline: baselineKnown ? baselineHash : null, current: currentKnown ? currentHash : null,
    offer: total ? offerHash : null, latchHeld, required, touched, confirmed, limits: Object.freeze(available), poolBytes })
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer))
  return hex(hash)
}

/** Outer bundle framing, not package reconstruction, source trust, admission or publication. */
export async function encodeVolatileBundle(base: string, baseline: string, offered: readonly VolatileRecord[],
  available: VolatileLimits): Promise<{ data: Uint8Array; sha256: string; participants: readonly number[] }> {
  const bounded = limits(available), baseBytes = digest(base), baselineBytes = digest(baseline)
  uint(offered.length, bounded.records, true)
  // Refuse oversized inputs before copying any package, not after allocation.
  let boundedTotal = 88
  const boundedParticipants = new Set<number>()
  for (const record of offered) {
    const count = uint(record.data.byteLength, bounded.stageBytes, true)
    uint(record.participants.length, bounded.participants, true)
    for (const participant of record.participants) {
      uint(participant, 0xffffffff, true)
      if (boundedParticipants.has(participant)) fail('overlapping participant association')
      boundedParticipants.add(participant)
    }
    uint(boundedParticipants.size, bounded.participants, true)
    boundedTotal += 48 + count + ((4 - count % 4) % 4)
    if (boundedTotal + 4 * boundedParticipants.size > bounded.stageBytes) fail('bundle exceeds stage bound')
  }
  // Capture immutable copies before async hashes; callers cannot race later package mutation.
  const records = offered.map(record => ({ ...record, data: new Uint8Array(record.data), participants: [...record.participants] }))
  const modules = new Set<number>(), digests = new Set<string>(), participantSet = new Set<number>()
  let total = 88
  for (const record of records) {
    uint(record.module, 0xffffffff, true)
    if (modules.has(record.module) || digests.has(record.sha256)) fail('duplicate encoded module or package')
    modules.add(record.module); digests.add(record.sha256); digest(record.sha256)
    uint(record.data.byteLength, bounded.stageBytes, true)
    const view = new DataView(record.data.buffer)
    // Full ABI reconstruction remains the board's independent job, including reviewed removal packages.
    if (view.byteLength < 32 || view.getUint32(0) !== 0x4d57524d ||
      view.getUint16(4) < 4 || view.getUint16(4) > 8 || view.getUint32(28) !== record.module) fail('package identity/header mismatch')
    if (!record.participants.length) fail('empty participant association')
    for (const participant of record.participants) {
      uint(participant, 0xffffffff, true) // Canonical module ID, not an ordinal; board associations establish trust.
      if (participantSet.has(participant)) fail('overlapping participant association')
      participantSet.add(participant)
    }
    total += 48 + record.data.byteLength + ((4 - record.data.byteLength % 4) % 4)
    if (total > bounded.stageBytes) fail('bundle exceeds stage bound')
  }
  const participants = [...participantSet].sort((a, b) => a - b)
  uint(participants.length, bounded.participants, true)
  total += 4 * participants.length
  if (total > bounded.stageBytes) fail('bundle exceeds stage bound')
  for (const record of records) if (await sha256(record.data) !== record.sha256) fail('encoded package hash mismatch')
  const data = new Uint8Array(total), view = new DataView(data.buffer)
  data.set([0x4d, 0x57, 0x42, 0x54]); view.setUint16(4, 1); view.setUint16(6, 1)
  view.setUint16(8, 88); view.setUint16(10, records.length); view.setUint16(12, participants.length)
  view.setUint32(16, total); data.set(baseBytes, 24); data.set(baselineBytes, 56)
  let at = 88
  for (const participant of participants) { view.setUint32(at, participant); at += 4 }
  for (const record of records) {
    view.setUint32(at, record.module); view.setUint32(at + 4, record.data.byteLength); data.set(digestBytes(record.sha256), at + 8)
    let mask = 0
    for (const participant of record.participants) mask |= 1 << participants.indexOf(participant)
    view.setUint32(at + 40, mask); at += 48; data.set(record.data, at)
    at += record.data.byteLength + ((4 - record.data.byteLength % 4) % 4)
  }
  if (at !== total) fail('bundle length mismatch')
  return { data, sha256: await sha256(data), participants: Object.freeze(participants) }
}
