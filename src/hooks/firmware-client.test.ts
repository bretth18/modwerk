import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLazyFirmwareClient, createObservedDigiFirmwareClient } from './firmware-client'
import { subscribeSiteDiagnosticEvents } from '../community/site-diagnostic-events'
import type { FirmwareClient } from '../engine/client'
import type { EngineRequest, EngineResponse } from '../engine/protocol'
import { USB_AUDIO_MODULE, usbAudioPreset } from '../config/usb-audio'
class FakeWorker {
  static created: FakeWorker[] = []
  posted: EngineRequest[] = []
  terminated = false
  onmessage: ((event: { data: EngineResponse }) => void) | null = null
  onerror: (() => void) | null = null
  constructor() { FakeWorker.created.push(this) }
  postMessage(request: EngineRequest) { this.posted.push(request) }
  terminate() { this.terminated = true }
  reply(response: EngineResponse) { this.onmessage?.({ data: response }) }
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
beforeEach(() => { FakeWorker.created = []; vi.stubGlobal('Worker', FakeWorker) })
afterEach(() => { vi.unstubAllGlobals() })
describe('lazy firmware client', () => {
  it('starts the worker on the first request, not when the page loads', async () => {
    const client = createLazyFirmwareClient()
    expect(FakeWorker.created).toHaveLength(0)
    const validation = client.validate(['miniverb'], false)
    await flush()
    expect(FakeWorker.created).toHaveLength(1)
    const [worker] = FakeWorker.created
    expect(worker.posted).toEqual([{ id: 1, type: 'validate', moduleIds: ['miniverb'], keepStockFx2: false }])
    worker.reply({ id: 1, type: 'validated', report: { ok: true } } as unknown as EngineResponse)
    expect(await validation).toEqual({ ok: true })
    client.validate(['miniverb'], true).catch(() => {})
    await flush()
    expect(FakeWorker.created).toHaveLength(1)
    client.dispose()
    expect(worker.terminated).toBe(true)
  })
  it('forwards saved USB settings through validation and build to the worker', async () => {
    const client = createLazyFirmwareClient()
    const usbAudio = { ...usbAudioPreset('outbox'), layout: 'main-cue' as const, outboxPairs: [1, 2, 0, 0] }
    const moduleIds = [USB_AUDIO_MODULE]
    const validation = client.validate(moduleIds, false, usbAudio)
    await flush()
    const [worker] = FakeWorker.created
    expect(worker.posted[0]).toEqual({ id: 1, type: 'validate', moduleIds, keepStockFx2: false, usbAudio })
    worker.reply({ id: 1, type: 'validated', report: {} } as unknown as EngineResponse)
    await validation
    const progress = vi.fn()
    const build = client.build(moduleIds, false, progress, usbAudio)
    await flush()
    expect(FakeWorker.created).toHaveLength(1)
    expect(worker.posted[1]).toEqual({ id: 2, type: 'build', moduleIds, keepStockFx2: false, usbAudio })
    worker.reply({ id: 2, type: 'progress', phase: 'packing' })
    expect(progress).toHaveBeenCalledWith('packing')
    const result = { id: 2, type: 'built', report: {}, buffer: new ArrayBuffer(0), sha256: 'test' } as unknown as EngineResponse
    worker.reply(result)
    expect(await build).toBe(result)
    client.dispose()
  })
  it('ignores cancel and clear before any request, and refuses requests after dispose', async () => {
    const client = createLazyFirmwareClient()
    client.cancelBuild()
    await client.clear()
    expect(FakeWorker.created).toHaveLength(0)
    const build = client.build(['miniverb'], false, () => {})
    await flush()
    expect(FakeWorker.created).toHaveLength(1)
    client.cancelBuild()
    await expect(build).rejects.toThrow('The firmware build was cancelled.')
    expect(FakeWorker.created[0].terminated).toBe(true)
    client.dispose()
    for (const worker of FakeWorker.created) expect(worker.terminated).toBe(true)
    expect(() => client.validate([], false)).toThrow('closed')
    expect(() => client.inspect(new File([], 'x.bin'))).toThrow('closed')
  })
})

describe('safe firmware failure observations', () => {
  it('reports inspect, selection, base and the last fixed build phase without private error details', async () => {
    const receive = vi.fn(), stop = subscribeSiteDiagnosticEvents(receive)
    const original = new Error('PRIVATE filename.bin https://private.test'), buffer = new ArrayBuffer(3)
    const underlying = {
      inspect: vi.fn(() => Promise.reject(original)), validate: vi.fn(() => Promise.reject(original)),
      buildBase: vi.fn(() => Promise.reject(original)), build: vi.fn((_ids, _stock, progress) => { progress('packing'); return Promise.reject(original) }),
      clear: vi.fn(async () => {}), dispose: vi.fn(), cancelBuild: vi.fn(),
    } as unknown as FirmwareClient
    const client = createLazyFirmwareClient(() => underlying), progress = vi.fn()
    try {
      await expect(client.inspect(new File([buffer], 'PRIVATE.bin'))).rejects.toBe(original)
      await expect(client.validate(['PRIVATE'], false)).rejects.toBe(original)
      await expect(client.buildBase()).rejects.toBe(original)
      await expect(client.build(['PRIVATE'], false, progress)).rejects.toBe(original)
      expect(progress).toHaveBeenCalledWith('packing')
      expect(receive.mock.calls.map(([event]) => event)).toEqual([
        {event:'build_failed',phase:'preparing',buildKind:'octatrack-firmware',error:'input'},
        {event:'build_failed',phase:'preparing',buildKind:'octatrack-firmware',error:'selection'},
        {event:'build_failed',phase:'building',buildKind:'octatrack-base',error:'build'},
        {event:'build_failed',phase:'packing',buildKind:'octatrack-firmware',error:'build'},
      ])
      expect(JSON.stringify(receive.mock.calls)).not.toContain('PRIVATE')
    } finally { client.dispose(); stop() }
  })
  it('keeps expected cancel, clear and dispose rejections out of diagnostics', async () => {
    const receive = vi.fn(), stop = subscribeSiteDiagnosticEvents(receive)
    try {
      for (const action of ['cancelBuild', 'clear', 'dispose'] as const) {
        const client = createLazyFirmwareClient()
        const build = client.build(['miniverb'], false, () => {})
        const result = expect(build).rejects.toThrow()
        await flush(); await client[action](); await result
        client.dispose()
      }
      expect(receive).not.toHaveBeenCalled()
    } finally { stop() }
  })
})


describe('safe Digi reader observations', () => {
  it('keeps the existing eager reader, exact inputs and rejection while recording only a fixed category', async () => {
    const original = new Error('PRIVATE.syx'), inspect = vi.fn(() => Promise.reject(original)), dispose = vi.fn(), create = vi.fn(() => ({ inspect, dispose }))
    const receive = vi.fn(), stop = subscribeSiteDiagnosticEvents(receive), file = new File(['PRIVATE'], 'PRIVATE.syx')
    const client = createObservedDigiFirmwareClient(create)
    try {
      expect(create).toHaveBeenCalledTimes(1)
      await expect(client.inspect('digitakt', file)).rejects.toBe(original)
      expect(inspect).toHaveBeenCalledWith('digitakt', file)
      expect(receive).toHaveBeenCalledWith({ event: 'build_failed', phase: 'preparing', buildKind: 'elekloader', error: 'input' })
    } finally { client.dispose(); stop() }
    expect(dispose).toHaveBeenCalledTimes(1)
  })
  it('does not report a pending reader disposed by a page change', async () => {
    let reject!: (error: Error) => void
    const original = new Error('PRIVATE reader disposed'), receive = vi.fn(), stop = subscribeSiteDiagnosticEvents(receive)
    const client = createObservedDigiFirmwareClient(() => ({ inspect: () => new Promise((_, fail) => { reject = fail }), dispose: () => reject(original) }))
    try {
      const pending = client.inspect('digitakt', new File(['PRIVATE'], 'PRIVATE.syx')), failed = expect(pending).rejects.toBe(original)
      client.dispose(); await failed
      expect(receive).not.toHaveBeenCalled()
    } finally { stop() }
  })
})
