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

/** The sidebar's online count. */
export function MembersOnlineChip({ presence }: { presence: Presence }) {
  return <span className="sidebar-online" title={onlineLabel(presence.online)}><span className="online-dot" aria-hidden="true" />{presence.online} online</span>
}

/** One line on the forum home naming who is around right now. Nothing shows while nobody is online. */
export function ForumOnlineNow() {
  const presence = useMembersOnline(false)
  if (!presence?.online) return null
  return <div className="forum-online-now"><span className="forum-online-now-label"><span className="online-dot" aria-hidden="true" />Online now</span><MembersOnlineList presence={presence} /></div>
}
