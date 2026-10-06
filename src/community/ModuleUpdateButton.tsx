import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { api, post } from './api'
import { useCommunity } from './context'
import { accountHref } from './member-access'
import { communityModule } from './modules'
import type { ModuleUpdateSubscription } from './module-release-contract'

export function ModuleUpdateButton({ id }: { id: string }) {
  const { session, loading } = useCommunity()
  if (loading) return <button className="button button-quiet" disabled><Icon name="bell" size={16} />Get update notifications</button>
  if (!session.user) return <a className="button button-quiet" href={accountHref('login', communityModule(id)?.href.slice(1))}><Icon name="bell" size={16} />Get update notifications</a>
  if (!session.user.verified) return <a className="button button-quiet" href="#account"><Icon name="bell" size={16} />Verify email to follow updates</a>
  return <Subscription key={id + ':' + session.user.id} id={id} />
}

function Subscription({ id }: { id: string }) {
  const [value, setValue] = useState<ModuleUpdateSubscription | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const request = useRef(0), mutating = useRef(false), description = useId()
  useEffect(() => {
    let active = true
    const load = () => {
      if (mutating.current) return
      const version = ++request.current
      void api<ModuleUpdateSubscription>('/modules/' + id + '/updates').then(next => { if (active && version === request.current) { setValue(next); setError('') } }).catch(error => { if (active && version === request.current) setError(error.message) })
    }
    load(); window.addEventListener('focus', load); window.addEventListener('modwerk-module-updates', load)
    return () => { active = false; ++request.current; window.removeEventListener('focus', load); window.removeEventListener('modwerk-module-updates', load) }
  }, [id])
  async function change() {
    const version = ++request.current
    mutating.current = true
    setBusy(true); setError('')
    try {
      const next = await post<ModuleUpdateSubscription>('/modules/' + id + '/updates', { enabled: !value?.enabled }, 'PATCH')
      if (version === request.current) setValue(next)
    } catch (error) { if (version === request.current) setError(error instanceof Error ? error.message : 'Unable to save update notifications.') }
    finally { mutating.current = false; setBusy(false) }
  }
  return <div className="module-update-subscription">
    <button type="button" className={'button ' + (value?.enabled ? 'button-added' : 'button-quiet')} aria-pressed={!!value?.enabled} aria-describedby={description} disabled={busy || !value && !error} onClick={() => void change()}><Icon name="bell" size={16} />{busy ? 'Saving…' : value?.enabled ? 'Following updates · Unfollow' : 'Get update notifications'}</button>
    <p id={description} className="service-note" role="status">{value?.enabled ? <>New releases appear in your bell. {value.emailEnabled && value.emailAvailable ? 'Unread updates are included in your activity emails.' : <>For email too, {value.emailAvailable ? 'enable module updates in' : 'check delivery availability in'} <a href="#account/notifications">email settings</a>.</>}</> : 'Get new releases in your bell and activity emails.'}</p>
    {error && <p className="file-error" role="alert">{error}</p>}
  </div>
}
