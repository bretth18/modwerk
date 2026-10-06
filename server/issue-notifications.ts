import type { Database } from './platform'

/** Insert before changing the status in the same transaction, so repeated status writes notify only once. */
export function issueStatusStatements(db: Database, id: string, status: 'open' | 'closed', actorId: string | null, githubActor: string | null = null, delivery: string | null = null, resolved = true) {
  const kind = status === 'open' ? 'issue_reopened' : resolved ? 'issue_resolved' : 'issue_closed'
  const fresh=delivery?' AND NOT EXISTS(SELECT 1 FROM github_webhook_deliveries WHERE id=?)':'',key=delivery?[delivery]:[]
  return [
    db.prepare(`INSERT INTO notifications(id,user_id,kind,actor_id,issue_id,module_id,github_actor,delivery_id) SELECT lower(hex(randomblob(16))),i.reporter_id,?,?,i.id,i.module_id,?,? FROM issues i JOIN users u ON u.id=i.reporter_id WHERE i.id=? AND i.status<>? AND u.email_verified=1 AND u.suspended=0 AND i.reporter_id IS NOT ?${fresh} ON CONFLICT DO NOTHING`).bind(kind, actorId, githubActor, delivery, id, status, actorId,...key),
    // A repeated close keeps the first closing time; reopening clears it.
    db.prepare("UPDATE issues SET closed_at=CASE WHEN ?='open' THEN NULL WHEN status='closed' THEN closed_at ELSE CURRENT_TIMESTAMP END,status=? WHERE id=?"+fresh).bind(status, status, id,...key),
    db.prepare('UPDATE forum_threads SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=(SELECT forum_thread_id FROM issues WHERE id=?)'+fresh).bind(status === 'closed' ? 'resolved' : 'open', id,...key),
    ...(delivery?[db.prepare('INSERT INTO github_webhook_deliveries(id,issue_id) VALUES(?,?) ON CONFLICT DO NOTHING').bind(delivery,id)]:[]),
  ]
}
