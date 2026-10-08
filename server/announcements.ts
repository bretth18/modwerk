import type { Database, User } from './platform'
import { ADMIN_ACTOR, needMember, throttle } from './auth'
import { digest, HttpError, jsonBody, response } from './security'
import { communityModule } from '../src/community/modules'
import type { AnnouncementVisibility, BellItem } from '../src/community/notification-contract'
import type { ModuleRelease } from '../src/community/module-release-contract'
import { DEVELOPMENT_DISCORD_URL } from '../src/config/development-discord'
import { SUPPORT_URL } from '../src/config/support'

/** Announcement ids stay distinct from personal activity ids. */
export const ANNOUNCEMENT_PREFIX = 'announcement-'
const LISTED = 10
const newId = 'lower(hex(randomblob(16)))'
type Row = { id: string; title: string; body: string; url: string | null; module_id: string | null; created_at: string; seen: number }

/** Public announcements include history; signed-in announcements reach members present when sent. */
const AUDIENCE = "(a.visibility='public' OR a.created_at>=u.created_at)"
const VISIBLE = `FROM announcements a JOIN users u ON u.id=? LEFT JOIN announcement_reads r ON r.announcement_id=a.id AND r.user_id=u.id WHERE ${AUDIENCE}`

/** Public content is anonymous; an authenticated read includes only that member's acknowledgement state. */
export async function publicAnnouncementItems(db: Database, memberId?: string): Promise<BellItem[]> {
  if (memberId) {
    const rows = (await db.prepare(`SELECT a.id,a.title,a.body,a.url,a.module_id,a.created_at,r.announcement_id IS NOT NULL AS seen ${VISIBLE} AND a.visibility='public' ORDER BY a.created_at DESC,a.rowid DESC LIMIT ${LISTED}`).bind(memberId).all<Row>()).results
    return rows.map(toItem)
  }
  const rows = (await db.prepare(`SELECT id,title,body,url,module_id,created_at,1 AS seen FROM announcements WHERE visibility='public' ORDER BY created_at DESC,rowid DESC LIMIT ${LISTED}`).all<Row>()).results
  return rows.map(toItem)
}
function toItem(row: Row): BellItem {
  return {
    id: ANNOUNCEMENT_PREFIX + row.id, kind: 'announcement', seen: !!row.seen, created_at: row.created_at, thread_id: null, post_id: null, module_id: row.module_id,
    actor: null, actorOfficial: true, title: row.title, excerpt: row.body, rating: null, issue_id: null, github_actor: null, url: row.url,
  }
}
function visibility(value: unknown): AnnouncementVisibility {
  if (value !== 'public' && value !== 'signed-in') throw new HttpError(400, 'Choose public or signed-in visibility.')
  return value
}

export async function announcementItems(db: Database, memberId: string): Promise<BellItem[]> {
  const rows = (await db.prepare(`SELECT a.id,a.title,a.body,a.url,a.module_id,a.created_at,r.announcement_id IS NOT NULL AS seen ${VISIBLE} AND a.visibility='signed-in' ORDER BY a.created_at DESC,a.rowid DESC LIMIT ${LISTED}`).bind(memberId).all<Row>()).results
  return rows.map(toItem)
}

export async function announcementUnread(db: Database, memberId: string) {
  return (await db.prepare(`SELECT COUNT(*) AS unread ${VISIBLE} AND a.visibility='signed-in' AND r.announcement_id IS NULL`).bind(memberId).first<{ unread: number }>())?.unread ?? 0
}

/** Each surface acknowledges only its own audience; marking the bell read never dismisses public news. */
export async function markAnnouncementsRead(db: Database, memberId: string, ids: string[] | null, audience: AnnouncementVisibility = 'signed-in') {
  const own = ids?.map(id => id.slice(ANNOUNCEMENT_PREFIX.length))
  if (own && !own.length) return
  await db.prepare(`INSERT OR IGNORE INTO announcement_reads(user_id,announcement_id) SELECT u.id,a.id FROM announcements a JOIN users u ON u.id=? WHERE ${AUDIENCE} AND a.visibility=?${own ? ` AND a.id IN (${own.map(() => '?').join(',')})` : ''}`)
    .bind(memberId, audience, ...(own ?? [])).run()
}

/** Public news has its own member read state, independent of the bell and its Mark all read action. */
export async function publicAnnouncementRoutes(request: Request, db: Database, user: User | null): Promise<Response | null> {
  if (new URL(request.url).pathname !== '/api/announcements/mine') return null
  const member = needMember(user)
  if (request.method === 'GET') return response({ items: await publicAnnouncementItems(db, member.id) })
  if (request.method === 'PATCH') {
    const { ids } = await jsonBody(request)
    if (!Array.isArray(ids) || !ids.length || ids.length > 50 || ids.some(id => typeof id !== 'string' || !/^announcement-[a-f0-9]{32}$/.test(id))) throw new HttpError(400, 'Choose up to 50 public announcements.')
    await markAnnouncementsRead(db, member.id, ids, 'public')
    return response({ ok: true })
  }
  throw new HttpError(404, 'Announcement route not found.')
}

export const adminText = (value: unknown, label: string, minimum: number, maximum: number) => {
  if (typeof value !== 'string') throw new HttpError(400, `${label} is required.`)
  const trimmed = value.trim()
  if (trimmed.length < minimum || trimmed.length > maximum) throw new HttpError(400, `${label} needs ${minimum} to ${maximum} characters.`)
  // Tab, line feed and carriage return are fine in a message; every other control character cannot be shown.
  if ([...trimmed].some(character => { const code = character.charCodeAt(0); return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127 })) throw new HttpError(400, `${label} contains characters that cannot be shown.`)
  return trimmed
}
/** Announcement links use the app or the exact configured community/support destinations. */
export function announcementLink(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.length > 200) throw new HttpError(400, 'The link is too long.')
  if (value === DEVELOPMENT_DISCORD_URL || (SUPPORT_URL && value === SUPPORT_URL)) return value
  if (/^#[A-Za-z0-9][A-Za-z0-9/_.=&?-]*$/.test(value)) return value
  if (/^https:\/\/modwerk\.app\/[A-Za-z0-9/_.=&?#%-]*$/.test(value)) return value
  throw new HttpError(400, 'Link to a page in the app (#...), https://modwerk.app/, the development Discord invite or the configured Ko-fi page.')
}

/** One public announcement per newly published module; follower version updates remain in the bell. */
export async function moduleReleaseAnnouncement(db: Database, release: ModuleRelease) {
  // Hash the public module id so even the longest inventory ids fit the 64-character key limit.
  const slug = 'module-release-' + (await digest(release.id)).slice(0, 48)
  return db.prepare(`INSERT INTO announcements(id,slug,title,body,url,module_id,created_by,visibility) VALUES(${newId},?,?,?,?,?,?,'public') ON CONFLICT(slug) DO NOTHING`)
    .bind(slug, release.name.slice(0, 103) + ' is now available', `${release.name} ${release.version} is now available. Open the module to explore its features and add it to your configuration.`, release.href, release.id, ADMIN_ACTOR)
}

/** Operator-only: list, send and retract announcements, including automatic module releases. */
export async function adminAnnouncements(request: Request, db: Database, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/admin/announcements')) return null
  if (path === '/api/admin/announcements' && request.method === 'GET') {
    // Reads and audience count eligible members; the card totals count every viewer, signed in or not, without identifying anyone.
    return response((await db.prepare(`SELECT a.id,a.slug,a.title,a.body,a.url,a.module_id,a.created_at,a.visibility,(SELECT COUNT(*) FROM announcement_reads r WHERE r.announcement_id=a.id) AS reads,
      (SELECT COUNT(*) FROM users u WHERE ${AUDIENCE} AND u.email_verified=1 AND u.suspended=0 AND u.username IS NOT NULL AND NOT EXISTS(SELECT 1 FROM social_pending_accounts s WHERE s.user_id=u.id)) AS audience,
      COALESCE(c.shown,0) AS shown,COALESCE(c.opened,0) AS opened,COALESCE(c.dismissed,0) AS dismissed,(SELECT value FROM usage_meta WHERE key='announcement_counts_started') AS counts_started
      FROM announcements a LEFT JOIN announcement_counts c ON c.announcement_id=a.id ORDER BY a.created_at DESC,a.rowid DESC LIMIT 50`).all()).results)
  }
  if (path === '/api/admin/announcements' && request.method === 'POST') {
    const body = await jsonBody(request)
    await throttle(db, 'admin-announcement', 20)
    const slug = adminText(body.slug, 'The key', 3, 64)
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new HttpError(400, 'The key uses lowercase letters, digits and hyphens.')
    const title = adminText(body.title, 'The title', 3, 120), message = adminText(body.body, 'The message', 1, 400), url = announcementLink(body.url)
    const audience = body.visibility === undefined ? 'signed-in' : visibility(body.visibility)
    let moduleId: string | null = null
    if (body.moduleId !== undefined && body.moduleId !== null && body.moduleId !== '') {
      if (typeof body.moduleId !== 'string' || !communityModule(body.moduleId)) throw new HttpError(400, 'Choose a module in the catalog.')
      moduleId = body.moduleId
    }
    const created = await db.prepare(`INSERT INTO announcements(id,slug,title,body,url,module_id,created_by,visibility) VALUES(${newId},?,?,?,?,?,?,?) ON CONFLICT(slug) DO NOTHING RETURNING id`)
      .bind(slug, title, message, url, moduleId, ADMIN_ACTOR, audience).first<{ id: string }>()
    if (!created) throw new HttpError(409, 'An announcement with this key was already sent.')
    return response({ id: created.id }, 201)
  }
  const match = path.match(/^\/api\/admin\/announcements\/([a-f0-9]{32})$/)
  if (match && request.method === 'PATCH') {
    const body = await jsonBody(request)
    if (Object.keys(body).some(key => key !== 'visibility')) throw new HttpError(400, 'Only announcement visibility can be changed.')
    const audience = visibility(body.visibility)
    await throttle(db, 'admin-announcement', 20)
    if (!(await db.prepare('UPDATE announcements SET visibility=? WHERE id=? RETURNING id').bind(audience, match[1]).first())) throw new HttpError(404, 'Announcement not found.')
    return response({ ok: true })
  }
  if (match && request.method === 'DELETE') {
    if (!(await db.prepare('DELETE FROM announcements WHERE id=? RETURNING id').bind(match[1]).first())) throw new HttpError(404, 'Announcement not found.')
    return response({ ok: true })
  }
  throw new HttpError(404, 'Announcement route not found.')
}
