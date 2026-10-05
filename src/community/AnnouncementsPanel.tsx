import { useEffect, useState } from 'react'
import { api, post } from './api'
import { COMMUNITY_MODULES } from './modules'

type Sent = { id: string; slug: string; title: string; body: string; url: string | null; module_id: string | null; created_at: string; reads: number }
const errorText = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.'
/** The key makes a send idempotent; this proposes one from the title and today's date. */
const keyFrom = (title: string) => (title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) + '-' + new Date().toISOString().slice(0, 10)).replace(/^-+/, '')

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
  async function retract(id: string) {
    if (!window.confirm('Remove this announcement from every member’s bell?')) return
    setBusy(true); setError(''); setNote('')
    try { await api('/admin/announcements/' + id, { method: 'DELETE' }); await load() } catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  return <section className="configuration-section">
    <h2>Announcements</h2>
    <p className="service-note">One announcement appears in the notification bell of every verified member who joined before it was sent, and never by email. Members open it to read the message and follow its link.</p>
    <form className="admin-form" onSubmit={event => void send(event)}>
      <label>Title<input value={title} maxLength={120} required minLength={3} onChange={event => { setTitle(event.target.value); if (!slugEdited) setSlug(keyFrom(event.target.value)) }} placeholder="Sidechain Compressor is out" /></label>
      <label>Message<textarea value={body} maxLength={400} required rows={3} onChange={event => setBody(event.target.value)} placeholder="One or two plain sentences, up to 400 characters." /></label>
      <label>Module (optional, opens its page)<select value={moduleId} onChange={event => setModuleId(event.target.value)}><option value="">No module</option>{COMMUNITY_MODULES.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}</select></label>
      <label>Link (optional, replaces the module page)<input value={url} maxLength={200} onChange={event => setUrl(event.target.value)} placeholder="#library or https://modwerk.app/…" /></label>
      <label>Key (sending the same key twice is refused)<input value={slug} maxLength={64} required minLength={3} pattern="[a-z0-9][a-z0-9-]*" onChange={event => { setSlug(event.target.value); setSlugEdited(true) }} /></label>
      <button type="submit" disabled={busy || !title.trim() || !body.trim() || slug.length < 3}>{busy ? 'Working…' : 'Send to every member'}</button>
    </form>
    {error && <p className="file-error" role="alert">{error}</p>}
    {note && <p className="success-note" role="status">{note}</p>}
    {loading ? <p className="service-note" role="status">Loading announcements…</p> : items.length ? <ul className="notification-list">{items.map(item => <li key={item.id}>
      <strong>{item.title}</strong><span className="notification-excerpt">{item.body}</span>
      <small>{new Date(item.created_at.replace(' ', 'T') + 'Z').toLocaleString()} · {item.reads} read · key {item.slug}</small>{' '}
      <button type="button" className="text-button" disabled={busy} onClick={() => void retract(item.id)}>Remove</button>
    </li>)}</ul> : <p className="service-note">Nothing has been announced yet.</p>}
  </section>
}
