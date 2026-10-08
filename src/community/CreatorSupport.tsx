import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { CreatorSupportDialog } from './CreatorSupportDialog'
import { api, post } from './api'
import { useCommunity } from './context'
import { communityModule } from './modules'
import { defaultCreatorSupport, koFiUrl, type CreatorSupportData } from './creator-support'

export function CreatorSupportButton({ url }: { url: string }) {
  const [open, setOpen] = useState(false)
  let href: string
  try { href = koFiUrl(url) } catch { return null }
  if (!href) return null
  return <><button type="button" className="creator-support-link" aria-haspopup="dialog" aria-expanded={open} aria-label="Support the creator on Ko-fi" title="Support the creator on Ko-fi" onClick={() => setOpen(true)}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7ZM17 8h2a3 3 0 0 1 0 6h-2M3 22h16"/><path className="ko-fi-heart" d="m10.5 16.2-3.3-3.3a2 2 0 0 1 2.9-2.8l.4.4.4-.4a2 2 0 0 1 2.9 2.8Z"/></svg>
  </button>{open && <CreatorSupportDialog url={href} onClose={() => setOpen(false)}/>}</>
}

export function CreatorSupport({ id, editor = false }: { id: string; editor?: boolean }) {
  const { session, developer } = useCommunity()
  const [data, setData] = useState<(CreatorSupportData & { id: string }) | null>(null)
  const [value, setValue] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void api<CreatorSupportData>('/modules/' + id + '/support', { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) { setData({ ...result, id }); setValue(result.koFiUrl); setError(''); setNotice('') }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [id, session.available, session.user?.id, session.user?.verified, developer?.user?.login, revision])
  const current = data?.id === id ? data : null
  const url = current ? current.koFiUrl : defaultCreatorSupport(communityModule(id)?.author)
  async function save(link: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await post<CreatorSupportData>('/modules/' + id + '/support', { koFiUrl: koFiUrl(link) }, 'PATCH')
      setData({ ...result, id }); setValue(result.koFiUrl); setNotice(result.koFiUrl ? 'Ko-fi link saved.' : 'Support link removed.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save your Ko-fi link.') }
    finally { setBusy(false) }
  }
  if (editor && !current) return <div className="creator-support-editor">{error ? <p className="file-error" role="alert">{error} <button className="text-button" onClick={() => setRevision(value => value + 1)}>Try again</button></p> : <p className="service-note" role="status">Loading creator support…</p>}</div>
  const form = current?.canEdit && <form className="community-form creator-support-editor" onSubmit={event => { event.preventDefault(); void save(value) }}>
    <label htmlFor={'creator-support-' + id}>Your Ko-fi page<input id={'creator-support-' + id} name="koFiUrl" type="url" inputMode="url" placeholder="https://ko-fi.com/yourname" value={value} maxLength={1000} disabled={busy} onChange={event => { setValue(event.target.value); setNotice('') }}/></label>
    <p className="service-note">Visitors can support you from this module’s page. Clear the link to hide the button.</p>
    <div className="forum-actions"><button className="button button-quiet" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save Ko-fi link'}</button>{current.koFiUrl && <button className="text-button" type="button" disabled={busy} onClick={() => void save('')}>Remove link</button>}</div>
    {error && <p className="file-error" role="alert">{error}</p>}{notice && <p className="success-note" role="status">{notice}</p>}
  </form>
  if (editor) return form || null
  return <div className="creator-support-slot">{url && <CreatorSupportButton url={url}/>} {form && <details className="creator-support-settings"><summary title={current?.koFiUrl ? 'Edit Ko-fi link' : 'Add Ko-fi link'}><Icon name="sliders" size={13}/><span className="sr-only">{current?.koFiUrl ? 'Edit Ko-fi link' : 'Add Ko-fi link'}</span></summary>{form}</details>}</div>
}
