import { useEffect, useId, useState } from 'react'
import { Icon } from '../components/Icon'
import { assetUrl } from '../hosting'
import { SUPPORT_URL } from '../config/support'
import { api, post } from './api'
import { useCommunity } from './context'
import type { BellItem } from './notification-contract'
import { notificationLines, type NotificationLine } from './notification-text'
import { dismissPublicAnnouncement, latestPublicAnnouncement, publicAnnouncementDismissed } from './public-announcement'
import { trackUsage } from './usage'

/** The same card is used in the public prompt and the operator's preview. It never takes focus. */
export function PublicAnnouncementCard({ line, onDismiss, onOpen }: { line: NotificationLine; onDismiss: () => void; onOpen: () => void }) {
  const titleId = useId(), moduleLink = /^#(?:module\/|(?:digitakt|digitone)\/module\/)/.test(line.href), external = /^https?:/.test(line.href)
  return <section className="public-announcement-card" aria-labelledby={titleId} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onDismiss() } }}>
    <header>
      <span className="public-announcement-brand"><img src={assetUrl('modwerk-mark.svg')} width={28} height={28} alt="" /><span>Modwerk news</span></span>
      <button type="button" className="icon-button" aria-label="Dismiss announcement" onClick={onDismiss}><Icon name="close" size={17} /></button>
    </header>
    {moduleLink && <span className="public-announcement-kicker">Module news</span>}
    <h2 id={titleId}>{line.text}</h2>
    {line.excerpt && <p>{line.excerpt}</p>}
    <a className="public-announcement-action" href={line.href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} onClick={() => { if (line.href === SUPPORT_URL) trackUsage('support_link_opened'); onOpen() }}>{moduleLink ? 'Explore module' : 'Take a look'}<Icon name="arrow" size={16} />{external && <span className="sr-only"> (opens in a new tab)</span>}</a>
  </section>
}

export function PublicAnnouncement({ enabled }: { enabled: boolean }) {
  const { session, loading } = useCommunity(), memberId = session.user?.verified ? session.user.id : null
  // Account changes reload only the public acknowledgement state; no private content enters this surface.
  return <PublicAnnouncementContent key={memberId ?? 'visitor'} member={!!memberId} enabled={enabled && !loading} />
}
function PublicAnnouncementContent({ member, enabled }: { member: boolean; enabled: boolean }) {
  const [item, setItem] = useState<BellItem | null>(null), [visible, setVisible] = useState(false)
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
    const blocked = () => !enabled || document.visibilityState !== 'visible' || !!document.querySelector('dialog[open], .notification-panel, .mobile-menu-panel, .library-machine-menu, .forum-shoutbox.is-floating, .signup-welcome, .selection-warning') || !!document.activeElement?.matches('input, textarea, [contenteditable="true"]')
    function check() {
      if (publicAnnouncementDismissed(item!.id)) { setItem(null); return }
      if (blocked()) {
        window.clearTimeout(timer); timer = undefined; setVisible(false)
      } else if (timer === undefined) {
        // Let the page settle. No countdown, sound, backdrop, auto-dismiss or focus change.
        timer = window.setTimeout(() => { if (!blocked()) setVisible(true) }, 4000)
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
  function acknowledge() {
    if (!item) return
    dismissPublicAnnouncement(item.id); setItem(null)
    if (member) void post('/announcements/mine', { ids: [item.id] }, 'PATCH').catch(() => {})
  }
  if (!enabled || !item || !visible) return null
  return <aside className="public-announcement" aria-label="Public announcement"><PublicAnnouncementCard line={notificationLines([item])[0]} onDismiss={acknowledge} onOpen={acknowledge} /></aside>
}
