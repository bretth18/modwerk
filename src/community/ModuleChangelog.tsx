import { useEffect, useState } from 'react'
import { api } from './api'
import { communityModule } from './modules'
import { issueRepository } from './report-context'

type Release = { version: string; previousVersion: string | null; recordedAt: string }

export function ModuleChangelog({ id }: { id: string }) {
  const module = communityModule(id)
  const [releases, setReleases] = useState<Release[] | null>(null), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    void api<{ releases: Release[] }>('/modules/' + id + '/changelog').then(value => { if (!cancelled) { setReleases(value.releases); setError('') } }).catch(error => { if (!cancelled) setError(error.message) })
    return () => { cancelled = true }
  }, [id, revision])
  const historyUrl = module ? issueRepository() + '/commits/main/' + module.sourcePath : undefined
  return <section className="detail-section module-changelog">
    <div className="section-title"><h2>Changelog</h2>{module && <span className="pill">v{module.version}</span>}</div>
    <p className="service-note">Downloads follow future updates automatically. Use the update button above to unfollow; later downloads keep your choice.</p>
    {error ? <><p className="file-error" role="alert">The changelog could not load. {error}</p><button className="button button-quiet" onClick={() => { setError(''); setRevision(value => value + 1) }}>Try again</button></> : releases === null ? <p role="status">Loading changelog…</p> : releases.length ? <ol className="module-release-list">{releases.map(release => <li key={release.version}>
      <h3>v{release.version}{release.version === module?.version && <span className="pill">Current version</span>}</h3>
      <p>{release.previousVersion ? 'Updated from v' + release.previousVersion + '.' : 'First version recorded in this changelog.'}</p>
    </li>)}</ol> : <p className="service-note">No release history has been recorded yet.</p>}
    <p className="service-note">History starts with the first recorded catalog version. {historyUrl && <a href={historyUrl} target="_blank" rel="noreferrer">View source changes on GitHub ↗</a>}</p>
  </section>
}
