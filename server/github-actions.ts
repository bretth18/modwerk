import type { Database } from './platform'
import { digest, HttpError } from './security'

/** Serialize upstream writes and bind retries to the original issue, actor and content. */
export async function claimGithubAction(db: Database, id: string, issueId: string, actor: string, body: string) {
  const hash = await digest(body), now = Math.floor(Date.now() / 1000), lease = crypto.randomUUID()
  await db.prepare('INSERT INTO github_actions(id,issue_id,actor,body_hash) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(id, issueId, actor, hash).run()
  const row = await db.prepare('SELECT issue_id,actor,body_hash,completed FROM github_actions WHERE id=?').bind(id).first<{ issue_id: string; actor: string; body_hash: string; completed: number }>()
  if (!row || row.issue_id !== issueId || row.actor !== actor || row.body_hash !== hash) throw new HttpError(409, 'This reply identifier was already used for different content. Start a new reply.')
  if (row.completed) return null
  const claimed = await db.prepare('UPDATE github_actions SET lease_token=?,lease_until=? WHERE id=? AND completed=0 AND lease_until<=? RETURNING id').bind(lease, now + 300, id, now).first()
  if (!claimed) throw new HttpError(409, 'This GitHub action is still being processed. Try again in a moment.')
  return {
    complete: () => db.prepare('UPDATE github_actions SET completed=1,lease_token=NULL,lease_until=0 WHERE id=? AND lease_token=?').bind(id, lease).run(),
    release: () => db.prepare('UPDATE github_actions SET lease_token=NULL,lease_until=0 WHERE id=? AND lease_token=?').bind(id, lease).run(),
  }
}
