import { useCallback, useEffect, useRef, useState } from 'react'
import { api, post } from './api'
import { useCommunity } from './context'
import { Icon } from '../components/Icon'
import { NotificationList } from './NotificationList'
import { notificationLines, type NotificationLine } from './notification-text'
import type { BellItem } from './notification-contract'

const POLL_MS = 60000
export function NotificationBell() {
  const { session } = useCommunity(), member = session.available && !!session.user?.verified
  const [unread, setUnread] = useState(0), [open, setOpen] = useState(false), [items, setItems] = useState<BellItem[] | null>(null), [error, setError] = useState('')
  const root = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null)
  const count = useCallback(() => { void api<{ unread: number }>('/notifications/unread').then(value => setUnread(value.unread)).catch(() => {}) }, [])
  useEffect(() => {
    if (!member) return
    count()
    // Poll only while the tab is visible; returning to the tab refreshes at once.
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') count() }, POLL_MS)
    const visible = () => { if (document.visibilityState === 'visible') count() }
    document.addEventListener('visibilitychange', visible)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [member, count, session.user?.id])
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void api<{ items: BellItem[]; unread: number }>('/notifications').then(value => { if (!cancelled) { setItems(value.items); setUnread(value.unread) } }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Notifications could not load.') })
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus() } }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { cancelled = true; document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  if (!member) return null
  function markRead(ids?: string[]) {
    setItems(current => current?.map(item => !ids || ids.includes(item.id) ? { ...item, seen: true } : item) ?? null)
    setUnread(current => ids ? Math.max(0, current - (items?.filter(item => ids.includes(item.id) && !item.seen).length ?? 0)) : 0)
    // Say why a read did not stick instead of quietly restoring the count.
    void post('/notifications', ids ? { ids } : {}, 'PATCH').catch(error => { setError(error instanceof Error ? error.message : 'Notifications could not be marked as read.'); setOpen(true); count() })
  }
  const lines = items ? notificationLines(items) : []
  return <div className="notification-bell" ref={root}>
    <button ref={button} type="button" className="notification-bell-button" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={open} aria-controls="notification-panel" onClick={() => { setError(''); setOpen(value => !value) }}><Icon name="bell" size={19} />{unread > 0 && <span className="notification-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && <section className="notification-panel" id="notification-panel" aria-label="Notifications">
      <header><h2>Notifications</h2><button type="button" className="text-button" disabled={!items?.some(item => !item.seen)} onClick={() => markRead()}>Mark all read</button></header>
      {error ? <p className="file-error" role="alert">{error}</p> : !items ? <p className="notification-empty" role="status">Loading…</p> : lines.length ? <NotificationList lines={lines} onOpen={(line: NotificationLine) => { if (!line.seen) markRead(line.ids); setOpen(false) }} /> : <p className="notification-empty">You're all caught up. Replies, mentions, likes and activity on your modules show up here.</p>}
      <footer><a href="#account/activity" onClick={() => setOpen(false)}>All notifications</a><a href="#account/notifications" onClick={() => setOpen(false)}>Email settings</a></footer>
    </section>}
  </div>
}
