import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { testDatabase } from './test-server'
import { communityModule } from './modules'
import { developerApi } from '../../server/developers'
import type { Env, User } from '../../server/platform'

const databases: DatabaseSync[] = []
afterEach(() => { vi.unstubAllGlobals(); for (const db of databases.splice(0)) db.close() })
function fixture({ mirrored = false } = {}) {
  const { db, adapter } = testDatabase(); databases.push(db)
  const module = communityModule('miniverb')!, developer: User = { id: 'maker', display_name: 'Maker', github_id: '67785539', github_login: module.maintainers[0] }
  db.prepare('INSERT INTO users(id,display_name,github_id,github_login) VALUES(?,?,?,?)').run(developer.id, developer.display_name, developer.github_id!, developer.github_login!)
  db.prepare('INSERT INTO module_maintainers(module_id,user_id,github_login) VALUES(?,?,?)').run(module.id, developer.id, developer.github_login!)
  for (const id of ['reporter', 'fan', 'optedout']) {
    db.prepare('INSERT INTO users(id,display_name,username,email_verified) VALUES(?,?,?,1)').run(id, id, id)
    db.prepare('INSERT INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,0,0)').run(id, id, id + '@example.test')
  }
  for (const id of ['reporter', 'fan']) db.prepare('INSERT INTO module_update_subscriptions(user_id,module_id,after_version) VALUES(?,?,?)').run(id, module.id, '0.0.1')
  db.prepare('INSERT INTO module_update_opt_outs(user_id,module_id) VALUES(?,?)').run('optedout', module.id)
  db.prepare('INSERT INTO notification_preferences(user_id,email_enabled,updates) VALUES(?,0,0)').run('fan')
  db.prepare("INSERT INTO issues(id,module_id,author_login,reporter_id,title,body,maintainer_sharing,github_number) VALUES(?,?,?,'reporter','Private title','Private body',1,?)").run('report-one', module.id, developer.github_login!, mirrored ? 21 : null)
  db.prepare('INSERT INTO module_release_state(module_id,version) VALUES(?,?)').run(module.id, '0.0.1')
  db.prepare('INSERT INTO module_release_inventory(singleton) VALUES(1)').run()
  const env: Env = { APP_URL: 'https://app.example.test/', GITHUB_TOKEN: 'test-token', GITHUB_REPOSITORY: 'repeat98/modwerk' }
  const comments: { body: string }[] = [], calls: { url: string; method: string; body: unknown }[] = []
  let live = true, gitFailure = false
  vi.stubGlobal('fetch', vi.fn(async (value: string | URL, options: RequestInit) => {
    const url = String(value), method = options.method ?? 'GET', body = options.body ? JSON.parse(String(options.body)) : undefined
    calls.push({ url, method, body })
    if (url === 'https://app.example.test/module-releases.json') return Response.json({ format: 'modwerk-module-releases-v1', modules: [{ id: module.id, name: module.name, version: live ? module.version : '0.0.1', href: module.href }] })
    if (gitFailure) return new Response('{}', { status: 503 })
    if (url.includes('/issues/21/comments')) { if (method === 'POST') comments.push(body); return Response.json(method === 'GET' ? comments : { id: 1 }) }
    if (url.endsWith('/issues/21') && method === 'PATCH') return Response.json({ state: 'closed' })
    throw new Error('Unexpected network request ' + url)
  }))
  const body = { version: module.version, issues: ['report-one'], verifiedDownload: true }
  const call = (data: unknown = body, member: User | null = developer, moduleId = module.id) => developerApi(new Request('https://api.example.test/api/developer/modules/' + moduleId + '/releases/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }), adapter, null, false, member, null, env)
  return { db, adapter, env, module, developer, body, calls, comments, call, offline: () => { live = false }, gitFailure: () => { gitFailure = true } }
}
describe('scoped release completion', () => {
  it('closes an authorized shared report and queues update and reporter notifications once, preserving delivery preferences and opt-outs', async () => {
    const f = fixture()
    for (let attempt = 0; attempt < 2; attempt++) expect(await (await f.call())!.json()).toMatchObject({ version: f.module.version, resolved: ['report-one'], updateNotificationsQueued: 2 })
    expect(f.db.prepare("SELECT status FROM issues WHERE id='report-one'").get()!.status).toBe('closed')
    expect(f.db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE kind='issue_resolved'").get()!.count).toBe(1)
    expect(f.db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE kind='module_update'").get()!.count).toBe(2)
    expect(f.db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id='optedout'").get()!.count).toBe(0)
    expect(f.db.prepare("SELECT email_enabled,updates FROM notification_preferences WHERE user_id='fan'").get()).toMatchObject({ email_enabled: 0, updates: 0 })
  })
  it('comments with public version/link and closes the GitHub issue before updating local status; retries are quiet', async () => {
    const f = fixture({ mirrored: true })
    await f.call(); await f.call()
    expect(f.comments).toHaveLength(1)
    expect(f.comments[0].body).toContain(f.module.version)
    expect(f.comments[0].body).toContain('https://app.example.test/' + f.module.href)
    expect(f.comments[0].body).not.toMatch(/Private title|Private body|test-token/)
    expect(f.calls.filter(call => call.method === 'PATCH')).toMatchObject([{ body: { state: 'closed', state_reason: 'completed' } }])
    expect(f.db.prepare("SELECT status FROM issues WHERE id='report-one'").get()!.status).toBe('closed')
  })
  it.each([null, { id: 'stranger', display_name: 'Stranger', github_id: '1', github_login: 'other' }])('rejects callers without declared developer access', async member => {
    const f = fixture(); await expect(f.call(f.body, member)).rejects.toThrow('Verify a GitHub account')
    expect(f.calls).toEqual([])
  })
  it('rejects a recycled login with another numeric GitHub identity', async () => {
    const f = fixture(); await expect(f.call(f.body, { ...f.developer, github_id: '1' })).rejects.toThrow('registered GitHub identity')
    expect(f.calls).toEqual([])
  })
  it('lets the registered maintainer reopen a mirrored report without GitHub repository write access', async () => {
    const f = fixture({ mirrored: true }); await f.call()
    const patch = new Request('https://api.example.test/api/issues/report-one', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'open' }) })
    const result = await developerApi(patch, f.adapter, null, false, f.developer, null, f.env)
    expect(result!.status).toBe(200)
    expect(f.calls.filter(call => call.method === 'PATCH').map(call => call.body)).toEqual([{ state: 'closed', state_reason: 'completed' }, { state: 'open' }])
    expect(f.db.prepare("SELECT status FROM issues WHERE id='report-one'").get()!.status).toBe('open')
  })
  it('rejects revoked claims and a different owned scope before any network or notification mutation', async () => {
    const f = fixture()
    await expect(f.call(f.body, f.developer, 'digitone-digihealth')).rejects.toThrow('do not maintain')
    f.db.prepare('UPDATE module_maintainers SET revoked=1').run()
    await expect(f.call()).rejects.toThrow('do not maintain')
    expect(f.calls).toEqual([])
  })
  it.each([{ verifiedDownload: false }, { version: '99.0.0' }, { issues: ['unknown'] }, { issues: ['report-one', 'report-one'] }])('requires version-bound download confirmation and accessible report IDs: %j', async change => {
    const f = fixture(); await expect(f.call({ ...f.body, ...change })).rejects.toThrow()
    expect(f.calls).toEqual([])
    expect(f.db.prepare("SELECT status FROM issues WHERE id='report-one'").get()!.status).toBe('open')
  })
  it('cannot resolve another module report or a report whose sharing was withdrawn', async () => {
    for (const sql of ["UPDATE issues SET module_id='tapehead'", 'UPDATE issues SET maintainer_sharing=0']) {
      const f = fixture(); f.db.prepare(sql).run(); await expect(f.call()).rejects.toThrow('outside your shared module access')
      expect(f.calls).toEqual([])
    }
  })
  it('keeps reports open and queues nothing while the old site is still live', async () => {
    const f = fixture(); f.offline(); await expect(f.call()).rejects.toThrow('not live yet')
    expect(f.db.prepare("SELECT status FROM issues WHERE id='report-one'").get()!.status).toBe('open')
    expect(f.db.prepare('SELECT COUNT(*) AS count FROM notifications').get()!.count).toBe(0)
  })
  it('keeps the local report open on missing GitHub configuration or GitHub failure', async () => {
    const f = fixture({ mirrored: true }); f.env.GITHUB_TOKEN = ''
    await expect(f.call()).rejects.toThrow('not configured')
    f.env.GITHUB_TOKEN = 'test-token'; f.gitFailure(); await expect(f.call()).rejects.toThrow('GitHub answered 503')
    expect(f.db.prepare("SELECT status FROM issues WHERE id='report-one'").get()!.status).toBe('open')
    expect(f.db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE kind='issue_resolved'").get()!.count).toBe(0)
  })
  it('does not turn a single-module completion into a full-library initialization', async () => {
    const f = fixture(); f.db.prepare('DELETE FROM module_release_inventory').run(); await f.call()
    expect(f.db.prepare('SELECT COUNT(*) AS count FROM module_release_inventory').get()!.count).toBe(0)
  })
})
