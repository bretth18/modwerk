import { afterEach, describe, expect, it, vi } from 'vitest'
import { VolatileUsbTransport } from './volatile-usb-transport.ts'
import { encodeVolatileRequest } from './volatile-batch-wire.ts'
import type { ControlDevice } from '../engine/elekloader/upload-usb.ts'

const base = '1'.repeat(64), session = '2'.repeat(64), baseline = '3'.repeat(64), offer = '4'.repeat(64)
const observed = { base, session, capabilities: 64 }
const begin = () => encodeVolatileRequest({ command: 'begin', sequence: 1, base, session, baseline, digest: offer, length: 1000 })
const owned = (command: 'verify' | 'activate' | 'startTrial' | 'rollback' | 'abort' | 'touch') =>
  encodeVolatileRequest({ command, sequence: 2, base, session, transaction: 8, generation: 9 })
const signal = () => new AbortController().signal
function idle() {
  const bytes = new Uint8Array(212), view = new DataView(bytes.buffer)
  bytes.set([0x4d, 0x57, 0x56, 0x53, 1, 0, 0, 10])
  bytes.set(Buffer.from(base, 'hex'), 32); bytes.set(Buffer.from(session, 'hex'), 64)
  bytes.set(Buffer.from(baseline, 'hex'), 160)
  view.setUint32(196, 100000); view.setUint32(200, 786432); view.setUint16(204, 20); view.setUint16(206, 20)
  return bytes
}
function fixture(timeout = 8000) {
  const bytes = idle()
  const device = {
    controlTransferOut: vi.fn<ControlDevice['controlTransferOut']>(async (_setup, data) => ({ status: 'ok', bytesWritten: data.length })),
    controlTransferIn: vi.fn<ControlDevice['controlTransferIn']>(async () => ({ status: 'ok', data: new DataView(bytes.buffer) })),
  }
  const transport = new VolatileUsbTransport(device, 3, observed, timeout)
  return { device, transport, bytes }
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('private fixed volatile USB transport', () => {
  it('uses only fixed interface requests34/35/36 with exact complete lengths', async () => {
    const { device, transport } = fixture()
    await transport.submit(begin(), signal())
    for (const command of ['verify', 'activate', 'startTrial', 'rollback', 'abort', 'touch'] as const)
      await transport.submit(owned(command), signal())
    await transport.submit(encodeVolatileRequest({ command: 'chunk', sequence: 3, base, session,
      transaction: 8, generation: 9, offset: 0, data: new Uint8Array(3995) }), signal())
    expect(await transport.result(signal())).toEqual(idle())
    expect(await transport.state(signal())).toEqual(idle())
    expect(device.controlTransferOut.mock.calls.map(([setup]) => setup)).toEqual(Array.from({ length: 8 }, () =>
      ({ requestType: 'vendor', recipient: 'interface', request: 34, value: 0, index: 3 })))
    expect(device.controlTransferIn.mock.calls).toEqual([
      [{ requestType: 'vendor', recipient: 'interface', request: 35, value: 0, index: 3 }, 212],
      [{ requestType: 'vendor', recipient: 'interface', request: 36, value: 0, index: 3 }, 212],
    ])
  })
  it('requires capability64 and exact nonzero identity before any USB operation', () => {
    const { device } = fixture()
    for (const value of [{ ...observed, capabilities: 7 }, { ...observed, capabilities: -1 },
      { ...observed, capabilities: 64.1 }, { ...observed, base: '0'.repeat(64) },
      { ...observed, session: '0'.repeat(64) }, { ...observed, base: 'invalid' }])
      expect(() => new VolatileUsbTransport(device, 3, value)).toThrow()
    for (const index of [-1, 256, 1.5]) expect(() => new VolatileUsbTransport(device, index, observed)).toThrow()
    for (const timeout of [0, 9001, 1.5]) expect(() => new VolatileUsbTransport(device, 3, observed, timeout)).toThrow()
    expect(device.controlTransferIn).not.toHaveBeenCalled(); expect(device.controlTransferOut).not.toHaveBeenCalled()
  })
  it('copies offered frames and returned offset views without retaining mutable caller bytes', async () => {
    const { device, transport, bytes } = fixture(), offered = begin(), expected = offered.slice()
    let release!: () => void
    device.controlTransferOut.mockImplementation(async (_setup, data) => {
      await new Promise<void>(resolve => { release = resolve })
      expect(data).toEqual(expected); return { status: 'ok', bytesWritten: data.length }
    })
    const sent = transport.submit(offered, signal()); offered.fill(0); release(); await sent
    const backing = new Uint8Array(500); backing.set(bytes, 32)
    device.controlTransferIn.mockResolvedValue({ status: 'ok', data: new DataView(backing.buffer, 32, 212) })
    const read = await transport.state(signal()); backing.fill(0); expect(read).toEqual(idle())
  })
  it('refuses overlapping EP0 operations before a second submission', async () => {
    const { device, transport, bytes } = fixture()
    let release!: (value: { status: string; data: DataView }) => void
    device.controlTransferIn.mockImplementation(() => new Promise(resolve => { release = resolve }))
    const reading = transport.state(signal())
    await expect(transport.submit(begin(), signal())).rejects.toThrow('in progress')
    expect(device.controlTransferOut).not.toHaveBeenCalled()
    release({ status: 'ok', data: new DataView(bytes.buffer) }); await reading
    expect(transport.connectionTrusted).toBe(true)
  })
  it('copies a Buffer-backed frame at a nonzero offset before native USB can observe mutation', async () => {
    const { device, transport } = fixture(), expected = begin()
    const backing = Buffer.alloc(expected.length + 47, 0xee), offered = backing.subarray(23, 23 + expected.length)
    offered.set(expected)
    let release!: () => void
    device.controlTransferOut.mockImplementation(async (_setup, data) => {
      await new Promise<void>(resolve => { release = resolve })
      expect(data).toEqual(expected); expect(Buffer.isBuffer(data)).toBe(false)
      expect(data.byteOffset).toBe(0); return { status: 'ok', bytesWritten: data.length }
    })
    const sent = transport.submit(offered, signal()); backing.fill(0); release(); await sent
    expect(device.controlTransferOut).toHaveBeenCalledTimes(1)
  })
  it('sends nothing for an already canceled operation', async () => {
    const { device, transport } = fixture(), controller = new AbortController(); controller.abort()
    await expect(transport.submit(begin(), controller.signal)).rejects.toThrow()
    await expect(transport.state(controller.signal)).rejects.toThrow()
    expect(device.controlTransferOut).not.toHaveBeenCalled(); expect(device.controlTransferIn).not.toHaveBeenCalled()
  })
  it.each(['stall', 'short', 'overreported', 'lost'] as const)('poisons %s OUT without result adoption or replay', async mode => {
    const { device, transport } = fixture()
    device.controlTransferOut.mockImplementation(async (_setup, data) => {
      if (mode === 'lost') throw new Error('Synthetic lost native OUT')
      return { status: mode === 'stall' ? 'stall' : 'ok', bytesWritten: data.length + (mode === 'short' ? -1 : mode === 'overreported' ? 1 : 0) }
    })
    await expect(transport.submit(begin(), signal())).rejects.toThrow()
    expect(transport.connectionTrusted).toBe(false)
    await expect(transport.result(signal())).rejects.toThrow('unconfirmed')
    await expect(transport.submit(begin(), signal())).rejects.toThrow('unconfirmed')
    expect(device.controlTransferOut).toHaveBeenCalledTimes(1); expect(device.controlTransferIn).not.toHaveBeenCalled()
  })
  it.each(['stall', 'short', 'long', 'lost', 'malformed', 'base', 'session'] as const)('poisons %s cached status and blocks all subsequent packets', async mode => {
    const { device, transport, bytes } = fixture()
    if (mode === 'malformed') bytes[4] = 2
    if (mode === 'base') bytes[32] ^= 1
    if (mode === 'session') bytes[64] ^= 1
    device.controlTransferIn.mockImplementation(async () => {
      if (mode === 'lost') throw new Error('Synthetic lost native IN')
      return { status: mode === 'stall' ? 'stall' : 'ok', data: mode === 'short' ? new DataView(new ArrayBuffer(211)) :
        mode === 'long' ? new DataView(new ArrayBuffer(213)) : new DataView(bytes.buffer) }
    })
    await expect(transport.state(signal())).rejects.toThrow()
    await expect(transport.result(signal())).rejects.toThrow('unconfirmed')
    await expect(transport.submit(begin(), signal())).rejects.toThrow('unconfirmed')
    expect(device.controlTransferIn).toHaveBeenCalledTimes(1); expect(device.controlTransferOut).not.toHaveBeenCalled()
  })
  it('an in-flight cancellation returns promptly and a late positive OUT cannot revive or retry', async () => {
    const { device, transport } = fixture(), controller = new AbortController()
    let release!: (value: { status: string; bytesWritten: number }) => void
    device.controlTransferOut.mockImplementation(() => new Promise(resolve => { release = resolve }))
    const sent = transport.submit(begin(), controller.signal), failed = expect(sent).rejects.toThrow('canceled')
    controller.abort(); await failed
    release({ status: 'ok', bytesWritten: begin().length }); await Promise.resolve()
    expect(transport.connectionTrusted).toBe(false)
    await expect(transport.result(signal())).rejects.toThrow('unconfirmed')
    expect(device.controlTransferOut).toHaveBeenCalledTimes(1); expect(device.controlTransferIn).not.toHaveBeenCalled()
  })
  it('an independent deadline poisons an unresolved read and ignores its later status', async () => {
    vi.useFakeTimers()
    const { device, transport, bytes } = fixture(20)
    let release!: (value: { status: string; data: DataView }) => void
    device.controlTransferIn.mockImplementation(() => new Promise(resolve => { release = resolve }))
    const reading = transport.state(signal()), failed = expect(reading).rejects.toThrow('deadline')
    await vi.advanceTimersByTimeAsync(20); await failed
    release({ status: 'ok', data: new DataView(bytes.buffer) }); await Promise.resolve()
    expect(transport.connectionTrusted).toBe(false)
    await expect(transport.submit(begin(), signal())).rejects.toThrow('unconfirmed')
    expect(device.controlTransferIn).toHaveBeenCalledTimes(1); expect(device.controlTransferOut).not.toHaveBeenCalled()
  })
  it('refuses malformed, unbound or arbitrary command frames locally', async () => {
    const { device, transport } = fixture()
    const changes = [(v: DataView) => v.setUint32(0, 0), (v: DataView) => v.setUint8(4, 2),
      (v: DataView) => v.setUint8(5, 9), (v: DataView) => v.setUint16(6, 1), (v: DataView) => v.setUint32(8, 0),
      (v: DataView) => v.setUint32(12, 1), (v: DataView) => v.setUint32(16, 1), (v: DataView) => v.setUint32(20, 1),
      (v: DataView) => v.setUint8(24, 0), (v: DataView) => v.setUint8(56, 0), (v: DataView) => v.setUint8(88, 1),
      (v: DataView) => v.setUint32(160, 0), (v: DataView) => v.setUint32(160, 2097153), (v: DataView) => v.setUint32(164, 1)]
    for (const change of changes) {
      const frame = begin(); change(new DataView(frame.buffer)); await expect(transport.submit(frame, signal())).rejects.toThrow()
    }
    for (const frame of [new Uint8Array(1), new Uint8Array(128), new Uint8Array(4097), owned('verify').slice(0, 95)])
      await expect(transport.submit(frame, signal())).rejects.toThrow()
    for (const offset of [96, 128]) {
      const frame = begin(); frame.fill(0, offset, offset + 32); await expect(transport.submit(frame, signal())).rejects.toThrow()
    }
    const noToken = owned('verify'); new DataView(noToken.buffer).setUint32(12, 0)
    await expect(transport.submit(noToken, signal())).rejects.toThrow()
    const overflow = encodeVolatileRequest({ command: 'chunk', sequence: 3, base, session,
      transaction: 8, generation: 9, offset: 0, data: new Uint8Array(3) })
    new DataView(overflow.buffer).setUint32(96, 2097152)
    await expect(transport.submit(overflow, signal())).rejects.toThrow()
    expect(device.controlTransferOut).not.toHaveBeenCalled(); expect(device.controlTransferIn).not.toHaveBeenCalled()
    expect(transport.connectionTrusted).toBe(true)
  })
})
