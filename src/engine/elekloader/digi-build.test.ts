import { describe, expect, it, vi } from 'vitest'
import { DIGI_MODS } from '../../devices/digi-mods'
import MACHINES from '../../devices/machines.generated.json'
import { BUILDER_CATALOG, builderReleases, planBuild, prepareBuild } from './digi-build'
import type { BuilderClient } from './client'
import { DIGI_DOWNLOADS_ENABLED } from './protocol'

describe('vendored elekloader catalog', () => {
  it('pins a core for every supported Digitakt and Digitone release', () => {
    for (const machine of ['digitakt', 'digitone'] as const) {
      const releases = (MACHINES as { id: string; firmware?: { releases: { version: string }[] } }[]).find(item => item.id === machine)!.firmware!.releases.map(item => item.version)
      for (const release of releases) expect(planBuild(machine, release, []).core?.file, machine + ' ' + release).toMatch(/^core\/core-/)
    }
  })
  it('has the pinned release file for every library module on each release it lists', () => {
    for (const mod of DIGI_MODS) expect(builderReleases(mod.device, mod.id).sort(), mod.device + ' ' + mod.id).toEqual([...mod.releases].sort())
    expect(BUILDER_CATALOG.mods.every(item => /^[a-f0-9]{64}$/.test(item.sha256) && item.file.startsWith('shop/'))).toBe(true)
  })
  it('reports modules without a file for the chosen release', () => {
    expect(planBuild('digitakt', '1.54', ['digisophie', 'digihealth'])).toMatchObject({ missing: ['digisophie'], mods: [{ module: 'digihealth', release: '1.54' }] })
  })
  it('keeps Digitakt/Digitone downloads off until the owner approves them', () => {
    expect(DIGI_DOWNLOADS_ENABLED).toBe(false)
  })
})

function fakeClient(overrides: Partial<Record<keyof BuilderClient, (...args: never[]) => unknown>> = {}) {
  const ticks: string[][] = []
  const client = {
    load: vi.fn(async () => ({})),
    setStock: vi.fn(async () => ({ ok: true, file: 'Digitakt_OS1.53.syx', dev: { key: 'digitakt-mk1', name: 'Digitakt mk1', releases: ['1.53'], version_len: 4, exact_len: true, recovery: 'FUNC at power-on', default_version: '2.0a' } })),
    addMod: vi.fn(async (file: string) => ({ ok: true, mod: { path: '/work/mods/' + file.split('/').pop(), file, id: 'x', version: '1', label: 'x' } })),
    mods: vi.fn(async () => [{ path: '/work/core/core-2.1.elemod', file: 'core-2.1.elemod', id: 'core', version: '2.1', label: 'core', builtin: true, fits: true }]),
    tick: vi.fn(async (enabled: string[], path: string) => { ticks.push(enabled); return [...new Set([...enabled, path, '/work/core/core-2.1.elemod'])] }),
    check: vi.fn(async () => ({ ok: true })),
    version: vi.fn(), build: vi.fn(), dispose: vi.fn(),
    ...overrides,
  }
  return { client: client as unknown as BuilderClient, raw: client as typeof client & { addMod: ReturnType<typeof vi.fn<(file: string, sha256: string) => Promise<unknown>>> }, ticks }
}

describe('preparing a build', () => {
  const stock = new File([new Uint8Array(4)], 'Digitakt_OS1.53.syx')
  it('adds each pinned file by hash and lets the builder add the core it requires', async () => {
    const { client, raw } = fakeClient()
    const prepared = await prepareBuild(client, { machine: 'digitakt', release: '1.53', stock, moduleIds: ['digihealth', 'digislicer'] })
    expect(prepared.ok).toBe(true)
    expect(raw.addMod.mock.calls.map(call => call[0])).toEqual(['shop/digihealth-1.0.elemod', 'shop/digislicer-2.1.elemod'])
    expect(raw.addMod.mock.calls.every(call => /^[a-f0-9]{64}$/.test(String(call[1])))).toBe(true)
    expect(prepared.ok && prepared.enabled).toEqual(['/work/mods/digihealth-1.0.elemod', '/work/core/core-2.1.elemod', '/work/mods/digislicer-2.1.elemod'])
  })
  it('builds the core alone when nothing is selected', async () => {
    const { client, raw } = fakeClient()
    const prepared = await prepareBuild(client, { machine: 'digitakt', release: '1.53', stock, moduleIds: [] })
    expect(raw.addMod).not.toHaveBeenCalled()
    expect(prepared.ok && prepared.enabled).toEqual(['/work/core/core-2.1.elemod'])
  })
  it('passes on the builder’s refusals without building', async () => {
    const refused = fakeClient({ check: vi.fn(async () => ({ ok: false, headline: 'Conflicts: the firmware cannot be built', problems: ['NEIGHBOR and SOPHIE patch the same bytes'] })) })
    expect(await prepareBuild(refused.client, { machine: 'digitakt', release: '1.53', stock, moduleIds: ['digineighbor', 'digisophie'] })).toMatchObject({ ok: false, error: 'Conflicts: the firmware cannot be built' })
    const stockRefused = fakeClient({ setStock: vi.fn(async () => ({ ok: false, error: 'Not a known stock OS file.' })) })
    expect(await prepareBuild(stockRefused.client, { machine: 'digitakt', release: '1.53', stock, moduleIds: [] })).toEqual({ ok: false, error: 'Not a known stock OS file.' })
    const missing = fakeClient()
    expect(await prepareBuild(missing.client, { machine: 'digitakt', release: '1.54', stock, moduleIds: ['digisophie'] })).toMatchObject({ ok: false })
    expect(missing.raw.load).not.toHaveBeenCalled()
  })
})
