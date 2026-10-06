import type { Database } from './platform'
import type { AdminAccounts, AdminAccountsDay } from '../src/community/admin-insights-contract'
import { HttpError } from './security'
import { ONLINE_SECONDS } from './presence'

const METHODS = ['credential', 'google', 'github', 'discord'] as const
const day = (date: Date) => date.toISOString().slice(0, 10)
const before = (now: Date, days: number) => day(new Date(now.getTime() - days * 86400000))
/** A member has completed sign-up once the email is verified and any social onboarding has finished. */
const COMPLETED = 'a.emailVerified=1 AND NOT EXISTS(SELECT 1 FROM social_pending_accounts p WHERE p.user_id=a.id)'
/** Members seen by the bell's presence poll since a given second; suspended members drop out. */
const SEEN_SINCE = '(SELECT COUNT(*) FROM member_presence p JOIN users u ON u.id=p.user_id WHERE u.suspended=0 AND p.seen_at>=?)'

/** Aggregate account counts only; no email, provider profile or per-member row leaves this function.
 * Authorization is enforced by the enclosing /api/admin/ boundary. Deleted accounts no longer count as sign-ups.
 * Daily visitors come from the same usage_daily totals as the site statistics, so sign-ups can be read against traffic. */
export async function adminAccounts(db: Database, now = new Date(), days = 30): Promise<AdminAccounts> {
  if (![7, 30, 90].includes(days)) throw new HttpError(400, 'Choose 7, 30 or 90 days.')
  const from = before(now, days - 1), to = day(now)
  // Equal windows of completed days, as in the usage statistics: today is excluded from both.
  const previousFrom = before(now, 2 * (days - 1)), previousTo = before(now, days)
  const outsideRetention = previousFrom < before(now, 89)
  const since = (offset: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset)).toISOString()
  const seconds = Math.floor(now.getTime() / 1000)
  const [totals, signups, methods, daily, usage, meta, active] = await Promise.all([
    db.prepare(`SELECT
      (SELECT COUNT(*) FROM auth_users a JOIN users u ON u.id=a.id WHERE ${COMPLETED} AND u.suspended=0) AS members,
      (SELECT COUNT(*) FROM auth_users WHERE emailVerified=0) AS unverified,
      (SELECT COUNT(*) FROM social_pending_accounts WHERE expires>?) AS pendingSocial,
      (SELECT COUNT(*) FROM auth_users a JOIN users u ON u.id=a.id WHERE u.suspended=1) AS suspended,
      (SELECT COUNT(*) FROM users u WHERE u.suspended=1 AND u.username IS NULL AND NOT EXISTS(SELECT 1 FROM auth_users a WHERE a.id=u.id)) AS deleted,
      (SELECT COUNT(*) FROM users WHERE is_admin=1 AND suspended=0) AS administrators,
      (SELECT COUNT(*) FROM account_news_preferences WHERE enabled=1) AS newsOptIns,
      ${SEEN_SINCE} AS online, ${SEEN_SINCE} AS activeDay, ${SEEN_SINCE} AS activeWeek, ${SEEN_SINCE} AS activeMonth,
      (SELECT COUNT(DISTINCT p.user_id) FROM forum_posts p JOIN users u ON u.id=p.user_id WHERE p.hidden=0 AND u.suspended=0 AND p.created_at>=?) AS postersMonth,
      (SELECT MIN(day) FROM member_activity_daily) AS activeFrom`)
      .bind(seconds, seconds - ONLINE_SECONDS, seconds - 86400, seconds - 7 * 86400, seconds - 30 * 86400, since(29).slice(0, 10)).first<AdminAccounts['totals'] & { activeFrom: string | null }>(),
    db.prepare('SELECT COALESCE(SUM(createdAt>=?),0) AS today,COALESCE(SUM(createdAt>=?),0) AS last7,COALESCE(SUM(createdAt>=?),0) AS last30 FROM auth_users')
      .bind(since(0), since(6), since(29)).first<AdminAccounts['signups']>(),
    db.prepare('SELECT providerId AS method,COUNT(DISTINCT userId) AS members FROM auth_accounts GROUP BY providerId').all<{ method: string; members: number }>(),
    db.prepare(`SELECT substr(a.createdAt,1,10) AS day,COUNT(*) AS signups,COALESCE(SUM(${COMPLETED}),0) AS completed FROM auth_users a WHERE a.createdAt>=? GROUP BY day`)
      .bind(previousFrom).all<{ day: string; signups: number; completed: number }>(),
    db.prepare('SELECT day,visitors FROM usage_daily WHERE day>=? AND day<=?').bind(outsideRetention ? from : previousFrom, to).all<{ day: string; visitors: number }>(),
    db.prepare("SELECT value FROM usage_meta WHERE key='collection_started'").first<{ value: string }>(),
    db.prepare('SELECT day,members FROM member_activity_daily WHERE day>=?').bind(from).all<{ day: string; members: number }>(),
  ])
  if (!totals || !signups) throw new Error('Unable to read account aggregates.')
  const byMethod = new Map(methods.results.map(row => [row.method, row.members]))
  const byDay = new Map(daily.results.map(row => [row.day, row]))
  const visitorsByDay = new Map(usage.results.map(row => [row.day, row.visitors]))
  const visitorsFrom = meta?.value.slice(0, 10) ?? null
  const activeByDay = new Map(active.results.map(row => [row.day, row.members]))
  // Migration 0040 seeds its deployment day, so days before it are unknown rather than zero; that first day is partial.
  const { activeFrom, ...memberTotals } = totals
  const row = (value: string): AdminAccountsDay => ({ day: value, signups: byDay.get(value)?.signups ?? 0, completed: byDay.get(value)?.completed ?? 0,
    visitors: visitorsFrom === null || value < visitorsFrom ? null : visitorsByDay.get(value) ?? 0,
    active: activeFrom === null || value < activeFrom ? null : activeByDay.get(value) ?? 0 })
  const window = (start: string, length: number) => Array.from({ length }, (_, index) => row(day(new Date(new Date(start + 'T00:00:00Z').getTime() + index * 86400000))))
  const rows = window(from, days), earlier = window(previousFrom, days - 1)
  // Visitors for the previous window need every day collected and retained, and none of them partial.
  const previousVisitors = outsideRetention || earlier.some(item => item.visitors === null || item.day === visitorsFrom) ? null : earlier.reduce((sum, item) => sum + (item.visitors ?? 0), 0)
  const previous = { from: previousFrom, to: previousTo, signups: earlier.reduce((sum, item) => sum + item.signups, 0), completed: earlier.reduce((sum, item) => sum + item.completed, 0), visitors: previousVisitors }
  return { generatedAt: now.toISOString(), from, to, days, visitorsFrom, activeFrom, totals: memberTotals, signups, methods: METHODS.map(method => ({ method, members: byMethod.get(method) ?? 0 })), daily: rows, previous }
}
