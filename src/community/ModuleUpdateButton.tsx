import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { api, post } from './api'
import { useCommunity } from './context'
import { LoginPromptDialog } from './LoginPromptDialog'
import { modulePageHref } from './modules'
import type { ModuleUpdateSubscription } from './module-release-contract'

function UpdateDeliveryNote({ id, compact = false }: { id?: string; compact?: boolean }) {
  return <p id={id} className="service-note">{compact ? 'New releases in your bell · ' : 'Get new releases in your bell. Choose email delivery in '}<a href="#account/notifications">{compact ? 'Settings' : 'notification settings'}</a>.</p>
}

export function ModuleUpdateButton({ id, compact = false }: { id: string; compact?: boolean }) {
  const { session, loading } = useCommunity()
  const className = 'module-update-subscription' + (compact ? ' module-update-compact' : '')
  if (loading) return <div className={className}><button className="button button-quiet" disabled><Icon name="bell" size={16} />{compact ? 'Follow updates' : 'Get update notifications'}</button><UpdateDeliveryNote compact={compact}/></div>
  if (!session.user) return <VisitorInvitation id={id} compact={compact} />
  if (!session.user.verified) return <div className={className}><a className="button button-quiet" href="#account"><Icon name="bell" size={16} />Verify email to follow</a><UpdateDeliveryNote compact={compact}/></div>
  return <Subscription key={id + ':' + session.user.id} id={id} compact={compact} />
}

/** The same button for visitors; pressing it opens the sign-in prompt and brings them back to this module. */
function VisitorInvitation({ id, compact }: { id: string; compact: boolean }) {
  const [open, setOpen] = useState(false)
  return <div className={'module-update-subscription' + (compact ? ' module-update-compact' : '')}><button type="button" className="button button-quiet" aria-haspopup="dialog" onClick={() => setOpen(true)}><Icon name="bell" size={16} />{compact ? 'Follow updates' : 'Get update notifications'}</button><UpdateDeliveryNote compact={compact}/>{open && <LoginPromptDialog action="Sign in to get update notifications" next={modulePageHref(id).slice(1)} onClose={() => setOpen(false)} />}</div>
}

function Subscription({ id, compact }: { id: string; compact: boolean }) {
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
  return <div className={'module-update-subscription' + (compact ? ' module-update-compact' : '')}>
    <button type="button" className={'button ' + (value?.enabled ? 'button-added' : 'button-quiet')} aria-label={value?.enabled ? 'Unfollow updates' : 'Follow module updates'} aria-pressed={!!value?.enabled} aria-describedby={description} disabled={busy || !value && !error} onClick={() => void change()}><Icon name="bell" size={16} />{busy ? 'Saving…' : value?.enabled ? compact ? 'Following' : 'Unfollow updates' : compact ? 'Follow updates' : 'Get update notifications'}</button>
    <UpdateDeliveryNote id={description} compact={compact}/>
    {error && <p className="file-error" role="alert">{error}</p>}
  </div>
}
