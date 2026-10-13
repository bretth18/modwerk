import { describe, expect, it } from 'vitest'
import { LOAD_BYTES, parseLoadReading } from './upload-wire'
import { UsbVendorTransport, type ControlDevice } from './upload-usb'

function wire() {
  const view = new DataView(new ArrayBuffer(LOAD_BYTES))
  view.setUint32(0, 0x4d574c44); view.setUint8(4, 1); view.setUint8(5, 7); view.setUint16(6, LOAD_BYTES)
  for (const [offset, value] of [[8, 1000], [12, 1200], [16, 998], [20, 950], [24, 999], [28, 123], [32, 234], [36, 345], [40, 456], [44, 567]]) view.setUint32(offset, value)
  return view
}
describe('read-only hardware load wire', () => {
  it('maps the actual core order to tracks, keeps device peaks separate and handles tick wrap', () => {
    const view = wire()
    expect(parseLoadReading(view)).toEqual({ ticks: 1000, frames: 1200, cpu: 123, tracks5to8: 234, peak5to8: 345, tracks1to4: 456, peak1to4: 567 })
    view.setUint32(8, 10); for (const offset of [16, 20, 24]) view.setUint32(offset, 0xfffffff0)
    expect(parseLoadReading(view).cpu).toBe(123)
  })
  it('uses gaps for uninitialized and stale windows, preserving an actual measured zero', () => {
    const view = wire(); view.setUint8(5, 1); view.setUint32(28, 0)
    expect(parseLoadReading(view)).toMatchObject({ cpu: 0, tracks5to8: null, tracks1to4: null })
    view.setUint32(16, 399); expect(parseLoadReading(view).cpu).toBeNull()
    view.setUint32(16, 1001); expect(parseLoadReading(view).cpu).toBeNull()
  })
  it('refuses truncation, wrong framing, unknown flags and impossible readings', () => {
    for (let n = 0; n < LOAD_BYTES; n++) expect(() => parseLoadReading(new DataView(wire().buffer, 0, n))).toThrow()
    for (const [offset, value] of [[0, 0], [4, 2], [5, 8], [7, 49]]) {
      const view = wire(); view.setUint8(offset, value); expect(() => parseLoadReading(view)).toThrow()
    }
    const view = wire(); view.setUint32(40, 1001); expect(() => parseLoadReading(view)).toThrow('range')
  })
  it('sends only one readonly request and distinguishes an old base from broken transport', async () => {
    let reply: Awaited<ReturnType<ControlDevice['controlTransferIn']>> = { status: 'stall' }
    const transport = new UsbVendorTransport({ async controlTransferOut() { throw new Error('Load must never write') }, async controlTransferIn(setup, length) {
      expect(setup).toEqual({ requestType: 'vendor', recipient: 'interface', request: 30, value: 0, index: 1 }); expect(length).toBe(48); return reply
    } }, 1)
    expect(await transport.load()).toBeUndefined()
    reply = { status: 'ok', data: wire() }; expect((await transport.load())?.cpu).toBe(123)
    reply = { status: 'ok' }; await expect(transport.load()).rejects.toThrow('answer')
  })
})
