import data from './module-changelogs.json' with { type: 'json' }
import { compareModuleVersions } from '../catalog/versions.ts'

export type ReleaseNotes = { version: string; date: string; changes: string[]; sourceCommit?: string }
export type RecordedRelease = { version: string; recordedAt: string }
export type ModuleRelease = { version: string; previousVersion: string | null; recordedAt?: string; notes?: ReleaseNotes }
export type ChangelogModules = Record<string, ReleaseNotes[]>

type CatalogModule = { id: string; version: string }
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validate authored notes independently of the live version-history service. */
export function parseModuleChangelogs(value: unknown, catalog?: readonly CatalogModule[]): ChangelogModules {
  if (!object(value) || value.schemaVersion !== 1 || !object(value.modules)) throw new Error('Invalid module changelog schema')
  const modules: ChangelogModules = {}
  for (const [id, entries] of Object.entries(value.modules)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !Array.isArray(entries) || !entries.length) throw new Error('Missing release notes for ' + id)
    const versions = new Set<string>()
    modules[id] = entries.map(entry => {
      if (!object(entry) || typeof entry.version !== 'string') throw new Error('Invalid changelog version for ' + id)
      compareModuleVersions(entry.version, entry.version)
      if (versions.has(entry.version)) throw new Error('Duplicate changelog version for ' + id + ': ' + entry.version)
      versions.add(entry.version)
      if (typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !Number.isFinite(Date.parse(entry.date)) || new Date(entry.date).toISOString().slice(0, 10) !== entry.date) throw new Error('Invalid changelog date for ' + id)
      if (!Array.isArray(entry.changes) || !entry.changes.length || entry.changes.some(change => typeof change !== 'string' || change.trim().length < 12 || change.length > 1000)) throw new Error('Describe the changes in release notes for ' + id + ' v' + entry.version)
      if (entry.sourceCommit !== undefined && (typeof entry.sourceCommit !== 'string' || !/^[0-9a-f]{40}$/.test(entry.sourceCommit))) throw new Error('Invalid source commit for ' + id)
      return { version: entry.version, date: entry.date, changes: entry.changes as string[], ...(entry.sourceCommit ? { sourceCommit: entry.sourceCommit as string } : {}) }
    }).sort((a, b) => compareModuleVersions(b.version, a.version))
  }
  if (catalog) {
    const ids = new Set(catalog.map(module => module.id))
    for (const id of Object.keys(modules)) if (!ids.has(id)) throw new Error('Unknown changelog module: ' + id)
    for (const module of catalog) {
      const entries = modules[module.id] ?? []
      if (!entries.some(entry => entry.version === module.version)) throw new Error('Missing release notes for ' + module.id + ' v' + module.version + '. Add them to src/community/module-changelogs.json.')
      if (entries.some(entry => compareModuleVersions(entry.version, module.version) > 0)) throw new Error('Changelog version is newer than the catalog for ' + module.id)
    }
  }
  return modules
}

export const moduleChangelogs = parseModuleChangelogs(data)

/** Keep authored history visible even before the API has recorded a release. */
export function mergeModuleReleases(notes: readonly ReleaseNotes[], recorded: readonly RecordedRelease[] = []): ModuleRelease[] {
  const releases = new Map<string, Omit<ModuleRelease, 'previousVersion'>>()
  for (const release of recorded) releases.set(release.version, { version: release.version, recordedAt: release.recordedAt })
  for (const note of notes) releases.set(note.version, { ...releases.get(note.version), version: note.version, notes: note })
  const sorted = [...releases.values()].sort((a, b) => compareModuleVersions(b.version, a.version))
  return sorted.map((release, i) => ({ ...release, previousVersion: sorted[i + 1]?.version ?? null }))
}
