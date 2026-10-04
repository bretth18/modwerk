import { useEffect, useState } from 'react'
import { api, post } from './api'

export function NewsPreferences() {
  const [enabled, setEnabled] = useState(false), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    void api<{enabled:boolean}>('/auth/news').then(value => { if (!cancelled) { setEnabled(value.enabled); setReady(true) } }).catch(error => { if (!cancelled) setError(error.message) })
    return () => { cancelled = true }
  }, [])
  async function change(next: boolean) {
    setBusy(true); setError(''); setMessage('')
    try { const value = await post<{enabled:boolean}>('/auth/news', {enabled:next}, 'PATCH'); setEnabled(value.enabled); setMessage(value.enabled ? 'News emails enabled.' : 'News emails turned off.') }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to save your preference.') }
    finally { setBusy(false) }
  }
  return <section className="configuration-section"><h2>News emails</h2><label className="risk-accept"><input type="checkbox" checked={enabled} disabled={!ready || busy} onChange={event => void change(event.target.checked)} />Email me occasional Modwerk news and updates (optional).</label><p className="service-note">Your choice does not affect your account. You can turn news emails off here at any time. Verification and recovery emails are separate.</p>{message && <p role="status">{message}</p>}{error && <p className="file-error" role="alert">{error}</p>}</section>
}
