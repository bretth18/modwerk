import type { Database } from './platform'
import type { AdminAccounts } from '../src/community/admin-insights-contract'

const METHODS = ['credential', 'google', 'github', 'discord'] as const
const day = (date: Date) => date.toISOString().slice(0, 10)

/** Aggregate account counts only; no email, provider profile or per-member row leaves this function.
 * Authorization is enforced by the enclosing /api/admin/ boundary. Deleted accounts no longer count as sign-ups. */
export async function adminAccounts(db: Database, now = new Date(), days = 30): Promise<AdminAccounts> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)))
  const since = (offset: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset)).toISOString()
  const seconds = Math.floor(now.getTime() / 1000)
  const [totals, signups, methods, daily] = await Promise.all([
    db.prepare(`SELECT
      (SELECT COUNT(*) FROM auth_users a JOIN users u ON u.id=a.id WHERE a.emailVerified=1 AND u.suspended=0 AND NOT EXISTS(SELECT 1 FROM social_pending_accounts p WHERE p.user_id=a.id)) AS members,
      (SELECT COUNT(*) FROM auth_users WHERE emailVerified=0) AS unverified,
      (SELECT COUNT(*) FROM social_pending_accounts WHERE expires>?) AS pendingSocial,
      (SELECT COUNT(*) FROM auth_users a JOIN users u ON u.id=a.id WHERE u.suspended=1) AS suspended,
      (SELECT COUNT(*) FROM users u WHERE u.suspended=1 AND u.username IS NULL AND NOT EXISTS(SELECT 1 FROM auth_users a WHERE a.id=u.id)) AS deleted,
      (SELECT COUNT(*) FROM users WHERE is_admin=1 AND suspended=0) AS administrators,
      (SELECT COUNT(*) FROM account_news_preferences WHERE enabled=1) AS newsOptIns`).bind(seconds).first<AdminAccounts['totals']>(),
    db.prepare('SELECT COALESCE(SUM(createdAt>=?),0) AS today,COALESCE(SUM(createdAt>=?),0) AS last7,COALESCE(SUM(createdAt>=?),0) AS last30 FROM auth_users')
      .bind(since(0), since(6), since(29)).first<AdminAccounts['signups']>(),
    db.prepare('SELECT providerId AS method,COUNT(DISTINCT userId) AS members FROM auth_accounts GROUP BY providerId').all<{ method: string; members: number }>(),
    db.prepare('SELECT substr(createdAt,1,10) AS day,COUNT(*) AS signups FROM auth_users WHERE createdAt>=? GROUP BY day').bind(start.toISOString()).all<{ day: string; signups: number }>(),
  ])
  if (!totals || !signups) throw new Error('Unable to read account aggregates.')
  const byMethod = new Map(methods.results.map(row => [row.method, row.members]))
  const byDay = new Map(daily.results.map(row => [row.day, row.signups]))
  const rows = Array.from({ length: days }, (_, index) => { const value = day(new Date(start.getTime() + index * 86400000)); return { day: value, signups: byDay.get(value) ?? 0 } })
  return { generatedAt: now.toISOString(), from: day(start), to: day(now), totals, signups, methods: METHODS.map(method => ({ method, members: byMethod.get(method) ?? 0 })), daily: rows }
}
