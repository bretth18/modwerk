import { useId } from 'react'
import { DSP_LOADER } from '../engine/protocol'
import { DEVICES_BY_ID } from '../devices/registry'
import { machineModules } from './modules'
import type { OtLogSummary } from './ot-log'
import type { ReportModule, WorkspaceReportContext } from './report-context'
import { chosenSavedId, resolveReportConfiguration, type ConfigurationChoice } from './report-configuration'

type LogConfiguration = Pick<OtLogSummary, 'version' | 'modules' | 'os' | 'stockFx2'>
const count = (modules: ReportModule[]) => modules.length + (modules.length === 1 ? ' module' : ' modules')

export function ReportConfiguration({ machine, moduleId, workspace, log, value, onChange, disabled, os }: {
  machine: string
  /** The reported module's native id; '' when there is none to check for (module sets). */
  moduleId: string
  workspace: WorkspaceReportContext
  log: LogConfiguration | null
  value: ConfigurationChoice
  onChange: (next: ConfigurationChoice) => void
  disabled?: boolean
  os?: string
}) {
  const headingId = useId()
  const resolved = resolveReportConfiguration(value, workspace, machine, log)
  const missing = !!moduleId && resolved.source !== 'none' && !resolved.modules.some(item => item.id === moduleId)
  const list = resolved.modules.map(item => item.id + ' ' + item.version).join(', ')
  if (log) return <div className="issue-report-configuration" role="group" aria-labelledby={headingId}>
    <p className="issue-report-heading" id={headingId}>Configuration <span>Read from OCTAMOD.LOG</span></p>
    <p className="service-note">The log records the build exactly: {count(resolved.modules)}, base OS {log.os}{log.version === 2 && log.stockFx2 !== null ? (log.stockFx2 ? ', stock FX2 kept' : ', stock FX2 replaced') : ''}. Attached privately with the log.</p>
    {list && <p className="issue-report-module-list">{list}</p>}
    {missing && <p className="file-error">The log does not list this module. If the problem is in another build, attach that build’s log instead.</p>}
  </div>
  const device = DEVICES_BY_ID[machine]?.name ?? 'device', savedId = chosenSavedId(value, workspace), catalog = machineModules(machine)
  const toggle = (id: string) => onChange({ ...value, manualIds: value.manualIds.includes(id) ? value.manualIds.filter(item => item !== id) : [...value.manualIds, id] })
  return <div className="issue-report-configuration" role="group" aria-labelledby={headingId}>
    <p className="issue-report-heading" id={headingId}>Configuration <span>{machine === 'octatrack' ? 'Required, unless OCTAMOD.LOG is attached' : 'Required'}</span></p>
    {workspace.configurations.length > 0 && <label>Which configuration has the problem?<select value={savedId} disabled={disabled} onChange={event => onChange({ ...value, saved: event.target.value })}>
      {workspace.configurations.map(item => <option key={item.id} value={item.id}>{item.name}{item.id === workspace.activeId ? ' (active)' : ''} · {count(item.modules)}</option>)}
      <option value="">Not saved here: tick the modules</option>
    </select></label>}
    {resolved.source === 'saved' ? <p className="service-note">Attached privately: configuration <strong>{resolved.name}</strong>{os ? ', base OS ' + os : ''}, {count(resolved.modules)}{resolved.build ? ', build fingerprint' : ''}.</p> : <>
      {workspace.configurations.length === 0 && <p className="service-note">No configuration is saved in this browser. Tick the modules your {device} runs{machine === 'octatrack' ? ', or attach OCTAMOD.LOG, which records them exactly' : ''}.</p>}
      <div className="issue-report-modules" role="group" aria-label="Modules in the configuration">
        {catalog.map(module => <label key={module.moduleId}><input type="checkbox" checked={value.manualIds.includes(module.moduleId)} disabled={disabled} onChange={() => toggle(module.moduleId)} />{module.name} <span>{module.version}</span></label>)}
      </div>
      {machine === 'octatrack' && DSP_LOADER && <label className="issue-report-escape"><input type="checkbox" checked={value.keepStockFx2} disabled={disabled} onChange={event => onChange({ ...value, keepStockFx2: event.target.checked })} />Stock FX2 effects kept</label>}
      {resolved.source === 'none' && <p className="service-note">Tick at least one module. Versions are the current catalog versions; the log is exact.</p>}
    </>}
    {missing && <p className="file-error">This module is not in that configuration. Choose the configuration you flashed, or tick the module.</p>}
  </div>
}
