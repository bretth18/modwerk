import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'
import { assetUrl } from '../hosting'

export function ModuleAccess({ id, showScreenshots = true }: { id: string; showScreenshots?: boolean }) {
  const document = MODULE_DOCUMENTS_BY_ID[id], access = document.access
  if (!access) return null
  const documentation = document.tests.retainedEvidence?.documentation ?? document.tests.qualification?.documentation ?? document.tests.releaseWaiver?.documentation
  const screenshots = document.media.filter(item => access.screenshots.includes(item.path) || documentation?.screenshots.includes(item.path))
  return <section className="detail-section module-access">
    <h2>Find it on your Octatrack</h2>
    <p>{access.location}</p>
    <ol>{access.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
    {documentation && <><h3>{documentation.tutorial.title}</h3><ol>{documentation.tutorial.steps.map((step,index)=><li key={index}>{step}</li>)}</ol></>}
    {showScreenshots && <div className="media-gallery">{screenshots.map(item => {
      const url = assetUrl('module-media/' + id + '/' + document.version + '/' + item.path)
      return <figure key={item.path}>
        <a href={url} target="_blank" rel="noreferrer"><img className={item.otUi ? 'ot-ui-capture' : undefined} src={url} alt={item.alt} loading="lazy" /></a>
        <figcaption>{item.caption}<span>{item.captureType === 'hardware' ? 'Hardware capture' : 'Emulator capture'} · {item.credit} · {item.license}</span>{item.source !== 'original' && <a href={item.source} target="_blank" rel="noreferrer">Original source ↗</a>}</figcaption>
      </figure>
    })}</div>}
  </section>
}
