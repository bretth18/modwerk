import { assetUrl } from '../hosting'
import { ModuleControls } from './ModuleControls'
import { IssueReport } from '../community/IssueReport'
import { ModuleCommunity } from '../community/ModuleCommunity'
import { useState } from 'react'
import type { FirmwareModule } from '../catalog/modules'
import { getModuleSource } from '../catalog/modules'
import { DETAILS } from '../catalog/details'
import { Icon } from './Icon'
import { ModulePreview } from './ModulePreview'
import { ModuleResources } from './ModuleResources'
import { ModuleResourceIndicators } from './ModuleResourceIndicators'
import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'

type DetailTab = 'Overview' | 'Media' | 'Discussion'
export function ModuleDetail({ module, selected, onToggle }: { module: FirmwareModule; selected: boolean; onToggle: () => void }) {
  const [tab, setTab] = useState<DetailTab>('Overview')
  const [issueOpenRequest, setIssueOpenRequest] = useState(0)
  const details = DETAILS[module.id]
  const moduleDocument = MODULE_DOCUMENTS_BY_ID[module.id]
  function showDiscussion() {
    setTab('Discussion')
    document.getElementById('tab-Discussion')?.focus()
  }
  return (
    <div className="detail-page">
      <div className="module-page-actions">
        <a className="back-link" href="#library"><Icon name="back" size={15} /> All modules</a>
        <button type="button" className="button button-quiet module-issue-action" onClick={() => { setTab('Overview'); setIssueOpenRequest(request => request + 1) }}><Icon name="message" size={15} />Report an issue</button>
      </div>
      <section className="detail-hero detail-hero-with-resources" aria-labelledby="module-title">
        <ModulePreview id={module.id} />
        <div className="detail-intro">
          <div className="detail-tags"><span className="pill">{details.family}</span><span className="subtle">{module.detail}</span></div>
          <h1 id="module-title">{module.name}</h1>
          <a className="author-link" href={module.authorUrl} target="_blank" rel="noreferrer">by {module.authorName} ↗</a>
          <p>{module.description}</p>
          {moduleDocument.build && <p className="service-note" role="status">{moduleDocument.build.reason}</p>}
          <div className="detail-rating"><button className="text-button" onClick={showDiscussion}>Reviews & discussion</button></div>
          <button className={'button ' + (selected ? 'button-added' : 'button-primary')} onClick={onToggle} aria-pressed={selected}><Icon name={selected ? 'check' : 'plus'} size={16} />{selected ? 'Added to configuration' : 'Add to configuration'}</button>
        </div>
        <ModuleResourceIndicators id={module.id} />
      </section>
      <div className="detail-tabs" role="tablist" aria-label="Module information">
        {(['Overview', 'Media', 'Discussion'] as const).map((value) => <button key={value} role="tab" id={'tab-' + value} aria-selected={tab === value} aria-controls="detail-content" tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={(event) => {
          const tabs: DetailTab[] = ['Overview', 'Media', 'Discussion']
          let next: DetailTab | undefined
          if (event.key === 'ArrowRight') next = tabs[(tabs.indexOf(value) + 1) % tabs.length]
          if (event.key === 'ArrowLeft') next = tabs[(tabs.indexOf(value) + 2) % tabs.length]
          if (event.key === 'Home') next = tabs[0]
          if (event.key === 'End') next = tabs[2]
          if (next) { event.preventDefault(); setTab(next); document.getElementById('tab-' + next)?.focus() }
        }}>{value}</button>)}
      </div>
      <div id="detail-content" role="tabpanel" aria-labelledby={'tab-' + tab} tabIndex={0}>
        {tab === 'Overview' && <>
          <ModuleCommunity id={module.id} mode="overview" onDiscuss={showDiscussion} />
          <div className="module-guide">
            <details className="module-disclosure">
              <summary><span>About & credits</span><Icon name="plus" size={16} /></summary>
              <div className="disclosure-content">
                <div className="overview-grid">
                  <section className="detail-section"><h2>About this module</h2><p>{details.overview}</p><ul className="feature-list">{details.highlights.map((item) => <li key={item}><Icon name="check" size={15} />{item}</li>)}</ul></section>
                  <aside className="info-panel"><h2>Module information</h2><dl><div><dt>Author</dt><dd><a href={module.authorUrl} target="_blank" rel="noreferrer">{module.authorName} ↗</a></dd></div><div><dt>Location</dt><dd>{module.detail}</dd></div><div><dt>Base firmware</dt><dd>OS 1.40C</dd></div><div><dt>Module version</dt><dd>{module.version}</dd></div><div><dt>Licence</dt><dd><a href={assetUrl('licenses/THIRD_PARTY_NOTICES.html')} target="_blank" rel="noreferrer">{moduleDocument.license.spdx}</a></dd></div><div><dt>Catalog</dt><dd>Experimental</dd></div></dl><a className="source-link" href={getModuleSource(module)} target="_blank" rel="noreferrer">Module source <Icon name="arrow" size={14} /></a></aside>
                </div>
                <section className="detail-section"><h2>Credits</h2><ul>{moduleDocument.author.credits.map(credit=><li key={credit}>{credit}</li>)}</ul></section>
              </div>
            </details>
            <ModuleControls id={module.id}/>
            <ModuleResources id={module.id} />
          </div>
          <IssueReport id={module.id} author={module.author} openRequest={issueOpenRequest} />
        </>}
        {tab === 'Media' && <ModuleCommunity id={module.id} mode="media" />}
        {tab === 'Discussion' && <ModuleCommunity id={module.id} mode="discussion" />}
      </div>
    </div>
  )
}
