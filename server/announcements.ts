import type { Database } from './platform'
import { ADMIN_ACTOR, throttle } from './auth'
import { HttpError, jsonBody, response } from './security'
import { communityModule } from '../src/community/modules'
import type { BellItem } from '../src/community/notification-contract'

/** Bell ids of announcements carry this prefix, so one list and one read call serve both kinds. */
export const ANNOUNCEMENT_PREFIX = 'announcement-'
const LISTED = 10
const newId = 'lower(hex(randomblob(16)))'
type Row = { id: string; title: string; body: string; url: string | null; module_id: string | null; created_at: string; seen: number }

/** Announcements go out to every member, so only the newest few are listed; the unread count covers all of them. */
const VISIBLE = 'FROM announcements a JOIN users u ON u.id=? LEFT JOIN announcement_reads r ON r.announcement_id=a.id AND r.user_id=u.id WHERE a.created_at>=u.created_at'

export async function announcementItems(db: Database, memberId: string): Promise<BellItem[]> {
  const rows = (await db.prepare(`SELECT a.id,a.title,a.body,a.url,a.module_id,a.created_at,r.announcement_id IS NOT NULL AS seen ${VISIBLE} ORDER BY a.created_at DESC,a.rowid DESC LIMIT ${LISTED}`).bind(memberId).all<Row>()).results
  return rows.map(row => ({
    id: ANNOUNCEMENT_PREFIX + row.id, kind: 'announcement', seen: !!row.seen, created_at: row.created_at, thread_id: null, post_id: null, module_id: row.module_id,
    actor: null, actorOfficial: true, title: row.title, excerpt: row.body, rating: null, issue_id: null, github_actor: null, url: row.url,
  }))
}

export async function announcementUnread(db: Database, memberId: string) {
  return (await db.prepare(`SELECT COUNT(*) AS unread ${VISIBLE} AND r.announcement_id IS NULL`).bind(memberId).first<{ unread: number }>())?.unread ?? 0
}

/** Marks the given bell ids, or every announcement the member can see, as read. */
export async function markAnnouncementsRead(db: Database, memberId: string, ids: string[] | null) {
  const own = ids?.map(id => id.slice(ANNOUNCEMENT_PREFIX.length))
  if (own && !own.length) return
  await db.prepare(`INSERT OR IGNORE INTO announcement_reads(user_id,announcement_id) SELECT u.id,a.id FROM announcements a JOIN users u ON u.id=? WHERE a.created_at>=u.created_at${own ? ` AND a.id IN (${own.map(() => '?').join(',')})` : ''}`)
    .bind(memberId, ...(own ?? [])).run()
}

const text = (value: unknown, label: string, minimum: number, maximum: number) => {
  if (typeof value !== 'string') throw new HttpError(400, `${label} is required.`)
  const trimmed = value.trim()
  if (trimmed.length < minimum || trimmed.length > maximum) throw new HttpError(400, `${label} needs ${minimum} to ${maximum} characters.`)
  // Tab, line feed and carriage return are fine in a message; every other control character cannot be shown.
  if ([...trimmed].some(character => { const code = character.charCodeAt(0); return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127 })) throw new HttpError(400, `${label} contains characters that cannot be shown.`)
  return trimmed
}
/** A bell link opens inside the app or on modwerk.app, nowhere else. */
export function announcementLink(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.length > 200) throw new HttpError(400, 'The link is too long.')
  if (/^#[A-Za-z0-9][A-Za-z0-9/_.=&?-]*$/.test(value)) return value
  if (/^https:\/\/modwerk\.app\/[A-Za-z0-9/_.=&?#%-]*$/.test(value)) return value
  throw new HttpError(400, 'Link to a page in the app (#...) or to https://modwerk.app/ only.')
}

/** Operator-only: list, send and retract announcements. Sending is the only way one is created. */
export async function adminAnnouncements(request: Request, db: Database, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/admin/announcements')) return null
  if (path === '/api/admin/announcements' && request.method === 'GET') {
    return response((await db.prepare('SELECT a.id,a.slug,a.title,a.body,a.url,a.module_id,a.created_at,(SELECT COUNT(*) FROM announcement_reads r WHERE r.announcement_id=a.id) AS reads FROM announcements a ORDER BY a.created_at DESC,a.rowid DESC LIMIT 50').all()).results)
  }
  if (path === '/api/admin/announcements' && request.method === 'POST') {
    const body = await jsonBody(request)
    await throttle(db, 'admin-announcement', 20)
    const slug = text(body.slug, 'The key', 3, 64)
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new HttpError(400, 'The key uses lowercase letters, digits and hyphens.')
    const title = text(body.title, 'The title', 3, 120), message = text(body.body, 'The message', 1, 400), url = announcementLink(body.url)
    let moduleId: string | null = null
    if (body.moduleId !== undefined && body.moduleId !== null && body.moduleId !== '') {
      if (typeof body.moduleId !== 'string' || !communityModule(body.moduleId)) throw new HttpError(400, 'Choose a module in the catalog.')
      moduleId = body.moduleId
    }
    const created = await db.prepare(`INSERT INTO announcements(id,slug,title,body,url,module_id,created_by) VALUES(${newId},?,?,?,?,?,?) ON CONFLICT(slug) DO NOTHING RETURNING id`)
      .bind(slug, title, message, url, moduleId, ADMIN_ACTOR).first<{ id: string }>()
    if (!created) throw new HttpError(409, 'An announcement with this key was already sent.')
    return response({ id: created.id }, 201)
  }
  const match = path.match(/^\/api\/admin\/announcements\/([a-f0-9]{32})$/)
  if (match && request.method === 'DELETE') {
    if (!(await db.prepare('DELETE FROM announcements WHERE id=? RETURNING id').bind(match[1]).first())) throw new HttpError(404, 'Announcement not found.')
    return response({ ok: true })
  }
  throw new HttpError(404, 'Announcement route not found.')
}
