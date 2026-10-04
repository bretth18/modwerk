import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'
import { moduleBuildPending } from '../catalog/build-support'
import { DETAILS } from '../catalog/details'
import type { FirmwareModule } from '../catalog/modules'
import type { ModuleStatistics } from '../community/module-statistics'
import { ModulePopularity } from '../community/ModulePopularity'
import { moduleHref } from '../routing'
import { Icon } from './Icon'
import { ModulePreview } from './ModulePreview'
import { ModuleRelease } from './ModuleRelease'

export type ModuleCardProps = {
  module: FirmwareModule
  selected: boolean
  statistics?: ModuleStatistics
  viewedVersion?: string
  baseline: readonly string[] | null
  compared: boolean
  canCompare: boolean
  onToggle: () => void
  onCompare: () => void
}

export function ModuleCard({ module, selected, statistics: stats, viewedVersion, baseline, compared, canCompare, onToggle, onCompare }: ModuleCardProps) {
  const record = MODULE_DOCUMENTS_BY_ID[module.id]
  return <article className={'module-card ' + (selected ? 'is-selected' : '')}>
    <a href={moduleHref(module.id)} className="module-cover" aria-label={'View ' + module.name}>
      <ModulePreview id={module.id} />
      <div className="hover-info"><span>{module.description}</span><strong>Explore module <Icon name="arrow" size={15} /></strong></div>
      {selected && <span className="selected-badge" aria-label="Selected"><Icon name="check" size={12} /></span>}
    </a>
    <div className="module-card-body">
      <div className="module-card-title">
        <div className="module-card-heading"><a href={moduleHref(module.id)}>{module.name}</a><ModuleRelease module={module} viewedVersion={viewedVersion} baseline={baseline} /></div>
        <button className={'add-button ' + (selected ? 'is-added' : '')} aria-label={(selected ? 'Remove ' : 'Add ') + module.name + (selected ? ' from configuration' : ' to configuration')} aria-pressed={selected} onClick={onToggle}><Icon name={selected ? 'check' : 'plus'} size={15} /><span>{selected ? 'Added' : 'Add'}</span></button>
      </div>
      <div className="card-credit"><a href={module.authorUrl} target="_blank" rel="noreferrer">{module.authorName}</a><span>{module.detail}</span></div>
      <div className="card-description">{module.description}</div>
      <div className="card-bottom"><span>{DETAILS[module.id].family}</span><span className="unrated"><Icon name="star" size={11} />{stats?.count&&stats.average!==null?stats.average.toFixed(1)+' ('+stats.count+')':'Unrated'}</span></div>
      <ModulePopularity statistics={stats}/>
      <div className="card-proof">
        <span>{moduleBuildPending(module.id)?'Build verification pending':record.tests.hardwareStatus==='reported'?'Hardware test reported':record.tests.hardwareStatus!=='untested'?'Earlier hardware evidence':'Emulator evidence'}</span>
        <label><input type="checkbox" checked={compared} disabled={!canCompare} onChange={onCompare}/>Compare<span className="sr-only"> {module.name}</span></label>
      </div>
    </div>
  </article>
}
