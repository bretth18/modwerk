import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDigiFirmwareClient } from './firmware-client'

class LocalWorker {
  static latest: LocalWorker
  onmessage?: (event: MessageEvent) => void
  onerror?: () => void
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() { LocalWorker.latest = this }
}
afterEach(() => vi.unstubAllGlobals())
function setup() { vi.stubGlobal('Worker', LocalWorker); const client = createDigiFirmwareClient(); return { client, worker: LocalWorker.latest } }
const file = (name = 'synthetic.syx') => new File([new Uint8Array([1, 2, 3])], name)

describe('local Digi reader client', () => {
  it('transfers bytes solely to the local worker and returns metadata', async () => {
    const { client, worker } = setup(), pending = client.inspect('digitone', file())
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledOnce())
    const [request, transfer] = worker.postMessage.mock.calls[0]
    expect(request).toMatchObject({ id: 1, machine: 'digitone', name: 'synthetic.syx' })
    expect(Array.from(new Uint8Array(request.buffer))).toEqual([1, 2, 3])
    expect(transfer).toEqual([request.buffer])
    const inspection = { machine: 'digitone', release: 'TEST', name: 'synthetic.syx', bytes: 3, sha256: 'a'.repeat(64) }
    worker.onmessage?.({ data: { id: 1, type: 'inspection', inspection } } as MessageEvent)
    expect(await pending).toEqual(inspection)
    client.dispose()
  })
  it('refuses ZIP and empty files before transferring any bytes', async () => {
    const { client, worker } = setup()
    await expect(client.inspect('digitakt', file('synthetic.zip'))).rejects.toThrow('extracted original')
    await expect(client.inspect('digitakt', new File([], 'empty.syx'))).rejects.toThrow('extracted original')
    expect(worker.postMessage).not.toHaveBeenCalled()
    client.dispose()
  })
  it('rejects pending requests when removed or when the worker stops', async () => {
    const { client, worker } = setup(), pending = client.inspect('digitakt', file()), rejected = expect(pending).rejects.toThrow('closed')
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledOnce())
    client.dispose(); await rejected
    expect(worker.terminate).toHaveBeenCalledOnce()
    const stopped = setup(), reading = stopped.client.inspect('digitakt', file()), failure = expect(reading).rejects.toThrow('stopped')
    await vi.waitFor(() => expect(stopped.worker.postMessage).toHaveBeenCalledOnce())
    stopped.worker.onerror?.(); await failure
    await expect(stopped.client.inspect('digitakt', file())).rejects.toThrow('closed')
  })
})
