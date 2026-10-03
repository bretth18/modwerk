import { useEffect, useState } from 'react'
import { api, apiFetch, post } from './api'
import { FLASH_STATES, LOG_MISSING_REASONS, OT_MODELS } from './issue-context'
import type { IssueContext, LogMissingReason } from './issue-context'
import { describeOtLog } from './ot-log'
import type { OtLogSummary } from './ot-log'
type Issue = {
  id: string; module_id: string; author_login: string; title: string; body: string; status: string; reporter: string
  context: IssueContext | null; log: OtLogSummary | null; log_missing: LogMissingReason | null; log_missing_note: string
  github_state: 'none' | 'pending' | 'syncing' | 'synced' | 'failed'; github_url: string | null; github_error: string
}
export function IssueInbox() {
  const [items, setItems] = useState<Issue[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState('')
  useEffect(() => { let cancelled = false; void api<Issue[]>('/admin/issues').then(items => { if (!cancelled) setItems(items) }).catch(error => { if (!cancelled) setError(error.message) }).finally(() => { if (!cancelled) setLoading(false) }); return () => { cancelled = true } }, [])
  async function act(item: Issue, action: () => Promise<unknown>, failure: string) { setBusy(item.id); setError(''); try { await action(); setItems(await api<Issue[]>('/admin/issues')) } catch (error) { setError(error instanceof Error ? error.message : failure) } finally { setBusy('') } }
  const resolve = (item: Issue) => act(item, () => post('/admin/issues/' + item.id, { status: item.status === 'open' ? 'closed' : 'open' }, 'PATCH'), 'Unable to update issue.')
  const mirror = (item: Issue) => act(item, async () => { const result = await post<{ state: string; error?: string }>('/admin/issues/' + item.id + '/github', {}); if (result.state === 'failed') throw new Error(result.error ?? 'GitHub mirroring failed.') }, 'Unable to mirror issue.')
  async function download(item: Issue) {
    setError('')
    try {
      // The admin session travels in a header, so fetch the log rather than linking to it.
      const result = await apiFetch('/admin/issues/' + item.id + '/log')
      if (!result.ok) throw new Error('The log could not be downloaded.')
      const link = document.createElement('a'), url = URL.createObjectURL(await result.blob())
      link.href = url; link.download = 'OCTAMOD-' + item.module_id + '-' + item.id.slice(0, 8) + '.LOG'; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setError(error instanceof Error ? error.message : 'The log could not be downloaded.') }
  }
  return <section className="configuration-section"><div className="section-title"><h2>Author-directed issues</h2><span className="pill">{items.filter(item => item.status === 'open').length} open</span></div>
    <p className="service-note">With GitHub mirroring configured, every report also opens a public issue labelled <code>module:&lt;id&gt;</code> that mentions the module author. Closing it on GitHub or here updates the reporter’s status. Reports that failed to mirror can be retried.</p>
    {loading ? <p role="status">Loading reports…</p> : items.length ? items.map(item => <article className="inbox-issue" key={item.id}>
      <div className="section-title"><h3>{item.title}</h3><span className="pill">{item.status}</span></div>
      <small>{item.module_id} · from {item.reporter} · for @{item.author_login}</small>
      <p className="preserve-lines">{item.body}</p>
      <dl>
        {item.context && <><dt>Device</dt><dd>{OT_MODELS[item.context.model]} · {FLASH_STATES[item.context.flash]} · OS {item.context.os}</dd>
          <dt>Modules</dt><dd>{item.context.modules.length ? item.context.modules.map(module => module.id + ' ' + module.version).join(', ') : 'none selected'}</dd>
          <dt>Build</dt><dd>{item.context.build ? <code>{item.context.build}</code> : 'not built in the reporter’s browser'}</dd></>}
        <dt>Log</dt><dd>{item.log ? describeOtLog(item.log) : item.log_missing ? 'Not attached: ' + LOG_MISSING_REASONS[item.log_missing] + (item.log_missing_note ? ' — ' + item.log_missing_note : '') : 'Not attached (report predates logs)'}</dd>
        <dt>GitHub</dt><dd>{item.github_url ? <a href={item.github_url} target="_blank" rel="noreferrer">{item.github_url.replace('https://github.com/', '')} ↗</a> : item.github_state === 'none' ? 'Not mirrored' : item.github_state === 'failed' ? 'Failed: ' + item.github_error : 'Mirroring…'}</dd>
      </dl>
      <div className="inbox-actions">
        <button className="text-button" disabled={busy === item.id} onClick={() => void resolve(item)}>{busy === item.id ? 'Saving…' : item.status === 'open' ? 'Mark resolved' : 'Reopen'}</button>
        {item.log && <button className="text-button" onClick={() => void download(item)}>Download log</button>}
        {item.github_state !== 'synced' && <button className="text-button" disabled={busy === item.id} onClick={() => void mirror(item)}>{item.github_state === 'none' ? 'Mirror to GitHub' : 'Retry GitHub'}</button>}
      </div>
    </article>) : !error && <p className="service-note">No reports yet.</p>}{error && <p className="file-error" role="alert">{error}</p>}</section>
}
