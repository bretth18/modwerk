// SPDX-License-Identifier: GPL-3.0-or-later
// Digitakt/Digitone builds through elekloader's kit (vendor/elekloader/kit): its builder worker and client, and the
// catalog Modwerk serves under elekloader/ (vendor/elekloader/catalog, pinned with the kit by elekloader.lock.json).
// Modwerk's machine ids map to the kit's device keys; Modwerk's module ids are the catalog's mod ids.
import CATALOG_JSON from '../../../vendor/elekloader/catalog/catalog.json'
import KIT from '../../../vendor/elekloader/kit/kit.json'
import {
  buildLogText as kitBuildLogText, createBuilder, parseCatalog, planBuild as kitPlanBuild, prepare, releases,
  type Builder, type Catalog, type Plan, type Prepared,
} from '../../../vendor/elekloader/kit/src/kit/index.ts'
import type { BuilderMachine, BuilderResult } from './protocol'

export { buildStep } from '../../../vendor/elekloader/kit/src/kit/index.ts'
export type { Builder }

export const BUILDER_CATALOG: Catalog = parseCatalog(CATALOG_JSON)
export const DEVICE: Record<BuilderMachine, string> = { digitakt: 'digitakt-mk1', digitone: 'digitone-mk1' }
// The kit's version and commit, apart from the catalog's revision: configuration backups name the revision, so they
// survive a kit update and change only with the catalog.
export const BUILDER_SOURCE = {
  repository: 'https://github.com/irpina/elekloader', commit: KIT.commit, version: KIT.version, protocol: KIT.protocol,
  catalogRevision: BUILDER_CATALOG.revision,
}

/** One builder per page session: the kit's worker, which loads the catalog Modwerk serves under elekloader/. */
export function createDigiBuilder(): Builder {
  return createBuilder({
    base: new URL('elekloader/', document.baseURI).href,
    worker: () => new Worker(new URL('../../../vendor/elekloader/kit/src/kit/worker.ts', import.meta.url), { type: 'module' }),
  })
}

/** The catalog files for a selection on one OS release, with what each mod requires; modules without a file for it
 * are `missing`. */
export function planBuild(machine: BuilderMachine, release: string, moduleIds: readonly string[], catalog: Catalog = BUILDER_CATALOG): Plan {
  return kitPlanBuild(catalog, DEVICE[machine], release, moduleIds)
}

/** OS releases a module can be built for. */
export function builderReleases(machine: BuilderMachine, moduleId: string, catalog: Catalog = BUILDER_CATALOG) {
  return releases(catalog, DEVICE[machine], moduleId)
}

export type PreparedBuild = Prepared

/** Loads the owner's verified file and the selection into the builder and runs elekloader's check. */
export function prepareBuild(builder: Builder, input: { machine: BuilderMachine; release: string; stock: File; moduleIds: readonly string[] }): Promise<PreparedBuild> {
  return prepare(builder, { catalog: BUILDER_CATALOG, device: DEVICE[input.machine], os: input.release, stock: input.stock, ids: input.moduleIds })
}

/** A build's log as a text file for a bug report (the kit's format, titled for Modwerk). */
export function buildLogText(input: { device: string; release: string; version: string; enabled: readonly string[]; result: BuilderResult }) {
  return kitBuildLogText({
    title: 'Modwerk build log', device: input.device, os: input.release, version: input.version, enabled: input.enabled, result: input.result,
    builder: `elekloader kit ${KIT.version} (${KIT.commit.slice(0, 12)}, protocol ${KIT.protocol}), catalog ${BUILDER_CATALOG.revision}`,
  })
}
