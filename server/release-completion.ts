import registeredAuthors from '../.github/module-authors.json'
import type { Database, Env, User } from './platform'
import type { CommunityModule } from '../src/community/modules'
import { publishedModuleReleases, recordModuleReleases } from './module-updates'
import { githubConfig, resolveGithubRelease } from './github'
import { issueStatusStatements } from './issue-notifications'
import { throttle } from './auth'
import { HttpError, jsonBody, response } from './security'

export function requireRegisteredReleaseAuthor(member: User) {
  const id = (registeredAuthors.accounts as Record<string, number>)[member.github_login?.toLowerCase() ?? '']
  if (!id || id !== Number(member.github_id)) throw new HttpError(403, 'The module release account must match its registered GitHub identity.')
}

/** Called only after current, unrevoked module ownership is checked by developerApi. */
export async function completeModuleRelease(request: Request, env: Env, db: Database, member: User, module: CommunityModule) {
  requireRegisteredReleaseAuthor(member)
  const body = await jsonBody(request)
  if (Object.keys(body).sort().join(',') !== 'issues,verifiedDownload,version' || body.verifiedDownload !== true || body.version !== module.version || !Array.isArray(body.issues) || body.issues.length > 25 || body.issues.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(id)) || new Set(body.issues).size !== body.issues.length) throw new HttpError(400, 'Confirm the current published download and list the reports it fixes.')
  await throttle(db, 'release-completion:' + member.id, 20)
  type Report = { id: string; status: string; github_number: number | null }
  const reports: Report[] = []
  for (const id of body.issues) {
    const report = await db.prepare('SELECT id,status,github_number FROM issues WHERE id=? AND module_id=? AND maintainer_sharing=1 AND public_sharing=0').bind(id, module.id).first<Report>()
    if (!report) throw new HttpError(404, 'A report is outside your shared module access.')
    reports.push(report)
  }
  let published
  try { published = await publishedModuleReleases(env) } catch { throw new HttpError(503, 'The live release could not be verified. Keep the reports open and retry.') }
  const release = published.find(item => item.id === module.id && item.version === body.version)
  if (!release || release.href !== module.href) throw new HttpError(409, 'This module version is not live yet. Keep the reports open until publication succeeds.')
  const config = githubConfig(env)
  if (reports.some(report => report.status !== 'closed' && report.github_number !== null) && !config) throw new HttpError(503, 'GitHub report closure is not configured. Keep the reports open.')
  // Reuse the regular monotonic, preference-aware fanout; a subset cannot establish
  // the complete-library baseline or announce unrelated modules on first initialization.
  await recordModuleReleases(db, [release], false)
  for (const report of reports) {
    if (report.status === 'closed') continue
    if (report.github_number !== null && config) await resolveGithubRelease(config, report.github_number, module.id, release.version, release.href, env.APP_URL!)
    await db.batch([
      ...issueStatusStatements(db, report.id, 'closed', member.id),
      db.prepare('INSERT INTO developer_events(id,actor_id,module_id,issue_id,action,note) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), member.id, module.id, report.id, 'release-resolved', release.version),
    ])
  }
  const queued = await db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE kind='module_update' AND module_id=? AND module_version=?").bind(module.id, release.version).first<{ count: number }>()
  return response({ version: release.version, resolved: reports.map(report => report.id), updateNotificationsQueued: queued?.count ?? 0 })
}
