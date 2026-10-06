import type { Database } from './platform'

/** A member counts as online while their last poll is this recent. The bell polls every 60 s while the tab is visible. */
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

/** Public: a single number, never names. Suspended members drop out at once. */
export async function membersOnline(db: Database, now = Date.now()) {
  const row = await db.prepare('SELECT COUNT(*) AS online FROM member_presence p JOIN users u ON u.id=p.user_id WHERE p.seen_at>=? AND u.suspended=0').bind(Math.floor(now / 1000) - ONLINE_SECONDS).first<{ online: number }>()
  return { online: row?.online ?? 0 }
}

/** Hourly: a last-seen time goes 31 days after the visit. Daily counts name no one and stay, so the first
 * collected day remains known and quiet days read as zero rather than as missing. */
export async function cleanupPresence(db: Database, now = Date.now()) {
  await db.prepare('DELETE FROM member_presence WHERE seen_at<?').bind(Math.floor(now / 1000) - 31 * DAY_SECONDS).run()
}
