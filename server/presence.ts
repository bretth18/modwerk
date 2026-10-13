import type { Database, Env, User } from './platform'
import { HttpError, jsonBody, response } from './security'
import { throttle } from './auth'

/** A visitor counts as online while their last visible-tab poll is this recent. */
export const ONLINE_SECONDS = 300
/** Presence is rewritten at most this often, so a minute's poll usually writes nothing. */
const WRITE_SECONDS = 120
const DAY_SECONDS = 86400

/** Called from the bell's unread poll. The first sighting of a member on a UTC day adds one to that day's
 * aggregate count; the presence row keeps only the latest time and is overwritten, never appended. */
export async function notePresence(db: Database, userId: string, now = Date.now()) {
  const seconds = Math.floor(now / 1000), dayStart = seconds - seconds % DAY_SECONDS
  const day = new Date(dayStart * 1000).toISOString().slice(0, 10)
  // One batch is one transaction, so two concurrent polls cannot both count the same member as new today.
  await db.batch([
    db.prepare('INSERT INTO member_activity_daily(day,members) SELECT ?,1 WHERE NOT EXISTS(SELECT 1 FROM member_presence WHERE user_id=? AND seen_at>=?) ON CONFLICT(day) DO UPDATE SET members=members+1').bind(day, userId, dayStart),
    db.prepare('INSERT INTO member_presence(user_id,seen_at) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET seen_at=excluded.seen_at WHERE member_presence.seen_at<=excluded.seen_at-? OR member_presence.seen_at<?').bind(userId, seconds, WRITE_SECONDS, dayStart),
  ])
}

/** At most this many public names are listed; every active person remains in the total. */
export const ONLINE_LIST = 12
/** Public: all active visitors, with member names only when the account permits it. Signed-in accounts are counted
 * once across both check-in sources and devices; anonymous browsers use a short-lived connection digest.
 * Keep the bell source: older tabs and members opting out of anonymous counts still send that existing poll. */
export async function membersOnline(db: Database, now = Date.now()) {
  const since = Math.floor(now / 1000) - ONLINE_SECONDS
  // One snapshot keeps the total, guest subtotal and public names consistent as check-ins arrive.
  const rows = await db.prepare(`WITH recent_site AS (
    SELECT * FROM site_presence WHERE seen_at>=?
  ), member_sightings AS (
    SELECT user_id,seen_at FROM recent_site WHERE user_id IS NOT NULL
    UNION ALL
    SELECT p.user_id,p.seen_at FROM member_presence p JOIN users u ON u.id=p.user_id
    WHERE p.seen_at>=? AND u.suspended=0 AND u.email_verified=1 AND u.username IS NOT NULL
      AND NOT EXISTS(SELECT 1 FROM social_pending_accounts s WHERE s.user_id=u.id)
      AND NOT EXISTS(SELECT 1 FROM recent_site s WHERE s.signed_out_user_id=p.user_id AND s.signed_out_at>=p.seen_at)
  ), people AS (
    SELECT user_id,MAX(seen_at) AS seen_at FROM member_sightings GROUP BY user_id
  )
  SELECT u.username,u.avatar_id AS avatar,
    (SELECT COUNT(*) FROM people) + (SELECT COUNT(*) FROM recent_site WHERE user_id IS NULL) AS online,
    (SELECT COUNT(*) FROM recent_site WHERE user_id IS NULL) AS guests
  FROM (SELECT 1) LEFT JOIN people p ON TRUE LEFT JOIN users u ON u.id=p.user_id
    AND u.suspended=0 AND u.email_verified=1 AND u.username IS NOT NULL AND u.show_online=1
    AND NOT EXISTS(SELECT 1 FROM social_pending_accounts s WHERE s.user_id=u.id)
  ORDER BY u.username IS NULL,p.seen_at DESC,u.username LIMIT ?`).bind(since,since,ONLINE_LIST).all<{ username: string | null; avatar: string | null; online: number; guests: number }>()
  const online = rows.results[0]?.online ?? 0, guests = rows.results[0]?.guests ?? 0
  const members = rows.results.flatMap(row => row.username ? [{ username: row.username, avatar: row.avatar }] : [])
  return { online, members, guests, more: Math.max(0, online - members.length) }
}

/** Keep only the latest sighting, and immediately replace the account link on sign-in/sign-out. */
export async function noteSitePresence(db: Database, visitorHash: string, userId: string | null, now = Date.now(), previousHash?: string) {
  const seconds = Math.floor(now / 1000)
  await db.batch([
    // Preserve a recent sign-out through the daily digest rotation, before deleting yesterday's row.
    db.prepare(`INSERT INTO site_presence(visitor_hash,user_id,seen_at,signed_out_user_id,signed_out_at)
      SELECT ?,?, ?,CASE WHEN ? IS NULL THEN COALESCE(p.user_id,p.signed_out_user_id) END,
        CASE WHEN ? IS NULL AND COALESCE(p.user_id,p.signed_out_user_id) IS NOT NULL THEN COALESCE(p.signed_out_at,?) END
      FROM (SELECT 1) LEFT JOIN site_presence p ON p.visitor_hash=? AND p.seen_at>=? WHERE TRUE
      ON CONFLICT(visitor_hash) DO UPDATE SET user_id=excluded.user_id,seen_at=excluded.seen_at,
        signed_out_user_id=CASE WHEN excluded.user_id IS NULL THEN COALESCE(site_presence.user_id,site_presence.signed_out_user_id,excluded.signed_out_user_id) END,
        signed_out_at=CASE WHEN excluded.user_id IS NULL THEN COALESCE(site_presence.signed_out_at,CASE WHEN site_presence.user_id IS NOT NULL THEN excluded.seen_at END,excluded.signed_out_at) END
      WHERE site_presence.seen_at<=excluded.seen_at-? OR site_presence.user_id IS NOT excluded.user_id`).bind(visitorHash,userId,seconds,userId,userId,seconds,previousHash ?? null,seconds - ONLINE_SECONDS,WRITE_SECONDS),
    ...(previousHash ? [db.prepare('DELETE FROM site_presence WHERE visitor_hash=?').bind(previousHash)] : []),
  ])
}

async function presenceHash(secret: string, day: number, purpose: string, ip: string, agent = '') {
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
  const message = JSON.stringify(['modwerk-presence-v1',day,purpose,ip,agent])
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message))),byte=>byte.toString(16).padStart(2,'0')).join('')
}

/** A visible tab checks in without creating any browser identifier or cookie. Raw IP/UA are never stored.
 * Reads stay read-only; privacy signals skip the check-in but can still read the public total. */
export async function sitePresenceRoute(request: Request, env: Env, db: Database, user: User | null) {
  const body = await jsonBody(request,64)
  if (Object.keys(body).length) throw new HttpError(400,'Presence check-ins do not accept visitor or account details.')
  if (request.headers.get('DNT') !== '1' && request.headers.get('Sec-GPC') !== '1') {
    const secret = env.ADMIN_KEY_SHA256?.trim().toLowerCase() ?? ''
    if (!/^[a-f0-9]{64}$/.test(secret)) throw new HttpError(503,'Site presence is not configured.')
    const now = Date.now(), seconds = Math.floor(now / 1000), day = Math.floor(seconds / DAY_SECONDS)
    const ip = request.headers.get('CF-Connecting-IP') ?? 'local', agent = (request.headers.get('User-Agent') ?? '').slice(0,512)
    await throttle(db,'site-presence:' + await presenceHash(secret,day,'rate',ip),600)
    const visitorHash = await presenceHash(secret,day,'visitor',ip,agent)
    // The first poll after midnight removes the same browser's previous digest instead of counting it twice.
    const previousHash = seconds % DAY_SECONDS <= ONLINE_SECONDS ? await presenceHash(secret,day - 1,'visitor',ip,agent) : undefined
    await noteSitePresence(db,visitorHash,user?.id ?? null,now,previousHash)
  }
  return response(await membersOnline(db))
}

/** Hourly: expired site visits are removed; historical member timestamps remain for 31 days. Daily member counts
 * name no one and stay, so the first collected day remains known and quiet days read as zero rather than missing. */
export async function cleanupPresence(db: Database, now = Date.now()) {
  await db.prepare('DELETE FROM member_presence WHERE seen_at<?').bind(Math.floor(now / 1000) - 31 * DAY_SECONDS).run()
  await db.prepare('DELETE FROM site_presence WHERE seen_at<?').bind(Math.floor(now / 1000) - ONLINE_SECONDS).run()
}
