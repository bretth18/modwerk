import type { Database, Env, User } from './platform'
import { cookie, digest, HttpError, jsonBody, required, response, sessionValue, token } from './security'
import { mailAvailable, sendCode } from './mail'
import { currentUser, throttle } from './auth'

type Challenge = { id: string; email: string; purpose: 'signup' | 'signin' | 'delete'; display_name: string; newsletter: number; user_id: string | null; code_hash: string }
const seconds = 30 * 24 * 60 * 60
const now = () => Math.floor(Date.now() / 1000)
export const publicUser = (user: User) => ({ id: user.id, displayName: user.display_name, email: user.email, newsletter: !!user.newsletter })
function emailAddress(value: unknown) {
  const email = required(value, 'Email address', 254).toLowerCase()
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email)) throw new HttpError(400, 'Enter a valid email address.')
  return email
}
function verificationCode() {
  const bytes = new Uint32Array(1)
  do { crypto.getRandomValues(bytes) } while (bytes[0] >= 4200000000)
  return String(bytes[0] % 100000000).padStart(8, '0')
}
export function clearSession(env: Env) {
  const result = response({ ok: true })
  result.headers.set('X-Octamod-Session', '')
  if (env.SESSION_TRANSPORT !== 'bearer') result.headers.append('Set-Cookie', cookie('octamod_session', '', env, 0))
  return result
}
async function start(request: Request, env: Env, db: Database, body: Record<string, unknown>, user: User | null) {
  if (!mailAvailable(env)) throw new HttpError(503, 'Email verification is not configured yet. Please try again later.')
  const purpose = body.purpose
  if (purpose !== 'signup' && purpose !== 'signin' && purpose !== 'delete') throw new HttpError(400, 'Choose sign up or sign in.')
  if (purpose === 'delete' && !user) throw new HttpError(401, 'Sign in to delete your account.')
  const email = purpose === 'delete' ? user!.email : emailAddress(body.email)
  const name = purpose === 'signup' ? required(body.displayName, 'Display name', 60) : ''
  if (purpose === 'signup' && typeof body.newsletter !== 'boolean') throw new HttpError(400, 'Choose whether to receive news emails.')
  await throttle(db, 'auth-mail-ip:' + (request.headers.get('CF-Connecting-IP') ?? 'local'), 10, 3600)
  await throttle(db, 'auth-mail-email:' + email, 5, 3600)
  await throttle(db, 'auth-mail-global', 200, 3600)
  const id = token(), code = verificationCode()
  await db.prepare('DELETE FROM auth_challenges WHERE expires<=?').bind(now()).run()
  await db.prepare('INSERT INTO auth_challenges(id,email,code_hash,purpose,display_name,newsletter,user_id,expires) VALUES(?,?,?,?,?,?,?,?)')
    .bind(id, email, await digest(id + ':' + code), purpose, name, purpose === 'signup' && body.newsletter === true ? 1 : 0, user?.id ?? null, now() + 600).run()
  try { await sendCode(env, email, code, id, purpose === 'delete') }
  catch (error) { await db.prepare('DELETE FROM auth_challenges WHERE id=?').bind(id).run(); throw error }
  // Identical response for existing and unknown addresses; no account discovery endpoint.
  return response({ challengeId: id, expiresIn: 600 }, 202)
}
async function consume(request: Request, db: Database, body: Record<string, unknown>, deleting: boolean, user: User | null) {
  if (typeof body.challengeId !== 'string' || !/^[a-f0-9]{64}$/.test(body.challengeId) || typeof body.code !== 'string' || !/^[0-9]{8}$/.test(body.code)) throw new HttpError(400, 'Enter the eight-digit code from your email.')
  await throttle(db, 'auth-verify-ip:' + (request.headers.get('CF-Connecting-IP') ?? 'local'), 30, 900)
  const purpose = deleting ? "purpose='delete' AND user_id=?" : "purpose IN ('signup','signin')"
  const args = deleting ? [body.challengeId, now(), user?.id ?? ''] : [body.challengeId, now()]
  // Count attempts atomically, including races; five guesses per challenge.
  const attempt = await db.prepare('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=? AND expires>? AND attempts<5 AND ' + purpose + ' RETURNING id').bind(...args).first()
  if (!attempt) throw new HttpError(400, 'This code is expired or no longer available. Request a new code.')
  const challenge = await db.prepare((deleting ? 'DELETE FROM auth_challenges' : 'SELECT * FROM auth_challenges') + ' WHERE id=? AND code_hash=? AND expires>? AND attempts<=5 AND ' + purpose + (deleting ? ' RETURNING *' : ''))
    .bind(body.challengeId, await digest(body.challengeId + ':' + body.code), now(), ...(deleting ? [user?.id ?? ''] : [])).first<Challenge>()
  if (!challenge) throw new HttpError(400, 'This code was not accepted. Check your email or request a new code.')
  return challenge
}
export async function accountRoutes(request: Request, env: Env, path: string, db: Database): Promise<Response | null> {
  if (!['/api/auth/code', '/api/auth/verify', '/api/auth/account'].includes(path)) return null
  const user = await currentUser(request, db)
  if (path === '/api/auth/code' && request.method === 'POST') return start(request, env, db, await jsonBody(request), user)
  if (path === '/api/auth/verify' && request.method === 'POST') {
    const challenge = await consume(request, db, await jsonBody(request), false, user)
    if (challenge.purpose === 'signin' && !await db.prepare('SELECT user_id FROM accounts WHERE email=?').bind(challenge.email).first()) { await db.prepare('DELETE FROM auth_challenges WHERE id=?').bind(challenge.id).run(); throw new HttpError(400, 'Your email is verified. Create an account first, then request a new code.') }
    const value = token(), id = crypto.randomUUID(), timestamp = now(), hash = await digest(value)
    const guard = 'EXISTS(SELECT 1 FROM auth_challenges WHERE id=? AND code_hash=? AND expires>? AND attempts<=5)'
    const proof = [challenge.id, challenge.code_hash, timestamp]
    const statements = []
    if (challenge.purpose === 'signup') {
      // Code consumption and account/session creation share one transaction. Deletion cannot resurrect an account through an in-flight code.
      statements.push(db.prepare('INSERT INTO users(id,display_name) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE email=?) AND ' + guard).bind(id, challenge.display_name, challenge.email, ...proof))
      statements.push(db.prepare('INSERT INTO accounts(user_id,email,verified_at,newsletter,newsletter_changed_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=?) AND ' + guard + ' ON CONFLICT(email) DO NOTHING').bind(id, challenge.email, timestamp, challenge.newsletter, timestamp, id, ...proof))
    }
    statements.push(db.prepare('DELETE FROM sessions WHERE (token_hash=? OR expires<=?) AND ' + guard).bind(await digest(sessionValue(request)), timestamp, ...proof))
    statements.push(db.prepare('INSERT INTO sessions(token_hash,user_id,expires) SELECT ?,user_id,? FROM accounts WHERE email=? AND ' + guard).bind(hash, timestamp + seconds, challenge.email, ...proof))
    statements.push(db.prepare('DELETE FROM auth_challenges WHERE id=? AND code_hash=?').bind(challenge.id, challenge.code_hash))
    await db.batch(statements)
    const account = await db.prepare('SELECT u.id,u.display_name,a.email,a.newsletter FROM sessions s JOIN users u ON u.id=s.user_id JOIN accounts a ON a.user_id=u.id WHERE s.token_hash=?').bind(hash).first<User>()
    if (!account) throw new HttpError(400, 'This code is expired or no longer available. Request a new code.')
    const result = response({ user: publicUser(account) })
    if (env.SESSION_TRANSPORT === 'bearer') result.headers.set('X-Octamod-Session', value)
    else result.headers.append('Set-Cookie', cookie('octamod_session', value, env, seconds))
    return result
  }
  if (path === '/api/auth/account' && request.method === 'PATCH') {
    if (!user) throw new HttpError(401, 'Sign in to update your account.')
    const body = await jsonBody(request)
    if (typeof body.newsletter !== 'boolean') throw new HttpError(400, 'Choose whether to receive news emails.')
    await db.prepare('UPDATE accounts SET newsletter=?,newsletter_changed_at=? WHERE user_id=? AND newsletter!=?').bind(body.newsletter ? 1 : 0, now(), user.id, body.newsletter ? 1 : 0).run()
    return response({ ok: true })
  }
  if (path === '/api/auth/account' && request.method === 'DELETE') {
    if (!user) throw new HttpError(401, 'Sign in to delete your account.')
    const body = await jsonBody(request)
    if (body.confirmation !== 'DELETE') throw new HttpError(400, 'Confirm account deletion.')
    await consume(request, db, body, true, user)
    await db.batch([
      db.prepare('DELETE FROM auth_challenges WHERE email=?').bind(user.email),
      db.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id),
      db.prepare('DELETE FROM comments WHERE user_id=?').bind(user.id),
      db.prepare('DELETE FROM ratings WHERE user_id=?').bind(user.id),
      db.prepare('DELETE FROM likes WHERE user_id=?').bind(user.id),
      db.prepare('DELETE FROM configurations WHERE user_id=?').bind(user.id),
      db.prepare('DELETE FROM issues WHERE reporter_id=?').bind(user.id),
      db.prepare('DELETE FROM accounts WHERE user_id=?').bind(user.id),
      // Preserve historical source authorship and review references, but remove the account identity.
      db.prepare("UPDATE users SET display_name='Deleted account',github_id=NULL WHERE id=?").bind(user.id),
      db.prepare('DELETE FROM users WHERE id=? AND NOT EXISTS(SELECT 1 FROM submissions WHERE owner_id=? OR reviewer_id=?) AND NOT EXISTS(SELECT 1 FROM review_events WHERE actor_id=?)').bind(user.id, user.id, user.id, user.id),
    ])
    return clearSession(env)
  }
  throw new HttpError(405, 'This account action is not supported.')
}
export async function cleanupAccounts(db: Database) {
  await db.batch([db.prepare('DELETE FROM auth_challenges WHERE expires<=?').bind(now()), db.prepare('DELETE FROM sessions WHERE expires<=?').bind(now())])
}
