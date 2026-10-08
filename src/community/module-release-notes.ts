import { compareModuleVersions } from '../catalog/versions.ts'

export type ReleaseNotes = { version: string; date: string; changes: string[]; sourceCommit?: string }

/** The authored changelog, published inventory and stored email snapshot share one validation. */
export function parseReleaseNotes(value: unknown, moduleId: string): ReleaseNotes {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid release notes for ' + moduleId)
  const entry = value as Record<string, unknown>
  if (typeof entry.version !== 'string') throw new Error('Invalid changelog version for ' + moduleId)
  compareModuleVersions(entry.version, entry.version)
  if (typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !Number.isFinite(Date.parse(entry.date)) || new Date(entry.date).toISOString().slice(0, 10) !== entry.date) throw new Error('Invalid changelog date for ' + moduleId)
  if (!Array.isArray(entry.changes) || !entry.changes.length || entry.changes.some(change => typeof change !== 'string' || change.trim().length < 12 || change.length > 1000)) throw new Error('Describe the changes in release notes for ' + moduleId + ' v' + entry.version)
  if (entry.sourceCommit !== undefined && (typeof entry.sourceCommit !== 'string' || !/^[0-9a-f]{40}$/.test(entry.sourceCommit))) throw new Error('Invalid source commit for ' + moduleId)
  return { version: entry.version, date: entry.date, changes: entry.changes as string[], ...(entry.sourceCommit ? { sourceCommit: entry.sourceCommit as string } : {}) }
}
