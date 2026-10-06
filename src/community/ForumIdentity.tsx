import { FORUM_CATEGORIES, type ForumCategory } from './forum-contract'
import { DEVICES_BY_ID } from '../devices/registry'

export function ForumCategoryBadge({ category }: { category: ForumCategory }) {
  return <span className="forum-category-badge" data-category={category}><span aria-hidden="true" />{FORUM_CATEGORIES[category]}</span>
}

export function ForumMachineBadge({ machine }: { machine: string | null }) {
  const device = machine ? DEVICES_BY_ID[machine] : undefined
  return device ? <a className="forum-machine-badge" href={'#forum?machine=' + device.id}>{device.name}</a> : null
}

export function ForumAvatar({ username, official }: { username: string | null; official?: unknown }) {
  const tone = official ? 'official' : username ? [...username].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 5 : 'neutral'
  return <span className="forum-avatar" data-tone={tone} aria-hidden="true">{official ? 'MW' : username?.slice(0, 2).toUpperCase() ?? '—'}</span>
}

// Official module threads have no public member profile.
export function ForumAuthorName({ username, official, missing = 'Deleted member' }: { username: string | null; official?: unknown; missing?: string }) {
  return official ? <strong>Modwerk</strong> : username ? <a href={'#forum/profile/' + encodeURIComponent(username)}>@{username}</a> : <span>{missing}</span>
}
