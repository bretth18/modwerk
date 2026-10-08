import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { assetUrl } from '../hosting'
import { DEVELOPMENT_DISCORD_URL } from '../config/development-discord'
import { SUPPORT_URL } from '../config/support'
import { api, post } from './api'
import { useCommunity } from './context'
import { discordInviteHandledHere, rememberDiscordInviteHere } from './discord-invite'
import { accountHref } from './member-access'
import type { BellItem } from './notification-contract'
import type { NotificationLine } from './notification-text'
import { dismissPublicAnnouncement, latestPublicAnnouncement, publicAnnouncementDismissed, publicAnnouncementLine } from './public-announcement'
import { trackAnnouncement, trackUsage } from './usage'

/** The same card is used in the public prompt and the operator's preview. It never takes focus. `signup` adds Create account to a Discord card. */
export function PublicAnnouncementCard({ line, signup, onDismiss, onOpen }: { line: NotificationLine; signup?: string; onDismiss: () => void; onOpen: (action?: 'signup') => void }) {
  const titleId = useId(), moduleLink = /^#(?:module\/|(?:digitakt|digitone)\/module\/)/.test(line.href), supportLink = !!SUPPORT_URL && line.href === SUPPORT_URL, discordLink = line.href === DEVELOPMENT_DISCORD_URL, external = /^https?:/.test(line.href)
  const action = <a className="public-announcement-action" href={line.href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} onClick={() => { if (supportLink) trackUsage('support_link_opened'); onOpen() }}>{supportLink && <Icon name="heart" size={15} />}{discordLink && <img src={assetUrl('auth/discord.svg')} width={20} height={15} alt="" />}{supportLink ? 'Support on Ko-fi' : discordLink ? 'Join Discord' : moduleLink ? 'Explore module' : 'Take a look'}<Icon name="arrow" size={16} />{external && <span className="sr-only"> (opens in a new tab)</span>}</a>
  return <section className="public-announcement-card" aria-labelledby={titleId} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onDismiss() } }}>
    <header>
      <span className="public-announcement-brand"><img src={assetUrl('modwerk-mark.svg')} width={28} height={28} alt="" /><span>Modwerk news</span></span>
      <button type="button" className="icon-button" aria-label="Dismiss announcement" onClick={onDismiss}><Icon name="close" size={17} /></button>
    </header>
    {moduleLink && <span className="public-announcement-kicker">Module news</span>}
    <h2 id={titleId}>{line.text}</h2>
    {line.excerpt && <p>{line.excerpt}</p>}
    {supportLink && <a className="public-announcement-credits" href="#credits" onClick={() => onOpen()}>Credits &amp; acknowledgements<Icon name="arrow" size={14} /></a>}
    {discordLink && signup ? <div className="public-announcement-actions">{action}<a className="public-announcement-action" href={signup} onClick={() => onOpen('signup')}>Create account<Icon name="arrow" size={16} /></a></div> : action}
  </section>
}

export function PublicAnnouncement({ enabled, next }: { enabled: boolean; next: string }) {
  const { session, loading } = useCommunity(), memberId = session.user?.verified ? session.user.id : null
  // Account changes reload only the public acknowledgement state; no private content enters this surface.
  return <PublicAnnouncementContent key={memberId ?? 'visitor'} member={!!memberId} signup={session.user ? undefined : accountHref('register', next)} enabled={enabled && !loading} />
}
function PublicAnnouncementContent({ member, signup, enabled }: { member: boolean; signup?: string; enabled: boolean }) {
  const [item, setItem] = useState<BellItem | null>(null), [visible, setVisible] = useState(false), counted = useRef('')
  const discord = item?.url === DEVELOPMENT_DISCORD_URL
  useEffect(() => {
    const controller = new AbortController()
    void api<{ items: BellItem[] }>(member ? '/announcements/mine' : '/announcements', { signal: controller.signal }).then(value => {
      // The anonymous feed carries no member state; local dismissal supplies it instead.
      if (!controller.signal.aborted) setItem(latestPublicAnnouncement(member ? value.items : value.items.map(item => ({ ...item, seen: false }))))
    }).catch(() => {}) // Optional news never interrupts the local workspace on a failed read.
    return () => controller.abort()
  }, [member])
  useEffect(() => {
    if (!item) return
    let timer: number | undefined
    // A Discord card is this browser's one community invitation; skip it where the former popup or a member claim already gave one.
    const retired = () => publicAnnouncementDismissed(item.id) || (item.url === DEVELOPMENT_DISCORD_URL && discordInviteHandledHere())
    const blocked = () => !enabled || document.visibilityState !== 'visible' || !!document.querySelector('dialog[open], .notification-panel, .mobile-menu-panel, .library-machine-menu, .forum-shoutbox.is-floating, .signup-welcome, .selection-warning') || !!document.activeElement?.matches('input, textarea, [contenteditable="true"]')
    function check() {
      if (retired()) { setItem(null); return }
      if (blocked()) {
        window.clearTimeout(timer); timer = undefined; setVisible(false)
      } else if (timer === undefined) {
        // Let the page settle. No countdown, sound, backdrop, auto-dismiss or focus change.
        timer = window.setTimeout(() => { if (retired()) setItem(null); else if (!blocked()) setVisible(true) }, 4000)
      }
    }
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] })
    document.addEventListener('visibilitychange', check)
    document.addEventListener('focusin', check); document.addEventListener('focusout', check)
    window.addEventListener('storage', check)
    check()
    return () => { window.clearTimeout(timer); observer.disconnect(); document.removeEventListener('visibilitychange', check); document.removeEventListener('focusin', check); document.removeEventListener('focusout', check); window.removeEventListener('storage', check) }
  }, [enabled, item])
  // Once per card on this page, however often a dialog hides and reveals it. Signed-out views of a Discord card also keep the visitor invitation totals.
  useEffect(() => {
    if (!visible || !item || counted.current === item.id) return
    counted.current = item.id
    trackAnnouncement('announcement_shown', item.id)
    if (discord && signup) trackUsage('discord_visitor_prompt_shown')
  }, [visible, item, discord, signup])
  function acknowledge(action: 'open' | 'signup' | 'dismiss') {
    if (!item) return
    trackAnnouncement(action === 'dismiss' ? 'announcement_dismissed' : 'announcement_opened', item.id)
    if (discord) {
      rememberDiscordInviteHere() // Signing in later carries this into the member invitation, so no popup follows.
      if (signup) trackUsage(action === 'signup' ? 'discord_visitor_signup_clicked' : action === 'open' ? 'discord_visitor_join_clicked' : 'discord_visitor_dismissed')
    }
    dismissPublicAnnouncement(item.id); setItem(null)
    if (member) void post('/announcements/mine', { ids: [item.id] }, 'PATCH').catch(() => {})
  }
  if (!enabled || !item || !visible) return null
  return <aside className="public-announcement" aria-label="Public announcement"><PublicAnnouncementCard line={publicAnnouncementLine(item)} signup={signup} onDismiss={() => acknowledge('dismiss')} onOpen={action => acknowledge(action ?? 'open')} /></aside>
}
