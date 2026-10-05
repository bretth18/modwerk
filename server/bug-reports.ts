import type { Database } from './platform'
import { communityModule, type CommunityModule } from '../src/community/modules'
import { isDigiIssue, OT_MODELS, type IssueContext } from '../src/community/issue-context'
import type { OtLog } from '../src/community/ot-log'

/** Current, claimed, GitHub-verified maintainers of a catalog module, excluding one member. */
function moduleDevelopers(module: CommunityModule, excludedId: string) {
  const handles = module.maintainers.map(login => login.toLowerCase())
  const recipients = `SELECT m.user_id FROM module_maintainers m JOIN users u ON u.id=m.user_id WHERE m.module_id=? AND m.revoked=0 AND u.suspended=0 AND u.github_id IS NOT NULL AND lower(u.github_login)=lower(m.github_login) AND lower(m.github_login) IN (${handles.map(() => '?').join(',')}) AND m.user_id<>?`
  return { recipients, values: [module.id, ...handles, excludedId] }
}
export function followModuleDevelopers(db: Database, module: CommunityModule, threadId: string, excludedId = '') {
  const { recipients, values } = moduleDevelopers(module, excludedId)
  return db.prepare(`INSERT INTO forum_follows(thread_id,user_id) SELECT ?,user_id FROM (${recipients}) WHERE 1 ON CONFLICT DO NOTHING`).bind(threadId,...values)
}
/** Deliver public bugs to current, claimed, GitHub-verified module maintainers. */
export function notifyBugDevelopers(db: Database, moduleId: string | null, threadId: string, postId: string, reporterId: string) {
  const module = moduleId ? communityModule(moduleId) : undefined
  if (!module) return []
  const { recipients, values } = moduleDevelopers(module, reporterId)
  return [
    followModuleDevelopers(db, module, threadId, reporterId),
    db.prepare(`INSERT INTO forum_notifications(id,user_id,thread_id,post_id) SELECT lower(hex(randomblob(16))),user_id,?,? FROM (${recipients})`).bind(threadId,postId,...values),
  ]
}

/** Keep the complete configuration, build fingerprint and log out of public threads. */
export function publicBugDetails(moduleId: string, context: IssueContext, log: OtLog | null, steps: string, expected: string, actual: string) {
  const nativeId = communityModule(moduleId)?.moduleId ?? moduleId
  const version = isDigiIssue(context) ? context.moduleVersion : log?.summary.modules.find(item => item.id===nativeId)?.version ?? context.modules.find(item => item.id===nativeId)?.version ?? 'Not recorded'
  return {device:(isDigiIssue(context)?context.model:OT_MODELS[context.model])+' · OS '+context.os,version,steps,expected,actual}
}
