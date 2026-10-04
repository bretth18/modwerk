import { verifyPassword } from 'better-auth/crypto'
import type { Database, User } from './platform'
import { HttpError, jsonBody, response } from './security'
import { throttle } from './auth'

/** Only the verified owner, after reauthentication. Never export credentials or another member's text. */
export async function accountExport(request:Request,db:Database,owner:User|null){
  if(!owner?.username||!owner.email_verified||owner.suspended)throw new HttpError(401,'Sign in to download your account data.')
  if(request.method!=='POST')throw new HttpError(405,'Use the account data download form.')
  await throttle(db,'account-export:'+owner.id,5,900)
  const body=await jsonBody(request)
  if(typeof body.password!=='string'||body.password.length<15||body.password.length>128)throw new HttpError(400,'Enter your current password.')
  const credential=await db.prepare("SELECT password FROM auth_accounts WHERE userId=? AND providerId='credential'").bind(owner.id).first<{password:string}>()
  if(!credential||!await verifyPassword({hash:credential.password,password:body.password}))throw new HttpError(403,'Your password was not accepted.')
  // Explicit field lists keep operator notes, access/session tokens and password hashes out.
  const queries={
    account:'SELECT id,name,email,emailVerified,createdAt,updatedAt,username,displayUsername FROM auth_users WHERE id=?',
    identities:'SELECT providerId,accountId,createdAt,updatedAt FROM auth_accounts WHERE userId=?',
    policyAcceptances:'SELECT version,accepted_at FROM account_policy_acceptances WHERE user_id=?',
    configurations:'SELECT id,name,modules_json,revision,updated_at,keep_stock_fx2,module_versions_json FROM configurations WHERE user_id=?',
    comments:'SELECT id,module_id,body,created_at FROM comments WHERE user_id=?',
    ratings:'SELECT module_id,value FROM ratings WHERE user_id=?',
    likes:'SELECT module_id FROM likes WHERE user_id=?',
    threads:'SELECT id,title,category,module_id,configuration_json,issue_json,status,locked,hidden,created_at,updated_at FROM forum_threads WHERE user_id=?',
    posts:'SELECT id,thread_id,body,hidden,created_at,edited_at FROM forum_posts WHERE user_id=?',
    reactions:'SELECT post_id FROM forum_reactions WHERE user_id=?',
    follows:'SELECT thread_id FROM forum_follows WHERE user_id=?',
    bookmarks:'SELECT thread_id FROM forum_bookmarks WHERE user_id=?',
    notifications:'SELECT id,thread_id,post_id,seen,created_at FROM forum_notifications WHERE user_id=?',
    reports:'SELECT id,post_id,reason,resolved,created_at FROM forum_reports WHERE user_id=?',
    issues:'SELECT id,module_id,title,body,status,created_at,context_json,log_missing,log_missing_note,github_url,public_sharing FROM issues WHERE reporter_id=?',
    issueLogs:'SELECT l.issue_id,l.text,l.bytes,l.summary_json FROM issue_logs l JOIN issues i ON i.id=l.issue_id WHERE i.reporter_id=?',
    removalRequests:'SELECT id,status,created_at,updated_at FROM account_removal_requests WHERE user_id=?',
    contributions:'SELECT id,module_id,title,repository_url,description,usage,test_report_url,stress_notes,quality_notes,resource_notes,license,rights_confirmed,status,created_at FROM submissions WHERE owner_id=?',
    contributionMedia:'SELECT m.id,m.submission_id,m.kind,m.mime,m.caption,m.capture_type,m.bytes FROM media m JOIN submissions s ON s.id=m.submission_id WHERE s.owner_id=?',
  }
  const entries=Object.entries(queries)
  // One D1 batch gives a consistent snapshot and cannot race individual writes.
  const results=await db.batch(entries.map(([,sql])=>db.prepare(sql).bind(owner.id))) as {results:unknown[]}[]
  const out=response({format:'modwerk-account-data-v1',exportedAt:new Date().toISOString(),data:Object.fromEntries(entries.map(([key],index)=>[key,results[index].results]))})
  out.headers.set('Content-Disposition','attachment; filename="modwerk-account-data.json"')
  out.headers.set('Referrer-Policy','no-referrer')
  return out
}
