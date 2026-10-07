import { useEffect, useState } from 'react'
import { api } from './api'
import type { ForumHighlights as Highlights } from './forum-contract'
import { ForumAuthorName, ForumAvatar } from './ForumIdentity'
import { Icon } from '../components/Icon'

const likes = (count: number) => count + (count === 1 ? ' like' : ' likes')
/** The forum home's "This month" block: the most liked posts and reply authors of the last 30 days, and the newest members. */
export function ForumHighlights() {
  const [data, setData] = useState<Highlights | null>(null), [unavailable, setUnavailable] = useState(false)
  useEffect(() => { let cancelled = false; void api<Highlights>('/forum/highlights').then(value => { if (!cancelled) setData(value) }).catch(() => { if (!cancelled) setUnavailable(true) }); return () => { cancelled = true } }, [])
  if (unavailable) return null
  const quiet = data && !data.topPosts.length && !data.topMembers.length && !data.newMembers.length
  return <section className="forum-highlights" aria-labelledby="forum-highlights-title">
    <div className="forum-list-heading"><h2 id="forum-highlights-title">This month</h2><span>The last 30 days around the forum</span></div>
    {!data ? <p role="status" className="service-note">Loading highlights…</p> : quiet ? <p className="service-note">Likes and new members will show up here.</p> : <>
      {data.topPosts.length > 0 && <div className="forum-highlight-group"><h3>Most liked posts</h3><ol>{data.topPosts.map(post => <li key={post.id}><a href={'#forum/thread/' + post.thread_id + '?post=' + post.id + '&page=' + post.page}>{post.title}</a><small><ForumAuthorName username={post.username} /> · <Icon name="heart" size={11} /> {likes(post.likes)}</small></li>)}</ol></div>}
      {data.topMembers.length > 0 && <div className="forum-highlight-group"><h3>Most liked replies</h3><ol>{data.topMembers.map(member => <li key={member.username}><span className="forum-author"><ForumAvatar username={member.username} avatar={member.avatar} /><ForumAuthorName username={member.username} /></span><small>{likes(member.likes)}</small></li>)}</ol></div>}
      {data.newMembers.length > 0 && <div className="forum-highlight-group"><h3>New members</h3><ul className="forum-highlight-members">{data.newMembers.map(member => <li key={member.username}><a href={'#forum/profile/' + encodeURIComponent(member.username)}><ForumAvatar username={member.username} avatar={member.avatar} />@{member.username}</a></li>)}</ul></div>}
    </>}
  </section>
}
