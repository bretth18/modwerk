import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLazyFirmwareClient } from './firmware-client'
import type { EngineRequest, EngineResponse } from '../engine/protocol'
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
