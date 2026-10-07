import { useEffect, useRef, useState } from 'react'
import { ForumAvatar } from './ForumIdentity'
import type { MembersOnline as Presence } from './forum-contract'
import { useMembersOnline } from './useMembersOnline'

const onlineLabel = (online: number) => online === 1 ? '1 member online' : online + ' members online'

/** The members who show themselves in the online list, as avatar and name links, then how many more are online unnamed. */
export function MembersOnlineList({ presence }: { presence: Presence }) {
  const unnamed = presence.more === presence.online
  return <ul className="members-online-list" aria-label="Members online">
    {presence.members.map(member => <li key={member.username}><a href={'#forum/profile/' + encodeURIComponent(member.username)}><ForumAvatar username={member.username} avatar={member.avatar} />@{member.username}</a></li>)}
    {presence.more > 0 && <li className="members-online-more">{unnamed ? onlineLabel(presence.online) : 'and ' + presence.more + ' more'}</li>}
  </ul>
}

/** The sidebar's online count. Hovering or tapping it lists who is online; Escape or a click elsewhere closes the list. */
export function MembersOnlineChip({ presence }: { presence: Presence }) {
  const [open, setOpen] = useState(false), root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])
  return <div ref={root} className="members-online" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}>
    <button type="button" className="sidebar-online" aria-expanded={open} aria-controls="members-online-popover" aria-label={onlineLabel(presence.online) + '. Show who is online'} onClick={() => setOpen(value => !value)}><span className="online-dot" aria-hidden="true" />{presence.online} online</button>
    {open && <div id="members-online-popover" className="members-online-popover" role="group" aria-label={onlineLabel(presence.online)}><strong>{onlineLabel(presence.online)}</strong><MembersOnlineList presence={presence} /></div>}
  </div>
}

/** One line on the forum home naming who is around right now. Nothing shows while nobody is online. */
export function ForumOnlineNow() {
  const presence = useMembersOnline(false)
  if (!presence?.online) return null
  return <div className="forum-online-now"><span className="forum-online-now-label"><span className="online-dot" aria-hidden="true" />Online now</span><MembersOnlineList presence={presence} /></div>
}
