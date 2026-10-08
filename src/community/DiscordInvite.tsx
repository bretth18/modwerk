import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { DEVELOPMENT_DISCORD_URL } from '../config/development-discord'
import { assetUrl } from '../hosting'
import { useCommunity } from './context'
import { claimDiscordInvite } from './discord-invite'
import { trackUsage } from './usage'

export function DiscordInviteDialog({ onClose, preview = false }: { onClose: (action: 'join' | 'dismiss') => void; preview?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null), close = useRef<HTMLButtonElement>(null)
  const counted = useRef(false), responded = useRef(false)
  useEffect(() => {
    const element = dialog.current, previousFocus = document.activeElement
    element?.showModal()
    if (!preview && !counted.current) { trackUsage('discord_member_prompt_shown'); counted.current = true }
    close.current?.focus()
    return () => { element?.close(); if (previousFocus instanceof HTMLElement) previousFocus.focus() }
  }, [preview])
  function respond(action: 'join' | 'dismiss') {
    if (responded.current) return
    responded.current = true
    if (!preview) trackUsage(action === 'join' ? 'discord_member_join_clicked' : 'discord_member_dismissed')
    onClose(action)
  }
  return <dialog ref={dialog} className="app-dialog discord-invite-dialog" aria-labelledby="discord-invite-title" aria-describedby="discord-invite-message" onCancel={event => { event.preventDefault(); respond('dismiss') }} onKeyDown={event => event.stopPropagation()}>
    <header className="discord-invite-header">
      <span className="discord-invite-logo" aria-hidden="true"><img src={assetUrl('auth/discord.svg')} width={32} height={24} alt="" /></span>
      <span className="discord-invite-label">Modwerk Devs</span>
      <button ref={close} type="button" className="icon-button" aria-label="Dismiss invitation" onClick={() => respond('dismiss')}><Icon name="close" size={18} /></button>
    </header>
    <h2 id="discord-invite-title">Join us on Discord</h2>
    <p id="discord-invite-message">Share ideas, get help with module development and talk with the people building Modwerk.</p>
    <div className="dialog-actions">
      <button type="button" className="button button-quiet" onClick={() => respond('dismiss')}>No thanks</button>
      <a className="button development-discord-button" href={DEVELOPMENT_DISCORD_URL} target="_blank" rel="noreferrer" aria-label="Join Discord (opens in a new tab)" onClick={() => respond('join')}><img src={assetUrl('auth/discord.svg')} width={20} height={15} alt="" aria-hidden="true" />Join Discord<span aria-hidden="true">↗</span></a>
    </div>
  </dialog>
}

/** First visit after rollout, once per account. Signed-out visitors get a public Discord announcement card instead. */
export function DiscordInvitePrompt({ enabled }: { enabled: boolean }) {
  const { session } = useCommunity()
  // Local previews use the real dialog without claiming the account's invitation.
  const [preview] = useState(() => import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'discord-member')
  const [shown, setShown] = useState<string | null>(preview ? 'preview' : null)
  const presented = useRef(false)
  const memberId = session.user?.verified && session.user.username ? session.user.id : null
  useEffect(() => {
    if (preview || import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'welcome' || !enabled || !memberId || presented.current) return
    let cancelled = false, requested = false, ready = false
    const stop = () => { observer.disconnect(); document.removeEventListener('visibilitychange', check) }
    const check = () => {
      if (cancelled || presented.current || document.visibilityState === 'hidden' || document.querySelector('dialog[open]')) return
      if (ready) {
        presented.current = true
        stop()
        setShown(memberId)
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
  }, [enabled, memberId, preview])
  if (!shown || (!preview && shown !== memberId)) return null
  return <DiscordInviteDialog preview={preview} onClose={() => setShown(null)} />
}
