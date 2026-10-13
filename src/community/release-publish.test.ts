import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose'
import { DatabaseSync } from 'node:sqlite'
import { testDatabase } from './test-server'
import { handleCommunity } from '../../server/transport'
import { recordModuleReleases } from '../../server/module-updates'
import { sendActivityDigests } from '../../server/activity-mail'
import { digest } from '../../server/security'
import type { Env } from '../../server/platform'

const issuer = 'https://token.actions.githubusercontent.com'
const target = 'https://api.example.test/api/module-releases/sync'
const release = (version = '10.0.0') => ({ id: 'miniverb', version, name: 'Mini Verb', href: '#module/miniverb', notes: { announce: true, version, date: '2026-10-09', changes: ['Improve playback.'] } })
const inventory = (version = '10.0.0') => JSON.stringify({ format: 'modwerk-module-releases-v1', modules: [release(version)] })
let keys: Awaited<ReturnType<typeof generateKeyPair>>, otherKeys: typeof keys, jwk: Awaited<ReturnType<typeof exportJWK>>
const databases: DatabaseSync[] = []
beforeAll(async () => {
  keys = await generateKeyPair('RS256', { extractable: true })
  otherKeys = await generateKeyPair('RS256')
  jwk = { ...await exportJWK(keys.publicKey), kid: 'release-test', alg: 'RS256', use: 'sig' }
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); for (const db of databases.splice(0)) db.close() })

async function signed(overrides: JWTPayload = {}, privateKey = keys.privateKey) {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({
    iss: issuer, aud: target, sub: 'repo:repeat98/modwerk:environment:github-pages',
    repository: 'repeat98/modwerk', repository_id: '1399349338', repository_owner_id: '67785539',
    workflow_ref: 'repeat98/modwerk/.github/workflows/pages.yml@refs/heads/main', ref: 'refs/heads/main',
    environment: 'github-pages', event_name: 'push', run_id: '123456', sha: 'a'.repeat(40),
    iat: now, nbf: now - 1, exp: now + 300, ...overrides,
  }).setProtectedHeader({ alg: 'RS256', kid: 'release-test' }).sign(privateKey)
}

async function fixture() {
  const { db, adapter } = testDatabase(); databases.push(db)
  const env: Env = {
    DB: adapter, APP_URL: 'https://site.example.test/', AUTH_BASE_URL: 'https://api.example.test/api/auth',
    RELEASE_REPOSITORY_ID: '1399349338', RELEASE_REPOSITORY_OWNER_ID: '67785539',
    AUTH_SECRET: 'only-a-test-secret-with-adequate-entropy-1234567890', RESEND_API_KEY: 'test', EMAIL_FROM: 'updates@example.test',
  }
  await recordModuleReleases(adapter, [release('9.0.0')])
  for (const id of ['mail', 'email-off', 'updates-off', 'hours', 'daily', 'unfollowed', 'suspended']) {
    db.prepare('INSERT INTO users(id,display_name,username,email_verified,suspended) VALUES(?,?,?,1,?)').run(id, id, id, Number(id === 'suspended'))
    db.prepare('INSERT INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,0,0)').run(id, id, id + '@example.test')
    if (id !== 'unfollowed') db.prepare("INSERT INTO module_update_subscriptions(user_id,module_id,after_version) VALUES(?,'miniverb','9.0.0')").run(id)
  }
  db.prepare("INSERT INTO module_update_opt_outs(user_id,module_id) VALUES('unfollowed','miniverb')").run()
  db.prepare("INSERT INTO notification_preferences(user_id,email_enabled) VALUES('email-off',0)").run()
  db.prepare("INSERT INTO notification_preferences(user_id,updates) VALUES('updates-off',0)").run()
  const recent = new Date().toISOString().replace('T', ' ').slice(0, 19)
  db.prepare("INSERT INTO notification_preferences(user_id,frequency,last_digest_at) VALUES('hours','hours',?),('daily','daily',?)").run(recent, recent)
  let live = inventory()
  const mails: { to: string[]; text: string }[] = []
  const fetch = vi.fn(async (input: string | URL | Request, options?: RequestInit) => {
    const url = String(input)
    if (url === issuer + '/.well-known/jwks') return Response.json({ keys: [jwk] })
    if (url === 'https://site.example.test/module-releases.json') return new Response(live, { headers: { 'Content-Type': 'application/json' } })
    if (url === 'https://api.resend.com/emails') { mails.push(JSON.parse(String(options?.body))); return Response.json({ id: 'accepted' }) }
    throw new Error('Unexpected fetch destination')
  })
  vi.stubGlobal('fetch', fetch)
  const inventorySha256 = await digest(inventory())
  const call = async (token: string, body: unknown = { inventorySha256 }) => handleCommunity(new Request(target, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env)
  const count = () => Number(db.prepare('SELECT COUNT(*) AS n FROM notifications').get()!.n)
  return { db, adapter, env, fetch, call, count, mails, setLive: (value: string) => { live = value } }
}

describe('frontend publication notifications', () => {
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })

  it('keeps a signed deployment quiet when the published version has no announcement opt-in', async () => {
    const f = await fixture(), quiet = release()
    const notes: { announce?: boolean } = quiet.notes
    delete notes.announce
    const live = JSON.stringify({ format: 'modwerk-module-releases-v1', modules: [quiet] })
    f.setLive(live)
    expect(await (await f.call(await signed(), { inventorySha256: await digest(live) })).json()).toEqual({ checked: 1, notified: 0 })
    expect(f.count()).toBe(0)
    expect(f.mails).toEqual([])
    expect(f.db.prepare('SELECT version FROM module_release_state').get()!.version).toBe('10.0.0')
    expect(f.db.prepare('SELECT COUNT(*) AS count FROM announcements').get()!.count).toBe(0)
  })

  it('queues followers immediately, never sends mail from publication, and keeps digest preferences', async () => {
    const f = await fixture(), token = await signed()
    expect(await (await f.call(token)).json()).toEqual({ checked: 1, notified: 5 })
    expect(f.count()).toBe(5)
    expect(f.mails).toEqual([])
    expect(f.db.prepare('SELECT user_id FROM notifications ORDER BY user_id').all().map(row => row.user_id)).toEqual(['daily', 'email-off', 'hours', 'mail', 'updates-off'])
    expect(await (await f.call(token)).json()).toEqual({ checked: 1, notified: 0 })
    await recordModuleReleases(f.adapter, [release()])
    expect(f.count()).toBe(5)
    expect(await sendActivityDigests(f.env, f.adapter)).toEqual({ sent: 0 })
    expect(await sendActivityDigests(f.env, f.adapter, new Date(Date.now() + 15 * 60000))).toEqual({ sent: 0 })
    expect(await sendActivityDigests(f.env, f.adapter, new Date(Date.now() + (24 * 60 + 15) * 60000))).toEqual({ sent: 3 })
    expect(f.mails.map(mail => mail.to[0]).sort()).toEqual(['daily@example.test', 'hours@example.test', 'mail@example.test'])
    expect(f.mails[0].text).toContain('Improve playback.')
    expect(f.db.prepare("SELECT email_enabled FROM notification_preferences WHERE user_id='email-off'").get()!.email_enabled).toBe(0)
    expect(f.db.prepare("SELECT updates FROM notification_preferences WHERE user_id='updates-off'").get()!.updates).toBe(0)
    expect(f.db.prepare("SELECT COUNT(*) AS n FROM module_update_opt_outs WHERE user_id='unfollowed'").get()!.n).toBe(1)
  })

  it('accepts immutable GitHub subject IDs and only the supported main deployment events', async () => {
    const f = await fixture()
    for (const event_name of ['push', 'workflow_dispatch', 'schedule']) {
      expect((await f.call(await signed({ event_name, sub: 'repo:repeat98@67785539/modwerk@1399349338:environment:github-pages' }))).status).toBe(200)
    }
    expect(f.count()).toBe(5)
  })

  it.each([
    { repository: 'attacker/modwerk' }, { repository_id: '1' }, { repository_owner_id: '1' },
    { workflow_ref: 'repeat98/modwerk/.github/workflows/worker.yml@refs/heads/main' },
    { ref: 'refs/heads/unreviewed' }, { environment: 'preview' }, { sub: 'repo:repeat98/modwerk:pull_request' },
    { event_name: 'pull_request_target' }, { aud: 'https://other.example.test/' }, { iss: 'https://other.example.test' },
    { run_id: 'not-a-run' }, { sha: 'bad-sha' }, { exp: 1 }, { nbf: 9999999999 }, { exp: undefined }, { iat: undefined },
  ])('rejects an untrusted or expired deployment before fetching the site: %j', async overrides => {
    const f = await fixture()
    expect((await f.call(await signed(overrides))).status).toBe(403)
    expect(f.count()).toBe(0)
    expect(f.fetch.mock.calls.some(([url]) => String(url).includes('site.example.test'))).toBe(false)
    expect(f.db.prepare('SELECT version FROM module_release_state').get()!.version).toBe('9.0.0')
  })

  it('rejects missing credentials, forged signatures, and unconfigured repository identity', async () => {
    const f = await fixture()
    expect((await f.call('not-a-token')).status).toBe(403)
    expect((await f.call(await signed({}, otherKeys.privateKey))).status).toBe(403)
    delete f.env.RELEASE_REPOSITORY_ID
    expect((await f.call(await signed())).status).toBe(503)
    expect(f.count()).toBe(0)
  })

  it('waits for the exact published inventory before any notification or release state write', async () => {
    const f = await fixture(), token = await signed()
    f.setLive(inventory('9.0.0'))
    expect((await f.call(token)).status).toBe(409)
    expect(f.count()).toBe(0)
    expect(f.db.prepare('SELECT version FROM module_release_state').get()!.version).toBe('9.0.0')
    f.setLive(inventory())
    expect((await f.call(token)).status).toBe(200)
    expect(f.count()).toBe(5)
    expect(f.fetch.mock.calls.find(([url]) => String(url).includes('site.example.test'))![1]!.redirect).toBe('manual')
  })

  it('refuses supplied inventories, malformed hashes and non-POST requests', async () => {
    const f = await fixture(), token = await signed()
    for (const body of [{ inventorySha256: 'bad' }, { inventorySha256: await digest(inventory()), modules: [release()] }]) {
      expect((await f.call(token, body)).status).toBe(400)
    }
    expect((await handleCommunity(new Request(target), f.env)).status).toBe(405)
    expect(f.count()).toBe(0)
  })

  it('does not mail a release the member already read in the bell', async () => {
    const f = await fixture()
    await f.call(await signed())
    f.db.prepare("UPDATE notifications SET seen=1 WHERE user_id='mail'").run()
    expect(await sendActivityDigests(f.env, f.adapter, new Date(Date.now() + 15 * 60000))).toEqual({ sent: 0 })
    expect(f.mails).toEqual([])
  })
})
