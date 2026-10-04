import { useEffect, useRef, useState } from 'react'
import { api, post } from './api'
import { useCommunity } from './context'
import { AccountAccess } from './AccountAccess'
type Report = { id: string; module_id: string; author_login: string; title: string; body: string; status: string; created_at: string; github_url: string | null }
export function ActivityPage() {
  const { session, refresh } = useCommunity()
  const [reports, setReports] = useState<Report[]>([]), [reportsOwner, setReportsOwner] = useState('')
  const [error, setError] = useState(''), [message, setMessage] = useState<{ userId: string; text: string } | null>(null), [busy, setBusy] = useState(false)
  const [challenge, setChallenge] = useState(''), [code, setCode] = useState(''), [confirming, setConfirming] = useState(false)
  const codeInput = useRef<HTMLInputElement>(null)
  const user = session.user, userId = user?.id
  useEffect(() => { if (challenge) codeInput.current?.focus() }, [challenge])
  useEffect(() => {
    let cancelled = false
    if (userId) void api<Report[]>('/issues/mine').then(items => { if (!cancelled) { setReports(items); setReportsOwner(userId) } }).catch(error => { if (!cancelled) setError(error.message) })
    return () => { cancelled = true }
  }, [userId])
  async function action(kind: 'logout' | 'newsletter' | 'delete-code' | 'delete', newsletter?: boolean) {
    setBusy(true); setError(''); setMessage(null)
    try {
      if (kind === 'logout') { await post('/auth/logout', {}); setChallenge(''); setConfirming(false); await refresh(); setMessage({ userId: '', text: 'Signed out on this device.' }) }
      if (kind === 'newsletter') { await post('/auth/account', { newsletter }, 'PATCH'); await refresh(); setMessage({ userId: user?.id ?? '', text: newsletter ? 'News emails enabled.' : 'Unsubscribed from news emails.' }) }
      if (kind === 'delete-code') { const result = await post<{ challengeId: string }>('/auth/code', { purpose: 'delete' }); setChallenge(result.challengeId); setCode('') }
      if (kind === 'delete') { await post('/auth/account', { challengeId: challenge, code, confirmation: 'DELETE' }, 'DELETE'); setConfirming(false); setChallenge(''); setReports([]); await refresh(); setMessage({ userId: '', text: 'Your account and its stored community data have been deleted. All devices are signed out.' }) }
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to complete this action.') }
    finally { setBusy(false) }
  }
  return <div className="community-page"><div className="page-heading"><div><p className="page-kicker">OCTAMOD / COMMUNITY</p><h1>Your account & activity</h1><p>Manage your account, email preferences and issue reports.</p></div>{user && <button className="button button-quiet" disabled={busy} onClick={() => void action('logout')}>Sign out</button>}</div>
    {!user ? <AccountAccess/> : <>
      <section className="configuration-section"><h2>{user.displayName}</h2><p>{user.email} · Verified email</p><label className="account-consent"><input type="checkbox" checked={user.newsletter} disabled={busy} onChange={event => void action('newsletter', event.target.checked)}/><span>Email me Octamod news and updates (optional). Untick to unsubscribe.</span></label><p className="service-note">Verification emails are required to sign in. News emails are a separate choice.</p></section>
      <section className="configuration-section"><div className="section-title"><h2>Your issue reports</h2></div>{reportsOwner !== user.id ? <p role="status">Loading reports…</p> : reports.length ? reports.map(item => <article className="inbox-issue" key={item.id}><div className="section-title"><h3>{item.title}</h3><span className="pill">{item.status === 'open' ? 'Open' : 'Resolved'}</span></div><small>{item.module_id} · for @{item.author_login}{item.github_url && <> · <a href={item.github_url} target="_blank" rel="noreferrer">Follow on GitHub ↗</a></>}</small><p className="preserve-lines">{item.body}</p></article>) : <p className="service-note">No reports yet. Use “Report an issue” on a module page.</p>}</section>
      <section className="configuration-section"><h2>Delete account</h2><p className="service-note">Deletion removes your email, news preference, comments, ratings, likes and reports stored by Octamod, and signs out every device. Public GitHub issues and original module source attribution remain. Configurations and firmware saved on your device are kept; remove them on the configuration page.</p>{!confirming ? <button className="button button-quiet" disabled={busy} onClick={() => setConfirming(true)}>Delete my account</button> : <div className="admin-withdraw"><h3>Permanently delete your account?</h3><p>Confirm with a fresh code sent to your verified email. This cannot be undone.</p>{challenge ? <form className="community-form" onSubmit={event => { event.preventDefault(); void action('delete') }}><label>Deletion code<input ref={codeInput} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" required maxLength={8} value={code} disabled={busy} onChange={event => setCode(event.target.value.replace(/[^0-9]/g, ''))}/></label><button className="button button-primary" disabled={busy || code.length !== 8}>{busy ? 'Deleting…' : 'Permanently delete account'}</button><button className="text-button" type="button" disabled={busy} onClick={() => void action('delete-code')}>Request a new deletion code</button></form> : <button className="button button-primary" disabled={busy} onClick={() => void action('delete-code')}>{busy ? 'Sending…' : 'Send deletion code'}</button>}<button className="button button-quiet" disabled={busy} onClick={() => { setConfirming(false); setChallenge(''); setCode(''); setError('') }}>Cancel</button></div>}</section>
    </>}
    <section className="configuration-section"><h2>Contributing modules</h2><p className="service-note">New modules, updates, documentation and media go through GitHub pull requests.</p><a className="text-button" href="#submit">Module contribution guide →</a></section>
    {message?.userId === (user?.id ?? '') && <p className="success-note" role="status">{message.text}</p>}{error && <p className="file-error" role="alert">{error}</p>}
  </div>
}
