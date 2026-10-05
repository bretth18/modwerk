import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'
import { moduleResourceIndicators } from '../catalog/resource-indicators'
import { resourceSource } from '../catalog/resources'
import { ModuleResourceSummary } from './ModuleResourceSummary'

export function ModuleResourceIndicators({ id }: { id: string }) {
  const document = MODULE_DOCUMENTS_BY_ID[id]
  const indicators = moduleResourceIndicators(document)
  return <ModuleResourceSummary indicators={indicators} evidence={<>
    <h3>Relative load estimates</h3>
    <p className="resource-evidence-date">v{document.version} · {document.resources.recorded}</p>
    <p>Minimal → Low → Moderate → High. The arcs show rough relative demand. Load depends on your configuration, settings and active tracks; the gauges do not measure available headroom.</p>
    <p>{document.resources.impact?.conditions}</p>
    <dl>{indicators.map(indicator => <div key={indicator.id}>
      <dt>{indicator.label} <span>{indicator.status}</span></dt>
      <dd>{indicator.description} <a href={resourceSource(id, indicator.source)} target="_blank" rel="noreferrer">Read record ↗</a></dd>
    </div>)}</dl>
  </>} />
}
