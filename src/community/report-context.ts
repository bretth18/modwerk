import { useSyncExternalStore } from 'react'
import { BASE_FIRMWARE } from '../engine/base'
import { sourceRepository } from '../hosting'

/** What the workspace knows about the configuration a report is most likely about. Firmware bytes never enter it. */
export type WorkspaceReportContext = { configurationName: string; modules: { id: string; version: string }[]; keepStockFx2: boolean | null; build: string }
const empty: WorkspaceReportContext = { configurationName: '', modules: [], keepStockFx2: null, build: '' }
let current = empty
const machines: Record<string, WorkspaceReportContext> = {}
const listeners = new Set<() => void>()

export function setWorkspaceReportContext(next: WorkspaceReportContext, machine = 'octatrack') {
  if (JSON.stringify(next) === JSON.stringify(machines[machine])) return
  machines[machine] = next
  if (machine === 'octatrack') current = next
  for (const listener of listeners) listener()
}
export function useWorkspaceReportContext(machine = 'octatrack') {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => machines[machine] ?? (machine === 'octatrack' ? current : empty), () => empty)
}
export const REPORT_OS = BASE_FIRMWARE.version
/** Mirrored issue reports live in the Octamod repository's GitHub issues. */
export function issueRepository() { try { return sourceRepository() || 'https://github.com/repeat98/modwerk' } catch { return 'https://github.com/repeat98/modwerk' } }
export function moduleIssuesUrl(id: string) { return issueRepository() + '/issues?q=' + encodeURIComponent('is:issue label:"module:' + id + '"') }
