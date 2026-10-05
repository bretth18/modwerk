import { assetUrl } from '../hosting'
import { ModuleControls } from './ModuleControls'
import { IssueReport } from '../community/IssueReport'
import type { FirmwareModule } from '../catalog/modules'
import { getModuleSource } from '../catalog/modules'
import { DETAILS } from '../catalog/details'
import { Icon } from './Icon'
import { ModulePreview } from './ModulePreview'
import { ModuleResources } from './ModuleResources'
import { ModuleResourceIndicators } from './ModuleResourceIndicators'
import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'
import { ModuleDetailLayout } from './ModuleDetailLayout'

export function ModuleDetail({ module, selected, onToggle }: { module: FirmwareModule; selected: boolean; onToggle: () => void }) {
  const details = DETAILS[module.id]
  const moduleDocument = MODULE_DOCUMENTS_BY_ID[module.id]
  return <ModuleDetailLayout id={module.id} title={module.name} family={details.family} detail={module.detail}
    author={module.authorName} authorUrl={module.authorUrl} description={module.description}
    selected={selected} onToggle={onToggle} backHref="#library" backLabel="All modules"
    preview={<ModulePreview id={module.id} />} resources={<ModuleResourceIndicators id={module.id} />}
    notice={moduleDocument.build && <p className="service-note" role="status">{moduleDocument.build.reason}</p>}
    guide={<>
      <details className="module-disclosure">
        <summary><span>About & credits</span><Icon name="plus" size={16} /></summary>
        <div className="disclosure-content">
          <div className="overview-grid">
            <section className="detail-section"><h2>About this module</h2><p>{details.overview}</p><ul className="feature-list">{details.highlights.map(item => <li key={item}><Icon name="check" size={15} />{item}</li>)}</ul></section>
            <aside className="info-panel"><h2>Module information</h2><dl><div><dt>Author</dt><dd><a href={module.authorUrl} target="_blank" rel="noreferrer">{module.authorName} ↗</a></dd></div><div><dt>Location</dt><dd>{module.detail}</dd></div><div><dt>Base firmware</dt><dd>OS 1.40C</dd></div><div><dt>Module version</dt><dd>{module.version}</dd></div><div><dt>Licence</dt><dd><a href={assetUrl('licenses/THIRD_PARTY_NOTICES.html')} target="_blank" rel="noreferrer">{moduleDocument.license.spdx}</a></dd></div><div><dt>Catalog</dt><dd>Experimental</dd></div></dl><a className="source-link" href={getModuleSource(module)} target="_blank" rel="noreferrer">Module source <Icon name="arrow" size={14} /></a></aside>
          </div>
          <section className="detail-section"><h2>Credits</h2><ul>{moduleDocument.author.credits.map(credit => <li key={credit}>{credit}</li>)}</ul></section>
        </div>
      </details>
      <ModuleControls id={module.id} />
      <ModuleResources id={module.id} />
    </>}
    issueReport={openRequest => <IssueReport id={module.id} author={module.author} openRequest={openRequest} />}
  />
}
