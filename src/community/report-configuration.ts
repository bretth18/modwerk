import { DSP_LOADER } from '../engine/protocol'
import { configurationFromLog } from './issue-context'
import { machineModules } from './modules'
import type { OtLogSummary } from './ot-log'
import type { ReportModule, WorkspaceReportContext } from './report-context'

/**
 * The configuration a report is about. An attached OCTAMOD.LOG records it exactly,
 * so the log wins. Without a log the reporter names it without leaving the form:
 * a configuration saved in this browser (the active one first), or the modules by hand.
 */
export type ConfigurationChoice = {
  /** A saved configuration's id; '' means "by hand"; undefined means the active one when there is one. */
  saved?: string
  manualIds: string[]
  keepStockFx2: boolean
}
export type ResolvedConfiguration = { source: 'log' | 'saved' | 'manual' | 'none'; name: string; modules: ReportModule[]; keepStockFx2: boolean | null; build: string }
type LogConfiguration = Pick<OtLogSummary, 'version' | 'modules' | 'os' | 'stockFx2'>

export function defaultConfigurationChoice(moduleIds: string[]): ConfigurationChoice { return { manualIds: moduleIds, keepStockFx2: true } }

const sameModules = (a: ReportModule[], b: ReportModule[]) => a.length === b.length && a.every(item => b.some(other => other.id === item.id && other.version === item.version))

/** Which saved configuration the choice names: the active one until the reporter picks another, '' for "by hand". */
export function chosenSavedId(choice: ConfigurationChoice, workspace: WorkspaceReportContext) {
  if (choice.saved === '') return ''
  if (choice.saved && workspace.configurations.some(item => item.id === choice.saved)) return choice.saved
  return workspace.activeId || workspace.configurations[0]?.id || ''
}

export function resolveReportConfiguration(choice: ConfigurationChoice, workspace: WorkspaceReportContext, machine: string, log: LogConfiguration | null): ResolvedConfiguration {
  if (log) {
    const recorded = configurationFromLog(log)
    // The browser's image hash belongs to the active configuration; it only describes the log's build when they are the same.
    return { source: 'log', name: '', modules: recorded.modules, keepStockFx2: recorded.keepStockFx2 ?? workspace.keepStockFx2, build: sameModules(recorded.modules, workspace.modules) ? workspace.build : '' }
  }
  const saved = workspace.configurations.find(item => item.id === chosenSavedId(choice, workspace))
  if (saved) return { source: 'saved', name: saved.name, modules: saved.modules, keepStockFx2: saved.keepStockFx2, build: saved.id === workspace.activeId ? workspace.build : '' }
  const catalog = machineModules(machine)
  const modules = choice.manualIds.flatMap(id => { const module = catalog.find(item => item.moduleId === id); return module ? [{ id, version: module.version }] : [] })
  return { source: modules.length ? 'manual' : 'none', name: '', modules, keepStockFx2: machine === 'octatrack' && DSP_LOADER ? choice.keepStockFx2 : null, build: '' }
}
