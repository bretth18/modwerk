import { afterEach, describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { testServer } from './test-server'
import { digest } from '../../server/security'
import { hardwareReportBody } from './build-follow-up'
import { communityModule } from './modules'

const databases: DatabaseSync[] = []
afterEach(() => { for (const db of databases.splice(0)) db.close() })
const build = { machine: 'Octatrack', os: '1.40C', modules: [{ id: 'miniverb', name: 'Mini Verb', version: '0.1.0-experimental' }, { id: 'tapeecho', name: 'Tape Echo', version: '0.2.0' }] }
async function fixture() {
  const server = await testServer(); databases.push(server.db)
  const token = 'a'.repeat(64)
  server.db.prepare("INSERT INTO users(id,display_name,username,email_verified) VALUES('reporter','Reporter','reporter',1)").run()
  server.db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(await digest(token), 'reporter', Math.floor(Date.now() / 1000) + 600)
  await server.call('/forum/threads')
  return { ...server, token }
}

describe('database working confirmations', () => {
  it('saves only the tested module with full historical build context and no forum activity', async () => {
    const { db, call, token } = await fixture()
    const totals = () => ['forum_posts', 'notifications', 'forum_follows'].map(table => db.prepare('SELECT COUNT(*) AS n FROM ' + table).get()!.n)
    const before = totals()
    expect((await call('/working-reports', 'POST', { testedModuleIds: ['miniverb'], build, userId: 'someone-else' }, token)).status).toBe(200)
    expect(totals()).toEqual(before)
    const saved = db.prepare('SELECT * FROM module_working_reports').get()!
    expect(saved).toMatchObject({ user_id: 'reporter', module_id: 'miniverb', machine: 'Octatrack', os: '1.40C', module_version: '0.1.0-experimental', source_post_id: null })
    expect(JSON.parse(String(saved.build_json))).toEqual(build)
    expect((await (await call('/modules/miniverb')).json()).worksReports).toBe(1)
    expect((await (await call('/modules/tapeecho')).json()).worksReports).toBe(0)
    expect(JSON.stringify(await (await call('/modules/miniverb')).json())).not.toContain('build_json')
  })
  it('atomically saves explicitly selected modules, deduplicates retries and counts members across builds', async () => {
    const { db, call, token } = await fixture()
    const report = { testedModuleIds: ['miniverb', 'tapeecho'], build }
    for (let i = 0; i < 2; i++) expect((await call('/working-reports', 'POST', report, token)).status).toBe(200)
    expect(db.prepare('SELECT COUNT(*) AS n FROM module_working_reports').get()!.n).toBe(2)
    const newer = { ...build, modules: build.modules.map(module => ({ ...module, version: '9.0.0' })) }
    expect((await call('/working-reports', 'POST', { ...report, build: newer }, token)).status).toBe(200)
    expect(db.prepare('SELECT COUNT(*) AS n FROM module_working_reports').get()!.n).toBe(4)
    const summary = await (await call('/community/summary')).json()
    for (const id of report.testedModuleIds) {
      expect(summary.find((item: { module_id: string }) => item.module_id === id).worksReports).toBe(1)
      expect((await (await call('/forum/threads/module-' + id)).json()).thread.worksReports).toBe(1)
    }
    db.prepare("UPDATE users SET suspended=1 WHERE id='reporter'").run()
    expect((await (await call('/modules/miniverb')).json()).worksReports).toBe(0)
  })
  it('allows a single quick confirmation when installed metadata is unknown', async () => {
    const { db, call, token } = await fixture()
    expect((await call('/working-reports', 'POST', { testedModuleIds: ['miniverb'] }, token)).status).toBe(200)
    expect(db.prepare('SELECT machine,os,module_version,build_json FROM module_working_reports').get()).toEqual({ machine: 'Octatrack', os: null, module_version: null, build_json: null })
    expect(await (await call('/working-reports?module=miniverb', 'GET', undefined, token)).json()).toEqual({ versions: [communityModule('miniverb')!.version] })
  })
  it('restores quick confirmations per version without resetting or inflating the member count', async () => {
    const { db, call, token } = await fixture()
    const status = async () => (await (await call('/working-reports?module=miniverb', 'GET', undefined, token)).json()).versions
    for (const version of ['1.0.0', '1.1.0']) {
      expect(await status()).not.toContain(version)
      for (let retry = 0; retry < 2; retry++) expect((await call('/working-reports', 'POST', { testedModuleIds: ['miniverb'], catalogVersion: version }, token)).status).toBe(200)
      for (let revisit = 0; revisit < 2; revisit++) expect(await status()).toContain(version)
      expect((await (await call('/modules/miniverb')).json()).worksReports).toBe(1)
    }
    expect(await status()).toHaveLength(2)
    expect(db.prepare('SELECT COUNT(*) AS n FROM module_working_reports').get()!.n).toBe(2)
    expect(db.prepare('SELECT COUNT(*) AS n FROM module_working_reports WHERE module_version IS NOT NULL OR build_json IS NOT NULL').get()!.n).toBe(0)
  })
  it('restores only the caller’s tested versions, never companions or another member’s confirmation', async () => {
    const { db, call, token } = await fixture()
    await call('/working-reports', 'POST', { testedModuleIds: ['miniverb'], build }, token)
    expect(await (await call('/working-reports?module=miniverb', 'GET', undefined, token)).json()).toEqual({ versions: [build.modules[0].version] })
    expect(await (await call('/working-reports?module=tapeecho', 'GET', undefined, token)).json()).toEqual({ versions: [] })
    const otherToken = 'b'.repeat(64)
    db.prepare("INSERT INTO users(id,display_name,username,email_verified) VALUES('other','Other','other',1)").run()
    db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(await digest(otherToken), 'other', Math.floor(Date.now() / 1000) + 600)
    expect(await (await call('/working-reports?module=miniverb', 'GET', undefined, otherToken)).json()).toEqual({ versions: [] })
    expect((await call('/working-reports?module=miniverb')).status).toBe(401)
    expect((await call('/working-reports?module=unknown', 'GET', undefined, token)).status).toBe(400)
    db.prepare("UPDATE users SET email_verified=0 WHERE id='reporter'").run()
    expect((await call('/working-reports?module=miniverb', 'GET', undefined, token)).status).toBe(403)
  })
  it('rejects unauthenticated, unverified, mixed, malformed and unbundled claims without partial writes', async () => {
    const { db, call, token } = await fixture()
    expect((await call('/working-reports', 'POST', { testedModuleIds: ['miniverb'] })).status).toBe(401)
    for (const body of [
      { testedModuleIds: ['miniverb', 'tapeecho'] }, { testedModuleIds: ['miniverb', 'miniverb'], build },
      { testedModuleIds: ['miniverb', 'euclid'], build }, { testedModuleIds: ['miniverb', 'digitakt-digihealth'], build },
      { testedModuleIds: ['miniverb'], build: { ...build, machine: 'Digitakt' } },
      { testedModuleIds: ['miniverb'], build: { ...build, modules: [{ ...build.modules[0], version: 'broken' }] } },
      { testedModuleIds: ['unknown'] },
      { testedModuleIds: ['miniverb'], catalogVersion: 'broken' },
    ]) expect((await call('/working-reports', 'POST', body, token)).status).toBe(400)
    db.prepare("UPDATE users SET email_verified=0 WHERE id='reporter'").run()
    expect((await call('/working-reports', 'POST', { testedModuleIds: ['miniverb'] }, token)).status).toBe(403)
    expect(db.prepare('SELECT COUNT(*) AS n FROM module_working_reports').get()!.n).toBe(0)
  })
  it('normalizes existing build context while companions stay unconfirmed and source edits/deletions are respected', async () => {
    const { db, call, token } = await fixture()
    const body = hardwareReportBody(build.machine, build.os, build.modules[0], build.modules)
    db.prepare("INSERT INTO forum_posts(id,thread_id,user_id,body) VALUES('old','module-miniverb','reporter',?)").run(body)
    await call('/community/summary')
    expect(JSON.parse(String(db.prepare("SELECT build_json FROM module_working_reports WHERE source_post_id='old'").get()!.build_json))).toEqual(build)
    expect((await (await call('/modules/tapeecho')).json()).worksReports).toBe(0)
    expect(await (await call('/working-reports?module=miniverb', 'GET', undefined, token)).json()).toEqual({ versions: [build.modules[0].version] })
    db.prepare("UPDATE forum_posts SET hidden=1 WHERE id='old'").run()
    expect(await (await call('/working-reports?module=miniverb', 'GET', undefined, token)).json()).toEqual({ versions: [] })
    db.prepare("UPDATE forum_posts SET body='**Works on my Octatrack**' WHERE id='old'").run()
    await call('/modules/miniverb')
    expect(db.prepare("SELECT module_version,build_json FROM module_working_reports WHERE source_post_id='old'").get()).toEqual({ module_version: null, build_json: null })
    db.prepare("UPDATE forum_posts SET hidden=2 WHERE id='old'").run()
    expect(db.prepare("SELECT * FROM module_working_reports WHERE source_post_id='old'").get()).toBeUndefined()
  })
  it('backfills reports already present before the database migration', () => {
    const db = new DatabaseSync(':memory:'); databases.push(db)
    const files = readdirSync(new URL('../../migrations/', import.meta.url)).filter(name => name.endsWith('.sql')).sort()
    for (const file of files.filter(name => name < '0060')) db.exec(readFileSync(new URL('../../migrations/' + file, import.meta.url), 'utf8'))
    db.exec("INSERT INTO users(id,display_name,username,email_verified) VALUES('legacy','Legacy','legacy',1); INSERT INTO forum_threads(id,user_id,title,category,module_id) VALUES('module-miniverb','legacy','Mini Verb','modules','miniverb'); INSERT INTO forum_posts(id,thread_id,user_id,body,created_at) VALUES('legacy-post','module-miniverb','legacy','**Works on my Octatrack**','2026-10-01 10:00:00')")
    db.exec(readFileSync(new URL('../../migrations/0060_module_working_reports.sql', import.meta.url), 'utf8'))
    expect(db.prepare('SELECT module_id,source_post_id,created_at,context_pending FROM module_working_reports').get()).toEqual({ module_id: 'miniverb', source_post_id: 'legacy-post', created_at: '2026-10-01 10:00:00', context_pending: 1 })
  })
  it('migrates earlier button presses to the release at save time and preserves unknown firmware metadata', () => {
    const db = new DatabaseSync(':memory:'); databases.push(db)
    const files = readdirSync(new URL('../../migrations/', import.meta.url)).filter(name => name.endsWith('.sql')).sort()
    for (const file of files.filter(name => name < '0064')) db.exec(readFileSync(new URL('../../migrations/' + file, import.meta.url), 'utf8'))
    db.exec("INSERT INTO users(id,display_name,username,email_verified) VALUES('legacy','Legacy','legacy',1)")
    for (const [version, detectedAt] of [['1.0.0', '2026-10-01 10:00:00'], ['1.1.0', '2026-10-08 10:00:00']]) db.prepare('INSERT INTO module_releases(module_id,version,name,href,detected_at) VALUES(?,?,?,?,?)').run('miniverb', version, 'Mini Verb', '#module/mini-verb', detectedAt)
    db.prepare('INSERT INTO module_working_reports(id,user_id,module_id,context_key,created_at) VALUES(?,?,?,?,?)').run('quick', 'legacy', 'miniverb', 'unknown', '2026-10-05 10:00:00')
    db.exec(readFileSync(new URL('../../migrations/0064_working_confirmation_versions.sql', import.meta.url), 'utf8'))
    expect(db.prepare('SELECT catalog_version,context_key,module_version,build_json,created_at FROM module_working_reports').get()).toEqual({ catalog_version: '1.0.0', context_key: 'unknown:1.0.0', module_version: null, build_json: null, created_at: '2026-10-05 10:00:00' })
  })
})
