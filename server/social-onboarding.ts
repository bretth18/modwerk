import { symmetricDecrypt } from 'better-auth/crypto'
import type { Database, Env } from './platform'
import { accountAuth, accountUser } from './accounts'
import { COMMUNITY_RULES_VERSION } from '../src/legal/policy'
import { NEWS_CONSENT_VERSION } from './news-preferences'
import { digest, HttpError, response, token } from './security'
import { validUsername } from './social-config'

type Handoff = {session:string;cookies:string[]}
const now = () => Math.floor(Date.now()/1000)
const hex = (value:unknown):value is string => typeof value==='string' && /^[a-f0-9]{64}$/.test(value)
function proof(body:Record<string,unknown>) {
  if(!hex(body.code)||!hex(body.verifier))throw new HttpError(400,'This sign-in could not be completed. Start again.')
  return {code:body.code,verifier:body.verifier}
}
function signedIn(env:Env,data:Handoff) {
  const out=response({ok:true})
  if(env.SESSION_TRANSPORT==='bearer')out.headers.set('X-Octamod-Session',data.session)
  else for(const cookie of data.cookies)out.headers.append('Set-Cookie',cookie)
  return out
}
function registrationsOpen(env:Env) {
  if(env.REGISTRATION_OPEN!=='true'||env.PRIVACY_READY!=='true')throw new HttpError(503,'New registrations are temporarily closed. Existing accounts can still sign in.')
}
async function owner(env:Env,db:Database,data:Handoff) {
  const session=await accountAuth(env,db).api.getSession({headers:new Headers({Authorization:'Bearer '+data.session})})
  if(!session?.user.emailVerified)throw new HttpError(401,'Sign in again to continue.')
  return session.user
}

export async function exchangeSocialSession(env:Env,db:Database,body:Record<string,unknown>) {
  const {code,verifier}=proof(body)
  const flow=await db.prepare("DELETE FROM social_flows WHERE token_hash=? AND challenge_hash=? AND stage='complete' AND expires>? RETURNING payload,provider,mode")
    .bind(await digest(code),await digest(verifier),now()).first<{payload:string;provider:string;mode:string}>()
  if(!flow)throw new HttpError(400,'This sign-in has expired or was already completed. Start again.')
  const data=JSON.parse(await symmetricDecrypt({key:env.AUTH_SECRET!,data:flow.payload})) as Handoff
  const user=await owner(env,db,data)
  const pending=await db.prepare('SELECT user_id FROM social_pending_accounts WHERE user_id=? AND expires>?').bind(user.id,now()).first()
  if(pending){
    registrationsOpen(env)
    const next=token()
    await db.prepare("INSERT INTO social_flows(token_hash,challenge_hash,provider,mode,username,stage,payload,expires) VALUES(?,?,?,'register',?,'complete',?,?)")
      .bind(await digest(next),await digest(verifier),flow.provider,user.username,flow.payload,now()+600).run()
    // No usable session or provider profile is sent before signup confirmation.
    return response({onboarding:{code:next,username:user.username}})
  }
  if(!await accountUser(new Request(env.AUTH_BASE_URL!,{headers:{Authorization:'Bearer '+data.session}}),env,db))throw new HttpError(401,'Sign in again to continue.')
  return signedIn(env,data)
}

export async function completeSocialOnboarding(env:Env,db:Database,body:Record<string,unknown>) {
  const {code,verifier}=proof(body)
  registrationsOpen(env)
  if(body.rulesVersion!==COMMUNITY_RULES_VERSION)throw new HttpError(400,'Accept the current community rules to create your account.')
  if(body.newsletter!==undefined&&typeof body.newsletter!=='boolean')throw new HttpError(400,'Choose whether to receive news emails.')
  if(body.username!==undefined&&typeof body.username!=='string')throw new HttpError(400,'Choose a valid public username.')
  const codeHash=await digest(code),challengeHash=await digest(verifier),time=now()
  const flow=await db.prepare("SELECT payload,username FROM social_flows WHERE token_hash=? AND challenge_hash=? AND stage='complete' AND expires>?")
    .bind(codeHash,challengeHash,time).first<{payload:string;username:string|null}>()
  if(!flow)throw new HttpError(400,'This signup has expired or was already completed. Start sign-in again.')
  const data=JSON.parse(await symmetricDecrypt({key:env.AUTH_SECRET!,data:flow.payload})) as Handoff,user=await owner(env,db,data)
  if(!await db.prepare('SELECT user_id FROM social_pending_accounts WHERE user_id=? AND expires>?').bind(user.id,time).first())throw new HttpError(400,'Start sign-in again to continue.')
  const username=(typeof body.username==='string'?body.username.trim().toLowerCase():'')||flow.username
  if(!validUsername(username))throw new HttpError(400,'Use 3–24 letters, numbers or underscores, excluding reserved names.')
  if(await db.prepare('SELECT id FROM users WHERE username=? COLLATE NOCASE AND id<>?').bind(username,user.id).first())throw new HttpError(409,'This username is already in use. Choose another or keep the suggested name.')
  const enabled=body.newsletter===true
  let result:unknown[]
  try {
    result=await db.batch([
      db.prepare("DELETE FROM social_flows WHERE token_hash=? AND challenge_hash=? AND stage='complete' AND expires>? RETURNING token_hash").bind(codeHash,challengeHash,time),
      db.prepare('UPDATE users SET username=?,display_name=? WHERE id=? AND suspended=0 AND EXISTS(SELECT 1 FROM social_pending_accounts WHERE user_id=? AND expires>?)').bind(username,username,user.id,user.id,time),
      db.prepare('UPDATE auth_users SET username=?,displayUsername=?,name=?,updatedAt=? WHERE id=? AND EXISTS(SELECT 1 FROM social_pending_accounts WHERE user_id=? AND expires>?)').bind(username,username,username,Date.now(),user.id,user.id,time),
      db.prepare('INSERT OR IGNORE INTO account_policy_acceptances(user_id,version) SELECT user_id,? FROM social_pending_accounts WHERE user_id=? AND expires>?').bind(COMMUNITY_RULES_VERSION,user.id,time),
      db.prepare('INSERT INTO account_news_preferences(user_id,enabled,consent_version,changed_at) SELECT user_id,?,?,? FROM social_pending_accounts WHERE user_id=? AND expires>? ON CONFLICT(user_id) DO NOTHING').bind(Number(enabled),enabled?NEWS_CONSENT_VERSION:null,new Date().toISOString(),user.id,time),
      db.prepare('DELETE FROM social_pending_accounts WHERE user_id=? AND expires>?').bind(user.id,time),
    ])
  } catch {throw new HttpError(409,'Your account could not be saved. Try another username or keep the suggested name.')}
  if(!(result[0] as {results?:unknown[]})?.results?.length)throw new HttpError(400,'This signup was already completed. Sign in again.')
  if(!await accountUser(new Request(env.AUTH_BASE_URL!,{headers:{Authorization:'Bearer '+data.session}}),env,db))throw new HttpError(401,'Sign in again to continue.')
  return signedIn(env,data)
}
