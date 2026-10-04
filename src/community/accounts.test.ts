/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite'
import type { SQLInputValue } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleCommunity } from '../../server/transport'
import { cleanupAccounts } from '../../server/accounts'
import { digest } from '../../server/security'
import type { Database, Env, Statement } from '../../server/platform'
const databases: DatabaseSync[] = []
function adapter(db: DatabaseSync): Database {
  function statement(sql: string, values: SQLInputValue[] = []): Statement { return {
    bind(...args) { return statement(sql, args as SQLInputValue[]) },
    async first<T>() { return (db.prepare(sql).get(...values) as T | undefined) ?? null },
    async all<T>() { return { results: db.prepare(sql).all(...values) as T[] } },
    async run() { return { meta: { changes: Number(db.prepare(sql).run(...values).changes) } } },
  } }
  let pending: Promise<unknown> = Promise.resolve()
  return { prepare: statement, async batch(items) { const result = pending.then(async () => { db.exec('BEGIN'); try { const result = []; for (const item of items) result.push(await item.run()); db.exec('COMMIT'); return result } catch (error) { db.exec('ROLLBACK'); throw error } }); pending = result.catch(() => {}); return result } }
}
async function fixture(transport: 'bearer' | 'cookie' = 'bearer') {
  const db = new DatabaseSync(':memory:'); databases.push(db)
  const dir = new URL('../../migrations/', import.meta.url)
  for (const file of readdirSync(dir).filter(file => file.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file, dir), 'utf8'))
  const env: Env = { DB: adapter(db), APP_URL: 'https://octamod.test/', SESSION_TRANSPORT: transport, RESEND_API_KEY: 'test-secret', MAIL_FROM: 'Octamod <accounts@example.test>' }
  const emails: { to: string[]; text: string }[] = []
  const mail = vi.fn(async (_url: string, init: RequestInit) => { emails.push(JSON.parse(String(init.body))); return Response.json({ id: 'mail-test' }) })
  vi.stubGlobal('fetch', mail)
  async function call(path: string, method = 'GET', body?: unknown, session = '', origin = 'https://octamod.test', ip = 'test') {
    const headers = new Headers({ Origin: origin, 'CF-Connecting-IP': ip })
    if (session) headers.set(transport === 'bearer' ? 'Authorization' : 'Cookie', transport === 'bearer' ? 'Bearer ' + session : 'octamod_session=' + session)
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    return handleCommunity(new Request('https://community.test/api' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env)
  }
  async function start(purpose = 'signup', email = 'member@example.test', extra: Record<string, unknown> = {}, session = '') {
    const result = await call('/auth/code', 'POST', { purpose, email, displayName: 'Member', newsletter: false, ...extra }, session)
    const body = await result.json(); expect(result.status).toBe(202)
    const code = emails.at(-1)!.text.match(/code(?: on Octamod)?: ([0-9]{8})/)![1]
    return { challengeId: body.challengeId as string, code }
  }
  async function signup(email = 'member@example.test', newsletter = false) {
    const challenge = await start('signup', email, { newsletter })
    const result = await call('/auth/verify', 'POST', challenge); expect(result.status).toBe(200)
    const session = transport === 'bearer' ? result.headers.get('X-Octamod-Session')! : result.headers.get('Set-Cookie')!.match(/octamod_session=([a-f0-9]{64})/)![1]
    return { session, result, challenge, user: (await result.json()).user }
  }
  return { db, env, emails, mail, call, start, signup }
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); for (const db of databases.splice(0)) db.close() })
describe('verified accounts', () => {
  it('creates accounts only after verification with private email and unchecked news consent', async () => {
    const { db, call, start, mail } = await fixture()
    const challenge = await start('signup', 'MEMBER@example.test')
    expect(db.prepare('SELECT COUNT(*) AS count FROM accounts').get()).toEqual({ count: 0 })
    expect((await call('/modules/miniverb/comments', 'POST', { body: 'Unverified' })).status).toBe(401)
    expect(db.prepare('SELECT code_hash FROM auth_challenges').get()!.code_hash).not.toContain(challenge.code)
    expect(mail.mock.calls[0][0]).toBe('https://api.resend.com/emails')
    expect(mail.mock.calls[0][1].redirect).toBe('manual')
    expect(new Headers(mail.mock.calls[0][1].headers).get('Idempotency-Key')).toBe(challenge.challengeId)
    const result = await call('/auth/verify', 'POST', challenge), session = result.headers.get('X-Octamod-Session')!
    expect(result.status).toBe(200); expect(result.headers.get('Set-Cookie')).toBeNull(); expect(session).toMatch(/^[a-f0-9]{64}$/)
    expect(await result.json()).toMatchObject({ user: { displayName: 'Member', email: 'member@example.test', newsletter: false } })
    expect((await call('/modules/miniverb/comments', 'POST', { body: 'Verified', displayName: 'Other' }, session)).status).toBe(200)
    const publicPage = await (await call('/modules/miniverb')).text(); expect(publicPage).toContain('Member'); expect(publicPage).not.toContain('@example.test')
    expect((await call('/auth/verify', 'POST', challenge)).status).toBe(400)
  })
  it('supports cookie fallback with HttpOnly secure cookies and logout revocation', async () => {
    const { signup, call } = await fixture('cookie'); const { session, result } = await signup()
    expect(result.headers.get('Set-Cookie')).toMatch(/HttpOnly; SameSite=Lax; Path=\/; Max-Age=2592000; Secure/)
    expect((await (await call('/auth/session', 'GET', undefined, session)).json()).user).not.toBeNull()
    const logout = await call('/auth/logout', 'POST', {}, session); expect(logout.headers.get('Set-Cookie')).toContain('Max-Age=0')
    expect((await (await call('/auth/session', 'GET', undefined, session)).json()).user).toBeNull()
  })
  it('signs in across devices without changing signup consent or public identity', async () => {
    const { signup, start, call, db } = await fixture(); const first = await signup('member@example.test', true)
    const challenge = await start('signin'), second = await call('/auth/verify', 'POST', challenge)
    expect(second.status).toBe(200); const next = second.headers.get('X-Octamod-Session')!
    expect((await (await call('/auth/session', 'GET', undefined, next)).json()).user.id).toBe(first.user.id)
    expect((await call('/auth/account', 'PATCH', { newsletter: false }, next)).status).toBe(200)
    const existing = await start('signup', 'member@example.test', { displayName: 'Replacement', newsletter: true })
    const again = await call('/auth/verify', 'POST', existing)
    expect((await again.json()).user).toMatchObject({ id: first.user.id, displayName: 'Member', newsletter: false })
    expect(db.prepare('SELECT COUNT(*) AS count FROM accounts').get()).toEqual({ count: 1 })
    expect(db.prepare("SELECT COUNT(*) AS count FROM users WHERE id!='administrator'").get()).toEqual({ count: 1 })
    await call('/auth/logout', 'POST', {}, next)
    expect((await (await call('/auth/session', 'GET', undefined, first.session)).json()).user).not.toBeNull()
    expect((await (await call('/auth/session', 'GET', undefined, next)).json()).user).toBeNull()
  })
  it('rejects unknown login after email proof without leaking account existence at request time', async () => {
    const { start, call, db } = await fixture(); const challenge = await start('signin', 'unknown@example.test')
    expect((await call('/auth/verify', 'POST', challenge)).status).toBe(400)
    expect(db.prepare('SELECT COUNT(*) AS count FROM accounts').get()).toEqual({ count: 0 })
  })
  it('expires codes and sessions and bounds incorrect verification attempts', async () => {
    const { start, call, signup, db, env } = await fixture(); const challenge = await start()
    for (let i = 0; i < 5; i++) expect((await call('/auth/verify', 'POST', { ...challenge, code: challenge.code === '00000000' ? '11111111' : '00000000' })).status).toBe(400)
    expect((await call('/auth/verify', 'POST', challenge)).status).toBe(400)
    const expired = await start('signup', 'expiry@example.test'); db.prepare('UPDATE auth_challenges SET expires=1 WHERE id=?').run(expired.challengeId)
    expect((await call('/auth/verify', 'POST', expired)).status).toBe(400)
    const { session } = await signup('session@example.test'); db.prepare('UPDATE sessions SET expires=1').run()
    expect((await call('/modules/miniverb/like', 'POST', { liked: true }, session)).status).toBe(401)
    await cleanupAccounts(env.DB!); expect(db.prepare('SELECT COUNT(*) AS count FROM sessions').get()).toEqual({ count: 0 })
    expect(db.prepare('SELECT id FROM auth_challenges WHERE id=?').get(expired.challengeId)).toBeUndefined()
  })
  it('consumes a code once under concurrent verification requests', async () => {
    const { start, call, db } = await fixture(), challenge = await start()
    const results = await Promise.all([call('/auth/verify', 'POST', challenge), call('/auth/verify', 'POST', challenge)])
    expect(results.map(result => result.status).sort()).toEqual([200, 400]); expect(db.prepare('SELECT COUNT(*) AS count FROM accounts').get()).toEqual({ count: 1 })
  })
  it('keeps a code retryable when account creation rolls back and refuses proofs removed before the transaction', async () => {
    const { start, call, env, db } = await fixture(), challenge = await start()
    const batch = env.DB!.batch.bind(env.DB!)
    env.DB!.batch = async items => batch([...items, env.DB!.prepare('INSERT INTO accounts(user_id,email,verified_at,newsletter_changed_at) VALUES(NULL,NULL,NULL,NULL)')])
    expect((await call('/auth/verify', 'POST', challenge)).status).toBe(500)
    expect(db.prepare('SELECT COUNT(*) AS count FROM accounts').get()).toEqual({ count: 0 })
    expect(db.prepare('SELECT id FROM auth_challenges WHERE id=?').get(challenge.challengeId)).not.toBeUndefined()
    env.DB!.batch = batch
    expect((await call('/auth/verify', 'POST', challenge)).status).toBe(200)
    const withdrawn = await start('signup', 'withdrawn@example.test')
    env.DB!.batch = async items => { db.prepare('DELETE FROM auth_challenges WHERE id=?').run(withdrawn.challengeId); return batch(items) }
    expect((await call('/auth/verify', 'POST', withdrawn)).status).toBe(400)
    expect(db.prepare('SELECT user_id FROM accounts WHERE email=?').get('withdrawn@example.test')).toBeUndefined()
  })
  it('requires a separate fresh deletion code, removes owned data and revokes every session', async () => {
    const { signup, start, call, db } = await fixture(), owner = await signup('owner@example.test', true), other = await signup('other@example.test')
    const second = (await call('/auth/verify', 'POST', await start('signin', 'owner@example.test'))).headers.get('X-Octamod-Session')!
    for (const [kind, body] of [['comments', { body: 'Owned' }], ['rating', { value: 5 }], ['like', { liked: true }]] as const) await call('/modules/miniverb/' + kind, 'POST', body, owner.session)
    await call('/modules/miniverb/comments', 'POST', { body: 'Other' }, other.session)
    db.prepare("INSERT INTO issues(id,module_id,author_login,reporter_id,title,body) VALUES('owned-report','miniverb','sambanks',?,'Report','Details')").run(owner.user.id)
    db.prepare("INSERT INTO issue_logs(issue_id,text,bytes,summary_json) VALUES('owned-report','test',4,'{}')").run()
    expect((await call('/auth/account', 'DELETE', { confirmation: 'DELETE' }, owner.session)).status).toBe(400)
    const loginCode = await start('signin', 'owner@example.test')
    expect((await call('/auth/account', 'DELETE', { ...loginCode, confirmation: 'DELETE' }, owner.session)).status).toBe(400)
    const deletion = await start('delete', '', {}, owner.session)
    expect((await call('/auth/verify', 'POST', deletion)).status).toBe(400)
    expect((await call('/auth/account', 'DELETE', { ...deletion, confirmation: 'DELETE' }, other.session)).status).toBe(400)
    const deleted = await call('/auth/account', 'DELETE', { ...deletion, confirmation: 'DELETE' }, owner.session)
    expect(deleted.status).toBe(200); expect(deleted.headers.get('X-Octamod-Session')).toBe('')
    for (const session of [owner.session, second]) expect((await call('/modules/miniverb/comments', 'POST', { body: 'Expired' }, session)).status).toBe(401)
    expect(db.prepare('SELECT user_id FROM accounts WHERE email=?').get('owner@example.test')).toBeUndefined()
    for (const table of ['ratings', 'likes', 'issues', 'issue_logs', 'auth_challenges']) expect(db.prepare('SELECT COUNT(*) AS count FROM ' + table).get()).toEqual({ count: 0 })
    expect(db.prepare('SELECT body FROM comments').get()).toEqual({ body: 'Other' })
    expect(db.prepare('SELECT id FROM users WHERE id=?').get(owner.user.id)).toBeUndefined()
    expect((await (await call('/auth/session', 'GET', undefined, other.session)).json()).user.id).toBe(other.user.id)
    expect((await call('/auth/account', 'DELETE', { ...deletion, confirmation: 'DELETE' }, owner.session)).status).toBe(401)
  })
  it('deletes account credentials while preserving reviewed source attribution', async () => {
    const { signup, start, call, db } = await fixture(), owner = await signup()
    db.prepare("UPDATE users SET github_login='original-author',github_id='old-id' WHERE id=?").run(owner.user.id)
    db.prepare("INSERT INTO submissions(id,owner_id,module_id,title,repository_url,description,usage,test_report_url,stress_notes,quality_notes,resource_notes,license,status) VALUES('published',?,'new-module','Original module','https://github.com/original-author/repo','Description','Usage','https://github.com/original-author/repo','Stress','Quality','Resources','MIT','approved')").run(owner.user.id)
    db.prepare("INSERT INTO module_publications(module_id,submission_id) VALUES('new-module','published')").run()
    const result = await call('/auth/account', 'DELETE', { ...await start('delete', '', {}, owner.session), confirmation: 'DELETE' }, owner.session)
    expect(result.status).toBe(200)
    expect(db.prepare('SELECT display_name,github_id,github_login FROM users WHERE id=?').get(owner.user.id)).toEqual({ display_name: 'Deleted account', github_id: null, github_login: 'original-author' })
    expect(db.prepare('SELECT COUNT(*) AS count FROM accounts').get()).toEqual({ count: 0 })
    expect((await (await call('/catalog')).json())[0].author).toBe('original-author')
  })
  it('never upgrades legacy guest sessions to accounts and prevents admin privilege through email', async () => {
    const { db, call, signup } = await fixture(); db.prepare("INSERT INTO users(id,display_name) VALUES('guest','Legacy')").run()
    db.prepare("INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,'guest',?)").run(await digest('a'.repeat(64)), Math.floor(Date.now() / 1000) + 1000)
    expect((await (await call('/auth/session', 'GET', undefined, 'a'.repeat(64))).json()).user).toBeNull()
    expect((await call('/modules/miniverb/comments', 'POST', { body: 'Guest' }, 'a'.repeat(64))).status).toBe(401)
    const { session } = await signup('admin@example.test')
    expect((await call('/admin/issues', 'GET', undefined, session)).status).toBe(403)
  })
  it('rejects provider redirects without forwarding credentials or retaining a challenge', async () => {
    const { call, mail, db } = await fixture()
    mail.mockResolvedValueOnce(Response.json({}, { status: 302, headers: { Location: 'https://elsewhere.test' } }))
    const result = await call('/auth/code', 'POST', { purpose: 'signin', email: 'member@example.test' })
    expect(result.status).toBe(503); expect(await result.text()).not.toContain('test-secret')
    expect(mail).toHaveBeenCalledOnce(); expect(mail.mock.calls[0][1].redirect).toBe('manual')
    expect(db.prepare('SELECT COUNT(*) AS count FROM auth_challenges').get()).toEqual({ count: 0 })
  })
  it('fails closed on missing or failed mail delivery, rejects malformed input and limits mail abuse', async () => {
    const { env, mail, call, db } = await fixture()
    env.RESEND_API_KEY = ''
    expect((await call('/auth/code', 'POST', { purpose: 'signup', email: 'member@example.test', displayName: 'Member', newsletter: false })).status).toBe(503)
    env.RESEND_API_KEY = 'test-secret'; mail.mockResolvedValueOnce(Response.json({}, { status: 403 }))
    expect((await call('/auth/code', 'POST', { purpose: 'signup', email: 'member@example.test', displayName: 'Member', newsletter: false })).status).toBe(503)
    expect(db.prepare('SELECT COUNT(*) AS count FROM auth_challenges').get()).toEqual({ count: 0 })
    expect((await call('/auth/code', 'POST', { purpose: 'signup', email: 'bad', displayName: 'Member', newsletter: false })).status).toBe(400)
    expect((await call('/auth/code', 'POST', { purpose: 'signup', email: 'member@example.test', displayName: 'Member', newsletter: 'yes' })).status).toBe(400)
    expect((await call('/auth/code', 'POST', { purpose: 'delete' })).status).toBe(401)
    expect((await call('/auth/code', 'POST', { purpose: 'signin', email: 'member@example.test' }, '', 'https://evil.test')).status).toBe(403)
    for (let i = 0; i < 4; i++) expect((await call('/auth/code', 'POST', { purpose: 'signin', email: 'member@example.test' })).status).toBe(202)
    expect((await call('/auth/code', 'POST', { purpose: 'signin', email: 'member@example.test' })).status).toBe(429)
    expect((await call('/auth/account', 'PATCH', { newsletter: true })).status).toBe(401)
  })
})
