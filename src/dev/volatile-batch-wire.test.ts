import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { encodeVolatileBundle, encodeVolatileRequest, parseVolatileStatus, splitVolatileChunks, VOLATILE_HOST_MAX_BYTES,
  type VolatileRecord, type VolatileRequest } from './volatile-batch-wire.ts'

const base = '1'.repeat(64), session = '2'.repeat(64), baseline = '3'.repeat(64), digest = '4'.repeat(64)
const bound = { base, session, transaction: 5, generation: 7, sequence: 9 }
const limits = { stageBytes: 100000, records: 20, participants: 20 }
const observed = { base, session, capabilities: 64 }
function status(phase = 0): Uint8Array {
  const bytes = new Uint8Array(212), view = new DataView(bytes.buffer)
  bytes.set([0x4d, 0x57, 0x56, 0x53, 1, 0, phase, phase ? 15 : 10])
  bytes.set(Buffer.from(base, 'hex'), 32); bytes.set(Buffer.from(session, 'hex'), 64)
  bytes.set(Buffer.from(baseline, 'hex'), 160)
  view.setUint32(196, 100000); view.setUint32(200, 786432); view.setUint16(204, 20); view.setUint16(206, 20)
  if (phase) {
    view.setUint32(8, 9); view.setUint32(12, 5); view.setUint32(16, 7); view.setUint32(24, 500)
    bytes.set(Buffer.from(baseline, 'hex'), 96); bytes.set(Buffer.from(digest, 'hex'), 128)
    if (phase !== 1) { view.setUint32(20, 500); view.setUint16(28, 2) }
    if (phase === 5 || phase === 6) { view.setUint16(30, 2); bytes[193] = 3 }
  }
  return bytes
}
function packageRecord(module: number, participants: number[], size = 32): VolatileRecord {
  const data = new Uint8Array(size), view = new DataView(data.buffer)
  view.setUint32(0, 0x4d57524d); view.setUint16(4, 4); view.setUint32(28, module)
  return { module, participants, data, sha256: createHash('sha256').update(data).digest('hex') }
}

describe('private volatile command framing', () => {
  it('pins Begin fields, zero board-issued ownership and all reserved bytes', () => {
    const data = encodeVolatileRequest({ command: 'begin', base, session, sequence: 9, baseline, digest, length: 7000 })
    const view = new DataView(data.buffer)
    expect(data.byteLength).toBe(168); expect(view.getUint32(0)).toBe(0x4d575642)
    expect([...data.slice(4, 8)]).toEqual([1, 1, 0, 0])
    expect([view.getUint32(8), view.getUint32(12), view.getUint32(16), view.getUint32(20)]).toEqual([9, 0, 0, 72])
    expect([...data.slice(88, 96)]).toEqual(Array(8).fill(0)); expect(view.getUint32(160)).toBe(7000)
    expect(view.getUint32(164)).toBe(0)
  })
  it.each(['verify', 'activate', 'startTrial', 'rollback', 'abort', 'touch'] as const)('encodes %s without payload or persistence mode', command => {
    const data = encodeVolatileRequest({ ...bound, command }), view = new DataView(data.buffer)
    expect(data.byteLength).toBe(96); expect(view.getUint32(12)).toBe(5); expect(view.getUint32(16)).toBe(7)
    expect(view.getUint32(20)).toBe(0)
  })
  it.each([0, -1, 0x100000000, 1.5, NaN])('refuses invalid sequence %s', sequence => {
    expect(() => encodeVolatileRequest({ ...bound, command: 'touch', sequence })).toThrow()
  })
  it('refuses missing bindings, unknown commands, excessive chunks and 64-byte-multiple frames', () => {
    for (const request of [
      { ...bound, command: 'touch', transaction: 0 }, { ...bound, command: 'touch', generation: 0 },
      { ...bound, command: 'keep' }, { ...bound, command: 'touch', session: '0'.repeat(64) },
      { ...bound, command: 'chunk', offset: 0, data: new Uint8Array(3996) },
      { ...bound, command: 'chunk', offset: 0, data: new Uint8Array(28) },
      { ...bound, command: 'chunk', offset: VOLATILE_HOST_MAX_BYTES, data: new Uint8Array(1) },
    ]) expect(() => encodeVolatileRequest(request as VolatileRequest)).toThrow()
  })
  it('splits the complete bytes without overlaps or unsafe Windows control frame lengths', () => {
    for (const size of [1, 28, 64, 3995, 3996, 8000, 8192]) {
      const bytes = Uint8Array.from({ length: size }, (_, i) => i % 251), chunks = splitVolatileChunks(bytes)
      const restored = new Uint8Array(size); let end = 0
      for (const chunk of chunks) {
        expect(chunk.offset).toBe(end); restored.set(chunk.data, chunk.offset); end += chunk.data.length
        const frame = encodeVolatileRequest({ ...bound, command: 'chunk', ...chunk })
        expect(frame.length).toBeLessThanOrEqual(4096); expect(frame.length % 64).not.toBe(0)
      }
      expect(restored).toEqual(bytes)
    }
  })
  it('copies Buffer-backed chunk bytes instead of sharing their parent allocation', () => {
    const backing = Buffer.alloc(100, 7), input = backing.subarray(17, 77), chunks = splitVolatileChunks(input)
    const expected = new Uint8Array(input); backing.fill(0)
    expect(chunks).toHaveLength(1); expect(chunks[0].data).toEqual(expected)
    expect(Buffer.isBuffer(chunks[0].data)).toBe(false); expect(chunks[0].data.byteOffset).toBe(0)
  })
})

describe('private volatile bundle framing', () => {
  it('sorts canonical participants, encodes grouped and scalar masks and hashes exact bytes', async () => {
    const group = packageRecord(0x100, [8, 2], 33), scalar = packageRecord(0x200, [20])
    const bundle = await encodeVolatileBundle(base, baseline, [group, scalar], limits), view = new DataView(bundle.data.buffer)
    expect(bundle.participants).toEqual([2, 8, 20]); expect(view.getUint32(0)).toBe(0x4d574254)
    expect([view.getUint16(4), view.getUint16(6), view.getUint16(8), view.getUint16(10), view.getUint16(12)]).toEqual([1, 1, 88, 2, 3])
    expect(view.getUint32(16)).toBe(bundle.data.length); expect(view.getUint16(14)).toBe(0); expect(view.getUint32(20)).toBe(0)
    expect([view.getUint32(88), view.getUint32(92), view.getUint32(96)]).toEqual([2, 8, 20])
    expect(view.getUint32(140)).toBe(3); expect(view.getUint32(224)).toBe(4)
    expect([...bundle.data.slice(181, 184)]).toEqual([0, 0, 0])
    expect(bundle.sha256).toBe(createHash('sha256').update(bundle.data).digest('hex'))
  })
  it('captures immutable package bytes and participant association before hashing', async () => {
    const record = packageRecord(1, [3]), expected = record.data.slice()
    const pending = encodeVolatileBundle(base, baseline, [record], limits)
    record.data.fill(0); (record.participants as number[])[0] = 20
    const bundle = await pending
    expect(bundle.participants).toEqual([3]); expect(bundle.data.slice(140)).toEqual(expected)
  })
  it('captures exact Buffer-backed package bytes at nonzero offsets before async hashing', async () => {
    const record = packageRecord(1, [3]), expected = new Uint8Array(record.data)
    const backing = Buffer.alloc(79, 0xee), input = backing.subarray(17, 49); input.set(record.data)
    const pending = encodeVolatileBundle(base, baseline, [{ ...record, data: input }], limits)
    backing.fill(0)
    const bundle = await pending
    expect(bundle.data.slice(140)).toEqual(expected)
    expect(bundle.sha256).toBe(createHash('sha256').update(bundle.data).digest('hex'))
  })
  it('refuses duplicate, overlapping, invalid unsigned and empty participant declarations', async () => {
    for (const offered of [[], [packageRecord(1, [1]), packageRecord(1, [2])],
      [packageRecord(1, [1]), packageRecord(2, [1])], [packageRecord(1, [1, 1])],
      [packageRecord(1, [])], [packageRecord(1, [0])], [packageRecord(1, [0x100000000])], [packageRecord(1, [1.5])],
    ]) await expect(encodeVolatileBundle(base, baseline, offered, limits)).rejects.toThrow()
  })
  it('refuses altered package identities/hashes and stage/count overruns', async () => {
    const mismatch = packageRecord(1, [1]); mismatch.module = 2
    const changed = packageRecord(1, [1]); changed.data[6] = 1
    for (const offered of [[mismatch], [changed]]) await expect(encodeVolatileBundle(base, baseline, offered, limits)).rejects.toThrow()
    await expect(encodeVolatileBundle(base, baseline, [packageRecord(1, [1])], { ...limits, stageBytes: 171 })).rejects.toThrow()
    await expect(encodeVolatileBundle(base, baseline, [packageRecord(1, [1, 2])], { ...limits, participants: 1 })).rejects.toThrow()
    await expect(encodeVolatileBundle(base, baseline, [packageRecord(1, [1]), packageRecord(2, [2])], { ...limits, records: 1 })).rejects.toThrow()
  })
  it('refuses oversized input before allocating a package copy', async () => {
    const record = packageRecord(1, [1], 1000)
    record.data.slice = () => { throw new Error('copied oversized package') }
    await expect(encodeVolatileBundle(base, baseline, [record], { ...limits, stageBytes: 999 })).rejects.toThrow('invalid unsigned integer')
    await expect(encodeVolatileBundle(base, baseline, [record], { ...limits, stageBytes: 1139 })).rejects.toThrow('stage bound')
  })
  it('carries real hashed module IDs without treating them as small participant ordinals', async () => {
    const runtimeId = (name: string) => createHash('sha256').update(name).digest().readUInt32BE(0)
    const everb = runtimeId('everb'), repitch = runtimeId('repitch')
    const bundle = await encodeVolatileBundle(base, baseline, [packageRecord(everb, [everb]), packageRecord(repitch, [repitch])], limits)
    const expected = [everb, repitch].sort((a, b) => a - b), view = new DataView(bundle.data.buffer)
    expect(bundle.participants).toEqual(expected); expect([view.getUint32(88), view.getUint32(92)]).toEqual(expected)
    expect(expected.every(id => id > 20)).toBe(true)
  })
  it('frames all twenty participants without mask truncation or a count-based fit claim', async () => {
    const records = Array.from({ length: 20 }, (_, i) => packageRecord(i + 1, [i + 1]))
    const bundle = await encodeVolatileBundle(base, baseline, records, limits), view = new DataView(bundle.data.buffer)
    expect(view.getUint16(10)).toBe(20); expect(view.getUint16(12)).toBe(20)
    expect(view.getUint32(88 + 80 + 19 * 80 + 40)).toBe(1 << 19)
    await expect(encodeVolatileBundle(base, baseline, records, { ...limits, stageBytes: bundle.data.length - 1 })).rejects.toThrow('stage bound')
  })
})

describe('private cached volatile status validation', () => {
  it('parses exactly the copied bytes of an offset Buffer without reading its parent slab', () => {
    const expected = status(5), backing = Buffer.alloc(expected.length + 57, 0xee)
    const input = backing.subarray(23, 23 + expected.length); input.set(expected)
    const parsed = parseVolatileStatus(input, observed); backing.fill(0)
    expect(parsed).toMatchObject({ phase: 'stoppedTrial', transaction: 5, generation: 7,
      current: baseline, baseline, records: 2, published: 2 })
  })
  it('parses every specified phase without conferring ownership', () => {
    for (let phase = 0; phase <= 8; ++phase) expect(parseVolatileStatus(status(phase), observed).phase).toBeTruthy()
    expect(parseVolatileStatus(status(), observed)).toMatchObject({ phase: 'idle', transaction: 0, baseline: null, current: baseline, offer: null })
  })
  it('permits confirmed rollback Idle to retain consumed tokens only with exact baseline restoration', () => {
    const bytes = status(), view = new DataView(bytes.buffer); bytes[7] = 11
    bytes.set(Buffer.from(baseline, 'hex'), 96); view.setUint32(8, 9); view.setUint32(12, 5); view.setUint32(16, 7)
    expect(parseVolatileStatus(bytes, observed)).toMatchObject({ transaction: 5, generation: 7, current: baseline, baseline })
    bytes[160] ^= 1; expect(() => parseVolatileStatus(bytes, observed)).toThrow('idle state')
  })
  it('accepts an unowned queued Begin without a baseline or new token', () => {
    const bytes = status(); bytes[5] = 1; new DataView(bytes.buffer).setUint32(8, 9)
    expect(parseVolatileStatus(bytes, observed)).toMatchObject({ result: 'queued', phase: 'idle', transaction: 0, generation: 0, baseline: null })
    bytes[5] = 0; expect(() => parseVolatileStatus(bytes, observed)).toThrow('idle state')
  })
  it('keeps cumulative touched cores distinct from current-operation acknowledgments', () => {
    const bytes = status(4); bytes[192] = 1; bytes[193] = 3; bytes[194] = 1
    expect(parseVolatileStatus(bytes, observed)).toMatchObject({ required: 1, touched: 3, confirmed: 1 })
    bytes[194] = 2; expect(() => parseVolatileStatus(bytes, observed)).toThrow('core acknowledgments')
  })
  it('keeps uncertain quarantined CF publication unknown instead of inventing a current digest', () => {
    const bytes = status(8); bytes[5] = 12; bytes[7] = 13; bytes.fill(0, 160, 192)
    expect(parseVolatileStatus(bytes, observed)).toMatchObject({ result: 'quarantined', current: null, latchHeld: true })
    bytes[160] = 1; expect(() => parseVolatileStatus(bytes, observed)).toThrow('unknown digest')
  })
  it('refuses missing capability, changed boot/base, reserved bytes, unknown enums and partial records', () => {
    expect(() => parseVolatileStatus(status(), { ...observed, capabilities: 7 })).toThrow('capability')
    for (const offset of [0, 4, 5, 6, 7, 32, 64, 195, 208]) {
      const bytes = status(); bytes[offset] = offset === 5 ? 14 : offset === 6 ? 9 : bytes[offset] ^ 128
      expect(() => parseVolatileStatus(bytes, observed), String(offset)).toThrow()
    }
    for (const length of [0, 211, 213]) expect(() => parseVolatileStatus(new Uint8Array(length), observed)).toThrow()
  })
  it('refuses missing latch/ownership, early touches, incomplete trial and oversized declarations', () => {
    const cases = [status(1), status(1), status(2), status(5), status(5), status(3)]
    cases[0][7] = 11; new DataView(cases[1].buffer).setUint32(12, 0); cases[2][193] = 1
    cases[3][194] = 1; new DataView(cases[4].buffer).setUint16(30, 1); new DataView(cases[5].buffer).setUint32(24, 100001)
    for (const bytes of cases) expect(() => parseVolatileStatus(bytes, observed)).toThrow()
  })
})
