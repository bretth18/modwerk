import { BackLink } from '../components/BackLink'
import { useEffect, useState } from 'react'
import { api, post } from './api'
import { CreatorSupport } from './CreatorSupport'
import { sourceRepository } from '../hosting'
import type { CommunityModule } from './modules'
import { DEVICES_BY_ID } from '../devices/registry'
import { PrivateIssueDetail } from './PrivateIssueDetail'
import { useCommunity } from './context'
import { AccountPage } from './AccountPage'

type Module = CommunityModule & { claimed: boolean; blocked: boolean }
export function DeveloperPage({ route }: { route: string }) {
  const { developer: session, refreshDeveloper } = useCommunity()
  const [modules, setModules] = useState<Module[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0)
  const complete = route.startsWith('developer/complete'), reportId = route.startsWith('developer/report/') ? route.split('/')[2] : ''
  useEffect(() => {
    if (!session?.user || complete) return
    let cancelled = false
    void api<Module[]>('/developer/modules').then(items => { if (!cancelled) setModules(items) }).catch(error => { if (!cancelled) { setError(error.message); void refreshDeveloper() } })
    return () => { cancelled = true }
  }, [session?.user, complete, revision, refreshDeveloper])
  async function act(action: () => Promise<unknown>) {
    setBusy(true); setError('')
    try { await action(); await refreshDeveloper(); setRevision(value => value + 1) }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to update creator settings.') }
    finally { setBusy(false) }
  }
  if (!session?.user || complete) return <AccountPage route={complete ? 'account/' + route : 'account/developer'}/>
  const repository = sourceRepository() || 'https://github.com/repeat98/modwerk'
  return <div className="community-page developer-page"><BackLink href="#account/developer">Your account</BackLink>
    <div className="page-heading"><div><p className="page-kicker">MODWERK / CREATORS</p><h1>Creator settings</h1><p>Claim your modules and manage your support links. Development and public reports are handled on GitHub.</p></div><button className="button button-quiet" disabled={busy} onClick={() => void act(() => api('/developer/auth/session', { method: 'DELETE' }))}>Sign out @{session.user.login}</button></div>
    {error && <p className="file-error" role="alert">{error}</p>}
    {reportId ? <PrivateIssueDetail key={reportId} id={reportId} back="#developer"/> : <>
      <section className="configuration-section"><h2>Developer work on GitHub</h2><p>Reply to reports on GitHub. Use <code>/modwerk close configuration &lt;explanation&gt;</code> or <code>/modwerk reopen &lt;explanation&gt;</code> to manage reports for your modules. No fork, website claim or repository write access is needed for public replies and these registered-author actions.</p><p>For firmware fixes, verify the published download on your unit, then post <code>/modwerk resolve &lt;version&gt; verified-download</code> on the issue. A merged PR starts publication; it does not resolve the report.</p><div className="forum-actions"><a href={repository + '/issues'} target="_blank" rel="noreferrer">GitHub reports ↗</a><a href={repository + '/blob/main/docs/MODULE_AUTHOR_UPDATES.md'} target="_blank" rel="noreferrer">Author release steps ↗</a></div></section>
      <section className="configuration-section"><h2>Your modules</h2>{!modules.length ? <p className="service-note">No reviewed module lists @{session.user.login} as a maintainer yet.</p> : <div className="developer-module-grid">{modules.map(module => <article className="inbox-issue" key={module.id}><div className="section-title"><h3><a href={module.href}>{module.name}</a></h3><span className="pill">{DEVICES_BY_ID[module.machine].name}</span></div>
        {!module.claimed ? <button className="button button-primary" disabled={busy || module.blocked} onClick={() => void act(() => post('/developer/modules/' + module.id + '/claim', {}))}>{module.blocked ? 'Access revoked — contact administrator' : 'Claim module'}</button> : <CreatorSupport id={module.id} editor/>}
        <div className="forum-actions"><a href={repository + '/issues?q=' + encodeURIComponent('is:issue label:"module:' + module.id + '"')} target="_blank" rel="noreferrer">Module reports on GitHub ↗</a><a href={repository + '/tree/main/' + module.sourcePath} target="_blank" rel="noreferrer">Source & documentation ↗</a></div>
      </article>)}</div>}<p className="service-note">Claims enable support links and access to privately shared configurations and logs. Open private details using the link in the GitHub report.</p></section>
    </>}
  </div>
}
