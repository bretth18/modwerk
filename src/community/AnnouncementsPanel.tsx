import { useEffect, useState } from 'react'
import { api, post } from './api'
import { COMMUNITY_MODULES } from './modules'
import { ForumAvatar } from './ForumIdentity'
import { SUPPORT_URL } from '../config/support'

type Sent = { id: string; slug: string; title: string; body: string; url: string | null; module_id: string | null; created_at: string; reads: number; audience: number }
const errorText = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.'
const BODY_LIMIT = 400
/** The key makes a send idempotent; this proposes one from the title and today's date. */
const keyFrom = (title: string) => (title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) + '-' + new Date().toISOString().slice(0, 10)).replace(/^-+/, '')
const sentAt = (value: string) => new Date(value.replace(' ', 'T') + 'Z').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
/** Where a bell entry leads, in the words the operator would use: the bell opens the link, else the module page, else the library. */
function destination(url: string | null, moduleId: string | null) {
  if (url === SUPPORT_URL) return 'Ko-fi'
  if (url) return url.replace(/^https:\/\//, '')
  if (moduleId) return (COMMUNITY_MODULES.find(module => module.id === moduleId)?.name ?? moduleId) + ' page'
  return 'Library'
}

/** Admin workspace: send one announcement to every member's bell, see how many have read it, or take it back. Never mailed. */
export function AnnouncementsPanel() {
  const [items, setItems] = useState<Sent[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState('')
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [moduleId, setModuleId] = useState(''), [url, setUrl] = useState(''), [slug, setSlug] = useState(''), [slugEdited, setSlugEdited] = useState(false)
  const load = () => api<Sent[]>('/admin/announcements').then(setItems).catch(error => setError(errorText(error))).finally(() => setLoading(false))
  useEffect(() => { void load() }, [])
  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (!window.confirm('Send this to the bell of every member? It cannot be edited afterwards, only removed.')) return
    setBusy(true); setError(''); setNote('')
    try {
      await post('/admin/announcements', { slug, title, body, url: url || undefined, moduleId: moduleId || undefined })
      setTitle(''); setBody(''); setModuleId(''); setUrl(''); setSlug(''); setSlugEdited(false); setNote('Sent to every member’s bell.')
      await load()
    } catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  async function retract(item: Sent) {
    if (!window.confirm(`Remove “${item.title}” from every member’s bell?`)) return
    setBusy(true); setError(''); setNote('')
    try { await api('/admin/announcements/' + item.id, { method: 'DELETE' }); await load() } catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  const ready = title.trim().length >= 3 && !!body.trim() && slug.length >= 3
  return <section className="configuration-section announcements-admin">
    <h2>Announcements</h2>
    <p className="service-note">One announcement appears in the notification bell of every verified member who joined before it was sent, and never by email. Members open it to read the message and follow its link.</p>
    <div className="announcement-compose">
      <form className="community-form announcement-form" onSubmit={event => void send(event)}>
        <label>Title<input value={title} maxLength={120} required minLength={3} onChange={event => { setTitle(event.target.value); if (!slugEdited) setSlug(keyFrom(event.target.value)) }} placeholder="Sidechain Compressor is out" /></label>
        <label><span className="announcement-label">Message<small aria-live="polite">{body.length} / {BODY_LIMIT}</small></span><textarea value={body} maxLength={BODY_LIMIT} required rows={4} onChange={event => setBody(event.target.value)} placeholder="One or two plain sentences." /></label>
        <div className="form-two-columns">
          <label>Module page<select value={moduleId} onChange={event => setModuleId(event.target.value)}><option value="">No module</option>{COMMUNITY_MODULES.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}</select></label>
          <label>Link<input value={url} maxLength={200} onChange={event => setUrl(event.target.value)} placeholder="#library or https://modwerk.app/…" /></label>
        </div>
        <p className="announcement-hint">Both are optional. A link replaces the module page; without either, the entry opens the library.</p>
        <label>Key<input className="announcement-key" value={slug} maxLength={64} required minLength={3} pattern="[a-z0-9][a-z0-9-]*" onChange={event => { setSlug(event.target.value); setSlugEdited(true) }} /></label>
        <p className="announcement-hint">Proposed from the title and today’s date. Sending the same key twice is refused, so a double click cannot announce twice.</p>
        <div className="announcement-actions"><button type="submit" className="button button-primary" disabled={busy || !ready}>{busy ? 'Working…' : 'Send to every member'}</button></div>
      </form>
      <aside className="announcement-preview" aria-label="Preview">
        <p className="announcement-preview-label">Preview in the bell</p>
        <div className="announcement-preview-card" aria-hidden="true">
          <ul className="notification-list"><li data-unread="true"><a href="#admin/announcements" tabIndex={-1} onClick={event => event.preventDefault()}>
            <ForumAvatar username={null} official /><strong>Modwerk: {title.trim() || 'Your title'}</strong><span className="notification-excerpt">{body.trim() || 'Your message appears here.'}</span><time>Just now</time>
          </a></li></ul>
        </div>
        <p className="announcement-hint">Opens {destination(url || null, moduleId || null)}</p>
      </aside>
    </div>
    {error && <p className="file-error" role="alert">{error}</p>}
    {note && <p className="success-note" role="status">{note}</p>}
    <h3 className="announcement-sent-heading">Sent{items.length ? <span className="subtle"> {items.length}</span> : null}</h3>
    {loading ? <p className="service-note" role="status">Loading announcements…</p> : items.length ? <ul className="announcement-sent">{items.map(item => {
      const share = item.audience ? Math.min(100, Math.round(item.reads / item.audience * 100)) : 0
      return <li key={item.id}>
        <div className="announcement-sent-text">
          <strong>{item.title}</strong>
          <p>{item.body}</p>
          <small><time>{sentAt(item.created_at)}</time><span>Opens {destination(item.url, item.module_id)}</span><code title="Key">{item.slug}</code></small>
        </div>
        <div className="announcement-sent-reads" title="Members who opened it in the bell or used Mark all read, out of the members who could see it.">
          <span><strong>{item.reads}</strong> of {item.audience} read</span>
          <span className="announcement-meter" aria-hidden="true"><span style={{ width: share + '%' }} /></span>
        </div>
        <button type="button" className="button button-quiet announcement-remove" disabled={busy} onClick={() => void retract(item)} aria-label={'Remove ' + item.title}>Remove</button>
      </li>
    })}</ul> : <p className="service-note">Nothing has been announced yet.</p>}
  </section>
}
