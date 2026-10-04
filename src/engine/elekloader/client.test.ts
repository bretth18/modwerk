import { describe, expect, it } from 'vitest'
import { createBuilderClient } from './client'

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  sent: Record<string, unknown>[] = []
  terminated = false
  postMessage(message: Record<string, unknown>) { this.sent.push(message) }
  terminate() { this.terminated = true }
  reply(data: unknown) { this.onmessage?.({ data } as MessageEvent) }
}

describe('builder client', () => {
  it('routes replies and build progress to the right request', async () => {
    const worker = new FakeWorker(), lines: string[] = []
    const client = createBuilderClient('https://modwerk.test/elekloader/', () => worker as unknown as Worker)
    const loading = client.load()
    expect(worker.sent[0]).toMatchObject({ cmd: 'init', base: 'https://modwerk.test/elekloader/' })
    expect(client.load()).toBe(loading)
    const building = client.build(['/work/core/core-2.1.elemod'], '2.0a', 'custom-2.0a.syx', line => lines.push(line))
    worker.reply({ id: 2, log: 'packing' })
    worker.reply({ id: 2, ok: true, result: { ok: true, sha256: 'ab' } })
    worker.reply({ id: 1, ok: true, result: { commit: 'e4d8ba8' } })
    await expect(building).resolves.toMatchObject({ ok: true, sha256: 'ab' })
    await expect(loading).resolves.toMatchObject({ commit: 'e4d8ba8' })
    expect(lines).toEqual(['packing'])
  })
  it('rejects pending work when the worker fails, and allows a fresh load', async () => {
    const workers: FakeWorker[] = []
    const client = createBuilderClient('https://modwerk.test/elekloader/', () => { const worker = new FakeWorker(); workers.push(worker); return worker as unknown as Worker })
    const first = client.load()
    workers[0].onerror?.()
    await expect(first).rejects.toThrow('The builder stopped')
    expect(workers[0].terminated).toBe(true)
    const second = client.load()
    expect(workers).toHaveLength(2)
    const refused = client.check([])
    workers[1].reply({ id: 3, ok: false, error: 'the engine is not loaded' })
    await expect(refused).rejects.toThrow('the engine is not loaded')
    client.dispose()
    await expect(second).rejects.toThrow('closed')
    await expect(client.mods()).rejects.toThrow('closed')
  })
})
