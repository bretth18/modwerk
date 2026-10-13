// @vitest-environment jsdom
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDigiBuild } from './useDigiBuild'
import { subscribeSiteDiagnosticEvents } from '../community/site-diagnostic-events'
const mocked = vi.hoisted(() => ({ account: vi.fn(), prepare: vi.fn(), version: vi.fn(), build: vi.fn(), usage: vi.fn(), dispose: vi.fn() }))
vi.mock('../community/member-access', () => ({ requireBuildAccount: mocked.account }))
vi.mock('../community/usage', () => ({ trackUsage: mocked.usage }))
vi.mock('../engine/elekloader/machine-build', () => ({
  createMachineBuilder: () => ({ version: mocked.version, build: mocked.build, dispose: mocked.dispose }),
  prepareBuild: mocked.prepare, buildStep: (line: string, previous: string) => line === 'PRIVATE packing log' ? 'packing' : previous,
}))
let root: Root, container: HTMLDivElement, hook: ReturnType<typeof useDigiBuild>, cleanups: (() => void)[]
const device = { key: 'PRIVATE device' }, file = new File(['PRIVATE bytes'], 'PRIVATE.syx'), modules = ['PRIVATE module']
function Harness() {
  const current = useDigiBuild('digitakt', file, 'PRIVATE release', modules)
  useEffect(() => { hook = current }, [current])
  return null
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
beforeEach(async () => {
  vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); cleanups = []
  mocked.account.mockResolvedValue(undefined)
  mocked.prepare.mockResolvedValue({ ok: true, enabled: ['PRIVATE path'], check: { ok: true }, device })
  mocked.version.mockResolvedValue({ ok: true, name: 'PRIVATE name' })
  mocked.build.mockResolvedValue({ ok: false, error: 'PRIVATE build error', log: [[0, 'PRIVATE log']] })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  await act(async () => { root.render(createElement(Harness)); await flush() })
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); for (const stop of cleanups.reverse()) stop(); vi.unstubAllGlobals() })
function subscribe() { const receive = vi.fn(); cleanups.push(subscribeSiteDiagnosticEvents(receive)); return receive }
async function check() { await act(async () => { hook.check(); await flush() }); await act(flush) }
async function build() { await act(async () => { await hook.build('PRIVATE version') }) }

describe('consent-bound Elekloader preparation and builds', () => {
  it('reports refused preparation and build results without any private fields, preserving failure views', async () => {
    const receive = subscribe()
    mocked.prepare.mockResolvedValueOnce({ ok: false, error: 'PRIVATE selection' })
    await check(); expect(hook.state.phase).toBe('blocked')
    expect(receive).toHaveBeenLastCalledWith({ event: 'build_failed', phase: 'preparing', buildKind: 'elekloader', error: 'selection' })
    await check(); expect(hook.state.phase).toBe('ready')
    mocked.build.mockImplementationOnce(async (_enabled, _version, _name, progress) => { progress('PRIVATE packing log'); return { ok: false, error: 'PRIVATE build error' } })
    await build(); expect(hook.state.phase).toBe('failed')
    expect(receive).toHaveBeenLastCalledWith({ event: 'build_failed', phase: 'packing', buildKind: 'elekloader', error: 'build' })
    expect(JSON.stringify(receive.mock.calls)).not.toContain('PRIVATE')
    expect(mocked.build).toHaveBeenCalledWith(['PRIVATE path'], 'PRIVATE version', 'PRIVATE name', expect.any(Function))
  })
  it('omits sign-in refusal, AbortError and a cancelled pending preparation', async () => {
    const receive = subscribe()
    mocked.account.mockRejectedValueOnce(new Error('PRIVATE sign-in'))
    await check(); expect(mocked.prepare).not.toHaveBeenCalled()
    mocked.prepare.mockRejectedValueOnce(new DOMException('PRIVATE', 'AbortError'))
    await check()
    let reject!: (error: Error) => void
    mocked.prepare.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
    await check(); await act(async () => { hook.cancel(); reject(new Error('PRIVATE cancelled')); await flush() })
    expect(receive).not.toHaveBeenCalled(); expect(hook.state.phase).toBe('idle')
  })
  it('drops late failures started before consent or under a replaced account', async () => {
    let resolve!: (value: unknown) => void
    mocked.prepare.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    await check(); const first = subscribe()
    await act(async () => { resolve({ ok: false, error: 'PRIVATE before consent' }); await flush() })
    expect(first).not.toHaveBeenCalled()
    await check()
    let reject!: (error: Error) => void
    mocked.build.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
    let pending!: Promise<void>
    await act(async () => { pending = hook.build('PRIVATE version'); await flush() })
    const second = subscribe()
    await act(async () => { reject(new Error('PRIVATE old account')); await pending })
    expect(first).not.toHaveBeenCalled(); expect(second).not.toHaveBeenCalled(); expect(hook.state.phase).toBe('failed')
  })
  it('reports version refusal and rejected preparation/build through fixed categories only', async () => {
    const receive = subscribe()
    mocked.prepare.mockRejectedValueOnce(new Error('PRIVATE prepare error')); await check()
    expect(receive).toHaveBeenLastCalledWith({ event: 'build_failed', phase: 'preparing', buildKind: 'elekloader', error: 'build' })
    await check(); mocked.version.mockResolvedValueOnce({ ok: false, error: 'PRIVATE version error' }); await build()
    expect(receive).toHaveBeenLastCalledWith({ event: 'build_failed', phase: 'preparing', buildKind: 'elekloader', error: 'input' })
    mocked.build.mockRejectedValueOnce(new Error('PRIVATE build')); await build()
    expect(receive).toHaveBeenLastCalledWith({ event: 'build_failed', phase: 'composing', buildKind: 'elekloader', error: 'build' })
  })
})
