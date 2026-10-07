import { useEffect, useState } from 'react'
import { api } from './api'
import { communityModule } from './modules'
import { issueRepository } from './report-context'
import { mergeModuleReleases, moduleChangelogs } from './module-changelogs'
import type { RecordedRelease } from './module-changelogs'

export function ModuleChangelog({ id }: { id: string }) {
  const module = communityModule(id)
  const [recorded, setRecorded] = useState<{ id: string; releases: RecordedRelease[] } | null>(null), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    void api<{ releases: RecordedRelease[] }>('/modules/' + id + '/changelog').then(value => { if (!cancelled) { setRecorded({ id, releases: value.releases }); setError('') } }).catch(error => { if (!cancelled) setError(error.message) })
    return () => { cancelled = true }
  }, [id, revision])
  const releases = mergeModuleReleases(moduleChangelogs[id] ?? [], recorded?.id === id ? recorded.releases : [])
  const historyUrl = module ? issueRepository() + '/commits/main/' + module.sourcePath : undefined
  return <section className="detail-section module-changelog">
    <div className="section-title"><h2>Changelog</h2>{module && <span className="pill">v{module.version}</span>}</div>
    <p className="service-note">Downloads follow future updates automatically. Use the update button above to unfollow; later downloads keep your choice.</p>
    {error && <p className="service-note">Live version history is unavailable.{releases.length > 0 && ' Showing the release notes included with this site.'} <button className="text-button" onClick={() => { setError(''); setRevision(value => value + 1) }}>Try again</button></p>}
    {releases.length ? <ol className="module-release-list">{releases.map(release => <li key={release.version}>
      <h3>v{release.version}{release.version === module?.version && <span className="pill">Current version</span>}</h3>
      {release.notes ? <>
        <p>Source update: <time dateTime={release.notes.date}>{release.notes.date}</time>{release.notes.sourceCommit && <> · <a href={issueRepository() + '/commit/' + release.notes.sourceCommit} target="_blank" rel="noreferrer">View changes ↗</a></>}</p>
        <ul className="module-release-notes">{release.notes.changes.map(change => <li key={change}>{change}</li>)}</ul>
      </> : <p>Written release notes are not available for this recorded version.{release.previousVersion && ' Updated from v' + release.previousVersion + '.'}</p>}
    </li>)}</ol> : recorded?.id !== id && !error ? <p role="status">Loading changelog…</p> : <p className="service-note">No release history has been recorded yet.</p>}
    <p className="service-note">Release notes cover versions recorded in this repository; dates refer to source updates. {historyUrl && <a href={historyUrl} target="_blank" rel="noreferrer">View source history on GitHub ↗</a>}</p>
  </section>
}
