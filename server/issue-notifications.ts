import type { Database, Statement } from './platform'
import { communityModule } from '../src/community/modules'
import { moduleDevelopers } from './bug-reports'
import type { ReportClosureReason } from '../src/community/report-closure'

/** Insert before changing the status in the same transaction, so repeated status writes notify only once. */
export function issueStatusStatements(db: Database, id: string, status: 'open' | 'closed', actorId: string | null, githubActor: string | null = null, delivery: string | null = null, resolved = true, closureReason: ReportClosureReason | null = null, closureNote = '') {
  const kind = status === 'open' ? 'issue_reopened' : resolved ? 'issue_resolved' : 'issue_closed'
  const fresh=delivery?' AND NOT EXISTS(SELECT 1 FROM github_webhook_deliveries WHERE id=?)':'',key=delivery?[delivery]:[]
  return [
    db.prepare(`INSERT INTO notifications(id,user_id,kind,actor_id,issue_id,module_id,github_actor,delivery_id,excerpt) SELECT lower(hex(randomblob(16))),i.reporter_id,?,?,i.id,i.module_id,?,?,? FROM issues i JOIN users u ON u.id=i.reporter_id WHERE i.id=? AND i.status<>? AND u.email_verified=1 AND u.suspended=0 AND i.reporter_id IS NOT ?${fresh} ON CONFLICT DO NOTHING`).bind(kind, actorId, githubActor, delivery, closureNote.slice(0,400)||null, id, status, actorId,...key),
    // A repeated close keeps the first closing time; reopening clears it.
    db.prepare("UPDATE issues SET closed_at=CASE WHEN ?='open' THEN NULL WHEN status='closed' THEN closed_at ELSE CURRENT_TIMESTAMP END,closure_reason=CASE WHEN ?='open' THEN NULL WHEN status='closed' THEN COALESCE(closure_reason,?) ELSE ? END,closure_note=CASE WHEN ?='open' THEN '' WHEN status='closed' AND closure_note<>'' THEN closure_note ELSE ? END,status=? WHERE id=?"+fresh).bind(status, status, resolved ? 'fixed' : closureReason, resolved ? 'fixed' : closureReason, status, closureNote, status, id,...key),
    db.prepare('UPDATE forum_threads SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=(SELECT forum_thread_id FROM issues WHERE id=?)'+fresh).bind(status === 'closed' ? 'resolved' : 'open', id,...key),
    ...(delivery?[db.prepare('INSERT INTO github_webhook_deliveries(id,issue_id) VALUES(?,?) ON CONFLICT DO NOTHING').bind(delivery,id)]:[]),
  ]
}

/** A reply on a private report reaches the other side once: the reporter when a maintainer or administrator writes,
 * and the current claimed maintainers of each reported module when the reporter writes. */
export function issueReplyStatements(db: Database, issue: { id: string; reporter_id: string; maintainer_sharing: number; public_sharing: number }, moduleIds: string[], replyId: string, actorId: string, body: string): Statement[] {
  const delivery = 'issue-reply:' + replyId, excerpt = body.slice(0, 400)
  if (actorId !== issue.reporter_id) return [db.prepare("INSERT INTO notifications(id,user_id,kind,actor_id,issue_id,module_id,excerpt,delivery_id) SELECT lower(hex(randomblob(16))),i.reporter_id,'issue_comment',?,i.id,i.module_id,?,? FROM issues i JOIN users u ON u.id=i.reporter_id WHERE i.id=? AND u.email_verified=1 AND u.suspended=0 ON CONFLICT DO NOTHING").bind(actorId, excerpt, delivery, issue.id)]
  if (!issue.maintainer_sharing || issue.public_sharing) return []
  // A maintainer of several reported modules gets one entry: the delivery key is unique per recipient.
  return moduleIds.flatMap(id => {
    const module = communityModule(id)
    if (!module) return []
    const { recipients, values } = moduleDevelopers(module, actorId)
    return [db.prepare(`INSERT INTO notifications(id,user_id,kind,actor_id,issue_id,module_id,excerpt,delivery_id) SELECT lower(hex(randomblob(16))),user_id,'issue_comment',?,?,?,?,? FROM (${recipients}) WHERE 1 ON CONFLICT DO NOTHING`).bind(actorId, issue.id, module.id, excerpt, delivery, ...values)]
  })
}

/** Public conversations notify their reporter and members who have successfully replied through Modwerk.
 * Completed authenticated receipts establish participation; typed names, commands and failed writes do not.
 * Reuse the event key for every recipient so a retry or service-account echo cannot notify twice. */
export function publicIssueReplyStatement(db: Database, issueId: string, delivery: string, body: string, actorId: string | null, githubActor: string | null = null, githubId: string | null = null) {
  return db.prepare(`INSERT INTO notifications(id,user_id,kind,actor_id,issue_id,module_id,github_actor,excerpt,delivery_id)
    SELECT lower(hex(randomblob(16))),u.id,'issue_comment',?,i.id,i.module_id,?,?,?
    FROM issues i JOIN users u ON u.id IN (
      SELECT i.reporter_id UNION SELECT actor FROM github_actions WHERE issue_id=i.id AND completed=1 AND id LIKE 'reply:%'
    ) WHERE i.id=? AND i.public_json IS NOT NULL AND i.github_number IS NOT NULL AND i.github_url IS NOT NULL
    AND u.email_verified=1 AND u.suspended=0 AND u.username IS NOT NULL AND u.id IS NOT ?
    AND NOT EXISTS(SELECT 1 FROM social_pending_accounts p WHERE p.user_id=u.id)
    AND NOT EXISTS(SELECT 1 FROM auth_accounts g WHERE g.userId=? AND g.providerId='github' AND g.accountId=u.github_id)
    AND (? IS NULL OR (COALESCE(u.github_id,'')<>? AND NOT EXISTS(SELECT 1 FROM auth_accounts g WHERE g.userId=u.id AND g.providerId='github' AND g.accountId=?)))
    AND NOT EXISTS(SELECT 1 FROM github_webhook_deliveries WHERE id=?) ON CONFLICT DO NOTHING`)
    .bind(actorId, githubActor, body.slice(0, 400), delivery, issueId, actorId, actorId, githubId, githubId, githubId, delivery)
}
