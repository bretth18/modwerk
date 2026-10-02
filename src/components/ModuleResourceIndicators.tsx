import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'
import { moduleResourceIndicators } from '../catalog/resource-indicators'
import { resourceSource } from '../catalog/resources'
import { Icon } from './Icon'

export function ModuleResourceIndicators({ id }: { id: string }) {
  const document = MODULE_DOCUMENTS_BY_ID[id]
  const indicators = moduleResourceIndicators(document)
  return <aside className="module-resource-summary" aria-label="Module resource usage">
    <h2>Estimated load</h2>
    <dl className="module-resource-gauges">
      {indicators.map(indicator => <div className={'resource-gauge resource-gauge-' + indicator.id} key={indicator.id}>
        <dt>{indicator.label}</dt>
        <dd>
          <div className="resource-gauge-dial" role="meter"
            aria-label={indicator.label + ' relative load'}
            aria-valuemin={0} aria-valuemax={4} aria-valuenow={indicator.score}
            aria-valuetext={indicator.value + ' · ' + indicator.status.toLowerCase() + ' relative load'}>
            <svg viewBox="0 0 96 54" fill="none" aria-hidden="true">
              <path className="resource-gauge-track" d="M 8 48 A 40 40 0 0 1 88 48" pathLength="100" />
              <path className="resource-gauge-fill" d="M 8 48 A 40 40 0 0 1 88 48" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - indicator.fill} />
            </svg>
            <strong aria-hidden="true">{indicator.value}</strong>
          </div>
          <span className="resource-gauge-status">{indicator.status}</span>
        </dd>
      </div>)}
    </dl>
    <details className="module-resource-evidence">
      <summary>How we rate load <Icon name="plus" size={12} /></summary>
      <div className="resource-evidence-panel" role="region" aria-label="Resource estimate records" tabIndex={0}>
        <h3>Relative load estimates</h3>
        <p className="resource-evidence-date">v{document.version} · {document.resources.recorded}</p>
        <p>Minimal → Low → Moderate → High. The arcs show rough relative demand. Load depends on your configuration, settings and active tracks; the gauges do not measure available headroom.</p>
        <p>{document.resources.impact?.conditions}</p>
        <dl>{indicators.map(indicator => <div key={indicator.id}>
          <dt>{indicator.label} <span>{indicator.status}</span></dt>
          <dd>{indicator.description} <a href={resourceSource(id, indicator.source)} target="_blank" rel="noreferrer">Read record ↗</a></dd>
        </div>)}</dl>
      </div>
    </details>
  </aside>
}
