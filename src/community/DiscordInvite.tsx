import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { DEVELOPMENT_DISCORD_URL } from '../config/development-discord'
import { assetUrl } from '../hosting'
import { useCommunity } from './context'
import { claimDiscordInvite } from './discord-invite'
import { accountHref } from './member-access'
import { trackUsage } from './usage'

type Audience = 'member' | 'visitor'

export function DiscordInviteDialog({ audience, next, onClose, preview = false }: { audience: Audience; next: string; onClose: (action: 'join' | 'dismiss' | 'signup') => void; preview?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null), close = useRef<HTMLButtonElement>(null)
  const counted = useRef(false), responded = useRef(false)
  const visitor = audience === 'visitor'
  useEffect(() => {
    const element = dialog.current, previousFocus = document.activeElement
    element?.showModal()
    if (!preview && !counted.current) { trackUsage(visitor ? 'discord_visitor_prompt_shown' : 'discord_member_prompt_shown'); counted.current = true }
    close.current?.focus()
    return () => { element?.close(); if (previousFocus instanceof HTMLElement) previousFocus.focus() }
  }, [preview, visitor])
  function respond(action: 'join' | 'dismiss' | 'signup') {
    if (responded.current) return
    responded.current = true
    if (!preview) trackUsage(visitor
      ? action === 'signup' ? 'discord_visitor_signup_clicked' : action === 'join' ? 'discord_visitor_join_clicked' : 'discord_visitor_dismissed'
      : action === 'join' ? 'discord_member_join_clicked' : 'discord_member_dismissed')
    onClose(action)
  }
  return <dialog ref={dialog} className="app-dialog discord-invite-dialog" aria-labelledby="discord-invite-title" aria-describedby="discord-invite-message" onCancel={event => { event.preventDefault(); respond('dismiss') }} onKeyDown={event => event.stopPropagation()}>
    <header className="discord-invite-header">
      <span className="discord-invite-logo" aria-hidden="true"><img src={assetUrl('auth/discord.svg')} width={32} height={24} alt="" /></span>
      <span className="discord-invite-label">Modwerk Devs</span>
      <button ref={close} type="button" className="icon-button" aria-label="Dismiss invitation" onClick={() => respond('dismiss')}><Icon name="close" size={18} /></button>
    </header>
    <h2 id="discord-invite-title">{visitor ? 'Join the Modwerk community' : 'Join us on Discord'}</h2>
    <p id="discord-invite-message">{visitor ? 'Create a free account to build firmware and join discussions, or meet other developers on Discord.' : 'Share ideas, get help with module development and talk with the people building Modwerk.'}</p>
    <div className={'dialog-actions' + (visitor ? ' discord-invite-visitor-actions' : '')}>
      {visitor ? <a className="button button-primary" href={accountHref('register', next)} onClick={() => respond('signup')}>Create account</a> : <button type="button" className="button button-quiet" onClick={() => respond('dismiss')}>No thanks</button>}
      <a className="button development-discord-button" href={DEVELOPMENT_DISCORD_URL} target="_blank" rel="noreferrer" aria-label="Join Discord (opens in a new tab)" onClick={() => respond('join')}><img src={assetUrl('auth/discord.svg')} width={20} height={15} alt="" aria-hidden="true" />Join Discord<span aria-hidden="true">↗</span></a>
    </div>
    {visitor && <button type="button" className="text-button discord-invite-dismiss" onClick={() => respond('dismiss')}>Dismiss</button>}
  </dialog>
}

/** First visit after rollout: once per account, or once in this browser for a signed-out visitor. */
export function DiscordInvitePrompt({ enabled, next }: { enabled: boolean; next: string }) {
  const { session, loading } = useCommunity()
  // Local previews use the real dialog without claiming any account or browser invitation.
  const [preview] = useState<Audience | null>(() => {
    if (!import.meta.env.DEV) return null
    const value = new URLSearchParams(window.location.search).get('preview')
    return value === 'discord-member' ? 'member' : value === 'discord-visitor' ? 'visitor' : null
  })
  const [shown, setShown] = useState<{ key: string; audience: Audience } | null>(preview ? { key: 'preview', audience: preview } : null)
  const presented = useRef(false), signupChosen = useRef(false)
  const memberId = session.user?.verified && session.user.username ? session.user.id : null
  const key = memberId ? 'member:' + memberId : !session.user && session.available && !loading ? 'visitor' : ''
  useEffect(() => {
    if (preview || !enabled || !key || presented.current && !(memberId && signupChosen.current)) return
    let cancelled = false, requested = false, ready = false
    const stop = () => { observer.disconnect(); document.removeEventListener('visibilitychange', check) }
    const check = () => {
      if (cancelled || presented.current && !(memberId && signupChosen.current) || document.visibilityState === 'hidden' || document.querySelector('dialog[open]')) return
      if (ready) {
        presented.current = true
        signupChosen.current = false
        stop()
        setShown({ key, audience: memberId ? 'member' : 'visitor' })
      } else if (!requested) {
        requested = true
        void claimDiscordInvite(memberId).then(result => {
          if (cancelled) return
          if (!result.show) { stop(); return }
          ready = true
          check()
        }).catch(() => { stop() }) // An optional invitation must never interrupt a visit when the service is unavailable.
      }
    }
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] })
    document.addEventListener('visibilitychange', check)
    check()
    return () => { cancelled = true; stop() }
  }, [enabled, key, memberId, preview])
  if (!shown || (!preview && shown.key !== key)) return null
  return <DiscordInviteDialog audience={shown.audience} next={next} preview={!!preview} onClose={action => { if (!preview && shown.audience === 'visitor' && action === 'signup') signupChosen.current = true; setShown(null) }} />
}
