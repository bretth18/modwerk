// SPDX-License-Identifier: GPL-3.0-or-later
// Digitakt/Digitone builds through the vendored elekloader builder: Modwerk module ids map to the pinned
// release files its online builder uses, and elekloader's own check decides whether a set builds.
import UPSTREAM from '../../../vendor/elekloader/UPSTREAM.json'
import type { BuilderClient } from './client'
import type { BuilderCatalog, BuilderCheck, BuilderDevice, BuilderMachine, PinnedFile } from './protocol'

export const BUILDER_CATALOG = { commit: UPSTREAM.commit, cores: UPSTREAM.cores, mods: UPSTREAM.mods } as BuilderCatalog
export const BUILDER_SOURCE = { repository: UPSTREAM.repository, commit: UPSTREAM.commit, pyodide: UPSTREAM.pyodide.npm.replace('pyodide@', '') }

export type BuildPlan = { core?: PinnedFile; mods: (PinnedFile & { module: string })[]; missing: string[] }

/** The pinned files for a selection on one OS release; modules without a file for it are `missing`. */
export function planBuild(machine: BuilderMachine, release: string, moduleIds: readonly string[], catalog: BuilderCatalog = BUILDER_CATALOG): BuildPlan {
  const core = catalog.cores.find(item => item.machine === machine && item.release === release)
  const mods: BuildPlan['mods'] = [], missing: string[] = []
  for (const id of moduleIds) {
    const file = catalog.mods.find(item => item.module === id && item.machine === machine && item.release === release)
    if (file) mods.push(file)
    else missing.push(id)
  }
  return { core, mods, missing }
}

/** OS releases a module can be built for. */
export function builderReleases(machine: BuilderMachine, moduleId: string, catalog: BuilderCatalog = BUILDER_CATALOG) {
  return catalog.mods.filter(item => item.machine === machine && item.module === moduleId).map(item => item.release)
}

export type PreparedBuild =
  | { ok: true; enabled: string[]; check: BuilderCheck; device: BuilderDevice }
  | { ok: false; error: string; device?: BuilderDevice; check?: BuilderCheck }

/** Loads the owner's verified file and the selection into the builder and runs elekloader's check. */
export async function prepareBuild(client: BuilderClient, input: { machine: BuilderMachine; release: string; stock: File; moduleIds: readonly string[] }): Promise<PreparedBuild> {
  const plan = planBuild(input.machine, input.release, input.moduleIds)
  if (!plan.core) return { ok: false, error: 'No core is available for OS ' + input.release + '.' }
  if (plan.missing.length) return { ok: false, error: 'Not available for OS ' + input.release + ': ' + plan.missing.join(', ') + '.' }
  await client.load()
  const stock = await client.setStock(input.stock)
  if (!stock.ok) return { ok: false, error: stock.error }
  let enabled: string[] = []
  for (const mod of plan.mods) {
    const added = await client.addMod(mod.file, mod.sha256)
    if (!added.ok) return { ok: false, error: added.error, device: stock.dev }
    enabled = await client.tick(enabled, added.mod.path)
  }
  if (!enabled.length) {
    const core = (await client.mods()).find(mod => mod.builtin && mod.id === 'core' && mod.fits)
    if (!core) return { ok: false, error: 'No core fits this OS file.', device: stock.dev }
    enabled = await client.tick([], core.path)
  }
  const check = await client.check(enabled)
  return check.ok ? { ok: true, enabled, check, device: stock.dev } : { ok: false, error: check.headline ?? 'These mods cannot be built together.', check, device: stock.dev }
}
