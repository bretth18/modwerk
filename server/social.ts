import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto'
import type { Database, Env } from './platform'
import { accountAuth } from './accounts'
import { throttle } from './auth'
import { digest, HttpError, jsonBody, response, token } from './security'
import { socialProviders, validUsername, type SocialProvider } from './social-config'
const now = () => Math.floor(Date.now() / 1000)
const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
function returnUrl(env: Env, route: string) { const url = new URL(env.APP_URL!); url.hash = route; return url.href }
function redirect(url: string) { return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } }) }
/** Explicit facade; Better Auth retains its state-cookie and PKCE checks. */
export async function socialRoutes(request: Request, env: Env, db: Database, path: string): Promise<Response | null> {
  if (!path.startsWith('/api/auth/sso') && !/^\/api\/auth\/callback\/(google|github|discord)$/.test(path)) return null
  const callback = path.match(/^\/api\/auth\/callback\/(google|github|discord)$/), start = path.match(/^\/api\/auth\/sso\/start\/([a-f0-9]{64})$/), providers = socialProviders(env)
  if (!providers.length) throw new HttpError(503, 'Social sign-in is not configured yet.')
  const auth = accountAuth(env, db)
  if (callback) {
    if (request.method !== 'GET' || !providers.includes(callback[1] as SocialProvider)) throw new HttpError(404, 'Sign-in provider not available.')
    const result = await auth.handler(request), session = result.headers.get('set-auth-token'), flowHash = result.headers.get('X-Modwerk-Sso-Flow')
    if (!session || !hex(flowHash)) return redirect(returnUrl(env, 'account/sso-error'))
    const code = token(), payload = await symmetricEncrypt({ key: env.AUTH_SECRET!, data: JSON.stringify({ session, cookies: result.headers.getSetCookie() }) })
    const flow = await db.prepare("UPDATE social_flows SET token_hash=?,stage='complete',payload=?,expires=? WHERE token_hash=? AND provider=? AND stage='started' AND expires>? RETURNING token_hash").bind(await digest(code), payload, now() + 60, flowHash, callback[1], now()).first()
    if (!flow) return redirect(returnUrl(env, 'account/sso-error'))
    return redirect(returnUrl(env, 'account/sso/' + code))
  }
  if (start) {
    if (request.method !== 'GET') throw new HttpError(405, 'Open this sign-in link in your browser.')
    const flowHash = await digest(start[1]), flow = await db.prepare("UPDATE social_flows SET stage='started' WHERE token_hash=? AND stage='pending' AND expires>? RETURNING provider,mode").bind(flowHash, now()).first<{provider: SocialProvider; mode: string}>()
    if (!flow || !providers.includes(flow.provider)) throw new HttpError(400, 'This sign-in link is invalid or expired. Start again.')
    const result = await auth.api.signInSocial({ headers: request.headers, body: { provider: flow.provider, requestSignUp: flow.mode === 'register', callbackURL: returnUrl(env, 'account/sso-error'), errorCallbackURL: returnUrl(env, 'account/sso-error'), disableRedirect: true, additionalData: { flowHash } }, asResponse: true })
    const data = await result.json() as { url?: string }
    if (!result.ok || !data.url) return redirect(returnUrl(env, 'account/sso-error'))
    const out = redirect(data.url)
    // Top-level navigation sets a first-party API-origin state cookie.
    for (const value of result.headers.getSetCookie()) out.headers.append('Set-Cookie', value)
    return out
  }
  if (request.method !== 'POST') throw new HttpError(405, 'Use a supported sign-in action.')
  await throttle(db, 'social-ip:' + (request.headers.get('CF-Connecting-IP') ?? 'local'), 30, 900)
  const body = await jsonBody(request)
  if (path === '/api/auth/sso/exchange') {
    if (!hex(body.code) || !hex(body.verifier)) throw new HttpError(400, 'This sign-in could not be completed. Start again.')
    const flow = await db.prepare("DELETE FROM social_flows WHERE token_hash=? AND challenge_hash=? AND stage='complete' AND expires>? RETURNING payload").bind(await digest(body.code), await digest(body.verifier), now()).first<{payload: string}>()
    if (!flow) throw new HttpError(400, 'This sign-in has expired or was already completed. Start again.')
    const data = JSON.parse(await symmetricDecrypt({ key: env.AUTH_SECRET!, data: flow.payload })) as {session: string; cookies: string[]}
    const owner = await auth.api.getSession({ headers: new Headers({ Authorization: 'Bearer ' + data.session }) })
    const active = owner?.user.emailVerified && await db.prepare('SELECT id FROM users WHERE id=? AND suspended=0 AND username IS NOT NULL').bind(owner.user.id).first()
    if (!active) throw new HttpError(401, 'Sign in again to continue.')
    const out = response({ ok: true })
    if (env.SESSION_TRANSPORT === 'bearer') out.headers.set('X-Octamod-Session', data.session)
    else for (const value of data.cookies) out.headers.append('Set-Cookie', value)
    return out
  }
  if (path !== '/api/auth/sso') throw new HttpError(404, 'Sign-in action not found.')
  if (!providers.includes(body.provider as SocialProvider) || (body.mode !== 'login' && body.mode !== 'register') || !hex(body.challenge)) throw new HttpError(400, 'Choose an available sign-in provider.')
  let username: string | null = null
  if (body.mode === 'register') {
    if (env.REGISTRATION_OPEN !== 'true') throw new HttpError(503, 'New registrations are temporarily closed.')
    username = typeof body.username === 'string' ? body.username.toLowerCase() : null
    if (!validUsername(username)) throw new HttpError(400, 'Choose a public username: 3–24 letters, numbers or underscores, excluding reserved names.')
    if (await db.prepare('SELECT id FROM users WHERE username=? COLLATE NOCASE').bind(username).first()) throw new HttpError(409, 'This username is already in use.')
  }
  const ticket = token()
  await db.prepare("INSERT INTO social_flows(token_hash,challenge_hash,provider,mode,username,stage,expires) VALUES(?,?,?,?,?,'pending',?)").bind(await digest(ticket), body.challenge, body.provider, body.mode, username, now() + 600).run()
  const url = new URL(env.AUTH_BASE_URL!); url.pathname = url.pathname.replace(/\/$/, '') + '/sso/start/' + ticket
  return response({ url: url.href })
}
