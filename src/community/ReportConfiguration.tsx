import { useId, useState } from 'react'
import { DSP_LOADER } from '../engine/protocol'
import { DEVICES_BY_ID } from '../devices/registry'
import { machineModules } from './modules'
import type { OtLogSummary } from './ot-log'
import type { ReportModule, WorkspaceReportContext } from './report-context'
import { chosenSavedId, namableConfigurations, resolveReportConfiguration, type ConfigurationChoice } from './report-configuration'

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
  const headingId = useId(), searchId = useId(), [query, setQuery] = useState('')
  const resolved = resolveReportConfiguration(value, workspace, machine, log)
  const missing = !!moduleId && resolved.source !== 'none' && !resolved.modules.some(item => item.id === moduleId)
  const list = resolved.modules.map(item => item.id + ' ' + item.version).join(', ')
  if (log) return <div className="issue-report-configuration" role="group" aria-labelledby={headingId}>
    <p className="issue-report-heading" id={headingId}>Configuration <span>Read from OCTAMOD.LOG</span></p>
    <p className="service-note">The log records the build exactly: {count(resolved.modules)}, base OS {log.os}{log.version === 2 && log.stockFx2 !== null ? (log.stockFx2 ? ', stock FX2 kept' : ', stock FX2 replaced') : ''}. Attached privately with the log.</p>
    {list && <p className="issue-report-module-list">{list}</p>}
    {missing && <p className="file-error">The log does not list this module. If the problem is in another build, attach that build’s log instead.</p>}
  </div>
  const device = DEVICES_BY_ID[machine]?.name ?? 'device', savedId = chosenSavedId(value, workspace), catalog = machineModules(machine), saved = namableConfigurations(workspace)
  const chosen = value.manualIds.flatMap(id => { const module = catalog.find(item => item.moduleId === id); return module ? [module] : [] })
  const add = (id: string) => { onChange({ ...value, manualIds: [...value.manualIds.filter(item => item !== id), id] }); setQuery('') }
  const remove = (id: string) => onChange({ ...value, manualIds: value.manualIds.filter(item => item !== id) })
  // The catalog keeps growing, so the picker shows only the chosen modules and a few matches for what is typed.
  const needle = query.trim().toLowerCase()
  const candidates = catalog.filter(module => !value.manualIds.includes(module.moduleId) && (!needle || module.name.toLowerCase().includes(needle) || module.moduleId.includes(needle))).sort((a, b) => a.name.localeCompare(b.name))
  const matches = candidates.slice(0, 6)
  return <div className="issue-report-configuration" role="group" aria-labelledby={headingId}>
    <p className="issue-report-heading" id={headingId}>Configuration <span>{machine === 'octatrack' ? 'Required, unless OCTAMOD.LOG is attached' : 'Required'}</span></p>
    {saved.length > 0 && <label>Which configuration has the problem?<select value={savedId} disabled={disabled} onChange={event => onChange({ ...value, saved: event.target.value })}>
      {saved.map(item => <option key={item.id} value={item.id}>{item.name}{item.id === workspace.activeId ? ' (active)' : ''} · {count(item.modules)}</option>)}
      <option value="">Not saved here: pick the modules</option>
    </select></label>}
    {resolved.source === 'saved' ? <p className="service-note">Attached privately: configuration <strong>{resolved.name}</strong>{os ? ', base OS ' + os : ''}, {count(resolved.modules)}{resolved.build ? ', build fingerprint' : ''}.</p> : <>
      {saved.length === 0 && <p className="service-note">No configuration with modules is saved in this browser. Add the modules your {device} runs{machine === 'octatrack' ? ', or attach OCTAMOD.LOG, which records them exactly' : ''}.</p>}
      {chosen.length > 0 && <ul className="issue-report-chips" aria-label="Modules in the configuration">
        {chosen.map(module => <li key={module.moduleId}>{module.name} <span>{module.version}</span><button type="button" disabled={disabled} aria-label={'Remove ' + module.name} onClick={() => remove(module.moduleId)}>×</button></li>)}
      </ul>}
      <div className="issue-report-add">
        <label htmlFor={searchId} className="sr-only">Add a module</label>
        <input id={searchId} type="search" value={query} disabled={disabled} placeholder={'Add a module… (' + candidates.length + ' more)'} autoComplete="off" onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (needle && matches[0]) add(matches[0].moduleId) } }} />
        {needle && <div className="issue-report-matches" role="group" aria-label="Matching modules">
          {matches.map(module => <button key={module.moduleId} type="button" disabled={disabled} onClick={() => add(module.moduleId)}>+ {module.name} <span>{module.version}</span></button>)}
          {!matches.length && <p className="service-note">No module matches “{query.trim()}”.</p>}
          {candidates.length > matches.length && <p className="service-note">{candidates.length - matches.length} more match; keep typing.</p>}
        </div>}
      </div>
      {machine === 'octatrack' && DSP_LOADER && <label className="issue-report-escape"><input type="checkbox" checked={value.keepStockFx2} disabled={disabled} onChange={event => onChange({ ...value, keepStockFx2: event.target.checked })} />Stock FX2 effects kept</label>}
      {resolved.source === 'none' && <p className="service-note">Add at least one module. Versions are the current catalog versions; the log is exact.</p>}
    </>}
    {missing && <p className="file-error">This module is not in that configuration. Choose the configuration you flashed, or pick the modules yourself.</p>}
  </div>
}
