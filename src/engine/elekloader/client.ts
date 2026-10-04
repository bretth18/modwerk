// SPDX-License-Identifier: GPL-3.0-or-later
import type { BuilderAdded, BuilderCheck, BuilderMod, BuilderRequest, BuilderResult, BuilderStock, BuilderVersion } from './protocol'

type Task = { resolve: (value: unknown) => void; reject: (error: Error) => void; log?: (line: string) => void }

/** One worker per page session; the engine downloads once and keeps the stock file in the worker's memory. */
export function createBuilderClient(base: string, spawn = () => new Worker(new URL('./builder.worker.ts', import.meta.url), { type: 'module' })) {
  let worker: Worker | undefined, nextId = 0, closed = false, ready: Promise<unknown> | undefined
  const pending = new Map<number, Task>()
  function fail(message: string) { for (const task of pending.values()) task.reject(new Error(message)); pending.clear(); worker?.terminate(); worker = undefined; ready = undefined }
  function request<T>(message: BuilderRequest, log?: (line: string) => void, transfer: Transferable[] = []): Promise<T> {
    if (closed) return Promise.reject(new Error('The builder was closed.'))
    if (!worker) {
      worker = spawn()
      worker.onerror = () => fail('The builder stopped. Try again.')
      worker.onmessage = (event: MessageEvent<{ id: number; ok?: boolean; result?: unknown; error?: string; log?: string }>) => {
        const task = pending.get(event.data.id)
        if (!task) return
        if (typeof event.data.log === 'string') { task.log?.(event.data.log); return }
        pending.delete(event.data.id)
        if (event.data.ok) task.resolve(event.data.result)
        else task.reject(new Error(event.data.error ?? 'The builder failed.'))
      }
    }
    const id = ++nextId
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: resolve as (value: unknown) => void, reject, log })
      try { worker!.postMessage({ ...message, id }, transfer) } catch (error) { pending.delete(id); reject(error as Error) }
    })
  }
  return {
    load() { return ready ??= request({ cmd: 'init', base }).catch(error => { ready = undefined; throw error }) },
    async setStock(file: File) { const data = await file.arrayBuffer(); return request<BuilderStock>({ cmd: 'setStock', name: file.name, data }, undefined, [data]) },
    addMod(file: string, sha256: string) { return request<BuilderAdded>({ cmd: 'addMod', file, sha256 }) },
    mods() { return request<BuilderMod[]>({ cmd: 'mods' }) },
    tick(enabled: string[], path: string) { return request<string[]>({ cmd: 'tick', enabled, path }) },
    check(enabled: string[]) { return request<BuilderCheck>({ cmd: 'check', enabled }) },
    version(version: string, enabled: string[]) { return request<BuilderVersion>({ cmd: 'version', version, enabled }) },
    build(enabled: string[], version: string, name: string, log?: (line: string) => void) { return request<BuilderResult>({ cmd: 'build', enabled, version, name }, log) },
    dispose() { closed = true; fail('The builder was closed.') },
  }
}
export type BuilderClient = ReturnType<typeof createBuilderClient>
