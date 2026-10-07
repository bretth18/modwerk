import type { Database } from './platform'
import { SYSTEM_AUTHOR } from './module-threads'

/** Timestamps in the CURRENT_TIMESTAMP shape the forum tables use, so they compare as text. */
const stamp = (now: number) => new Date(now).toISOString().slice(0, 19).replace('T', ' ')
const MINUTE = 60000
/** A forum home load this long after the last one starts a new visit; the old time becomes "your last visit". */
const VISIT_GAP = 30 * MINUTE
/** The visit's last-seen time is rewritten at most this often. */
const SEEN_WRITE = 2 * MINUTE

/** Joins a member's unread state next to thread `t`: `me` (their ID and the cutoff before which nothing counts, the later of
 * joining and "Mark all as read"), `tr` (their read marker) and `rp` (the post that marker names). Binds the member ID twice. */
export const UNREAD_JOINS = "LEFT JOIN (SELECT u.id,MAX(u.created_at,COALESCE(v.all_read_at,'')) AS cutoff FROM users u LEFT JOIN forum_visits v ON v.member_id=u.id WHERE u.id=?) me ON 1 LEFT JOIN forum_thread_reads tr ON tr.thread_id=t.id AND tr.member_id=? LEFT JOIN forum_posts rp ON rp.id=tr.last_read_post_id"
/** A reply `np` in thread `t` the member has not seen: visible, by someone else, after the cutoff and after the read marker. */
const NEW_POST = 'np.thread_id=t.id AND np.hidden=0 AND np.user_id<>me.id AND np.created_at>=me.cutoff AND (rp.id IS NULL OR np.created_at>rp.created_at OR (np.created_at=rp.created_at AND np.rowid>rp.rowid)) AND np.id<>(SELECT first.id FROM forum_posts first WHERE first.thread_id=t.id ORDER BY first.created_at,first.rowid LIMIT 1)'
/** Unread: new replies, or a thread by someone else started after the cutoff that the member never opened. */
export const UNREAD = `(EXISTS(SELECT 1 FROM forum_posts np WHERE ${NEW_POST}) OR (tr.member_id IS NULL AND t.created_at>=me.cutoff AND t.user_id<>me.id))`
export const UNREAD_FIELDS = `${UNREAD} AS unread,(SELECT COUNT(*) FROM forum_posts np WHERE ${NEW_POST}) AS new_replies`

/** The marker moves forward only: viewing an earlier page again does not make later replies new. */
export function recordThreadRead(db: Database, memberId: string, threadId: string, postId: string) {
  return db.prepare('INSERT INTO forum_thread_reads(member_id,thread_id,last_read_at,last_read_post_id) VALUES(?,?,CURRENT_TIMESTAMP,?) ON CONFLICT(member_id,thread_id) DO UPDATE SET last_read_at=excluded.last_read_at,last_read_post_id=excluded.last_read_post_id WHERE forum_thread_reads.last_read_post_id IS NULL OR EXISTS(SELECT 1 FROM forum_posts o JOIN forum_posts n ON n.id=excluded.last_read_post_id WHERE o.id=forum_thread_reads.last_read_post_id AND (n.created_at>o.created_at OR (n.created_at=o.created_at AND n.rowid>o.rowid)))').bind(memberId, threadId, postId)
}

/** After UNREAD_JOINS: `fu` is the first reply the member has not seen, for "Jump to first unread", with the page that holds it. */
export const FIRST_UNREAD_JOIN = `LEFT JOIN forum_posts fu ON fu.id=(SELECT np.id FROM forum_posts np WHERE ${NEW_POST} ORDER BY np.created_at,np.rowid LIMIT 1)`
export const FIRST_UNREAD_FIELDS = 'fu.id AS first_unread_id,(SELECT CAST(COUNT(*)/30 AS INTEGER) FROM forum_posts preceding WHERE preceding.thread_id=t.id AND (preceding.created_at<fu.created_at OR (preceding.created_at=fu.created_at AND preceding.rowid<fu.rowid))) AS first_unread_page'

export type ForumVisit = { since: string | null; newThreads: number; newReplies: number; unreadFollowed: number }
/** Opening the forum home notes the visit and answers what happened since the previous one: threads started, replies in
 * followed threads (both by other people) and how many followed threads are unread now. A load more than 30 minutes after
 * the last one begins a new visit, so the counts hold still while the member reads; the first visit ever has no "since". */
export async function noteForumVisit(db: Database, memberId: string, now = Date.now()): Promise<ForumVisit> {
  const [, counts] = await db.batch([
    db.prepare('INSERT INTO forum_visits(member_id,seen_at) VALUES(?,?) ON CONFLICT(member_id) DO UPDATE SET last_visit_at=CASE WHEN forum_visits.seen_at<=? THEN forum_visits.seen_at ELSE forum_visits.last_visit_at END,seen_at=excluded.seen_at WHERE forum_visits.seen_at<=?').bind(memberId, stamp(now), stamp(now - VISIT_GAP), stamp(now - SEEN_WRITE)),
    db.prepare(`SELECT v.last_visit_at AS since,
      (SELECT COUNT(*) FROM forum_threads t WHERE t.hidden=0 AND t.user_id<>'${SYSTEM_AUTHOR}' AND t.user_id<>v.member_id AND t.created_at>=v.last_visit_at) AS newThreads,
      (SELECT COUNT(*) FROM forum_follows f JOIN forum_threads t ON t.id=f.thread_id JOIN forum_posts p ON p.thread_id=t.id WHERE f.user_id=v.member_id AND t.hidden=0 AND p.hidden=0 AND p.user_id<>v.member_id AND p.created_at>=v.last_visit_at AND p.id<>(SELECT first.id FROM forum_posts first WHERE first.thread_id=t.id ORDER BY first.created_at,first.rowid LIMIT 1)) AS newReplies,
      (SELECT COUNT(*) FROM forum_follows f JOIN forum_threads t ON t.id=f.thread_id ${UNREAD_JOINS} WHERE f.user_id=v.member_id AND t.hidden=0 AND ${UNREAD}) AS unreadFollowed
      FROM forum_visits v WHERE v.member_id=?`).bind(memberId, memberId, memberId),
  ]) as [unknown, { results: ForumVisit[] }]
  return counts.results[0] ?? { since: null, newThreads: 0, newReplies: 0, unreadFollowed: 0 }
}

/** "Mark all as read": nothing posted so far counts as unread, and the "since your last visit" block starts over. */
export async function markForumRead(db: Database, memberId: string, now = Date.now()) {
  await db.prepare('INSERT INTO forum_visits(member_id,seen_at,last_visit_at,all_read_at) VALUES(?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET seen_at=excluded.seen_at,last_visit_at=excluded.last_visit_at,all_read_at=excluded.all_read_at').bind(memberId, stamp(now), stamp(now), stamp(now)).run()
}
