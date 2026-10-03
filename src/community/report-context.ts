import { useSyncExternalStore } from 'react'
import { BASE_FIRMWARE } from '../engine/base'
import { sourceRepository } from '../hosting'

/** What the workspace knows about the configuration a report is most likely about. Firmware bytes never enter it. */
export type WorkspaceReportContext = { configurationName: string; modules: { id: string; version: string }[]; keepStockFx2: boolean | null; build: string }
const empty: WorkspaceReportContext = { configurationName: '', modules: [], keepStockFx2: null, build: '' }
let current = empty
const listeners = new Set<() => void>()

export function setWorkspaceReportContext(next: WorkspaceReportContext) {
  if (JSON.stringify(next) === JSON.stringify(current)) return
  current = next
  for (const listener of listeners) listener()
}
export function useWorkspaceReportContext() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => current, () => empty)
}
export const REPORT_OS = BASE_FIRMWARE.version
/** Mirrored issue reports live in the Octamod repository's GitHub issues. */
export function issueRepository() { try { return sourceRepository() || 'https://github.com/repeat98/octamod' } catch { return 'https://github.com/repeat98/octamod' } }
export function moduleIssuesUrl(id: string) { return issueRepository() + '/issues?q=' + encodeURIComponent('is:issue label:"module:' + id + '"') }
