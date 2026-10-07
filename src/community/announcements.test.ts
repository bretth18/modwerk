import { COMMUNITY_RULES_VERSION } from '../legal/policy'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { testServer } from './test-server'
import { sendActivityDigests } from '../../server/activity-mail'
import { announcementLink } from '../../server/announcements'
import { notificationLines } from './notification-text'
import type { BellItem } from './notification-contract'

type Sent = { to: string[]; subject: string; text: string }
const databases: DatabaseSync[] = [], sent: Sent[] = [], password = 'a long original test passphrase'
beforeEach(() => { sent.length = 0; vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => { sent.push(JSON.parse(String(options.body))); return Response.json({ id: 'synthetic-email' }) })) })
afterEach(() => { vi.unstubAllGlobals(); for (const db of databases.splice(0)) db.close() })

async function fixture() {
  const server = await testServer(); databases.push(server.db)
  server.env.AUTH_BASE_URL = 'https://api.example.test/api/auth'
  async function member(username: string) {
    const email = username + '@example.test'
    expect((await server.call('/auth/register', 'POST', { rulesVersion: COMMUNITY_RULES_VERSION, username, email, password })).status).toBe(202)
    const token = [...sent].reverse().find(message => message.to[0] === email)!.text.match(/#account\/verify\/([^\s]+)/)![1]
    expect((await server.call('/auth/verify', 'POST', { token, password })).status).toBe(200)
    const login = await server.call('/auth/login', 'POST', { email, password })
    return { id: String(server.db.prepare('SELECT id FROM auth_users WHERE email=?').get(email)!.id), session: login.headers.get('X-Octamod-Session')! }
  }
  const bell = async (session: string) => (await (await server.call('/notifications', 'GET', undefined, session)).json()) as { items: BellItem[]; unread: number }
  const unread = async (session: string) => (await (await server.call('/notifications/unread', 'GET', undefined, session)).json()).unread as number
  const { token: admin } = await (await server.call('/auth/admin', 'POST', { key: 'e'.repeat(64) })).json()
  const announce = (body: Record<string, unknown>) => server.call('/admin/announcements', 'POST', body, '', admin)
  return { ...server, member, bell, unread, admin, announce }
}
// Any catalog module will do; the announcement links to its page.
const release = { slug: 'miniverb-update-2026-10-05', title: 'Mini Verb has a new release', body: 'Plain words about what changed and where to find it.', moduleId: 'miniverb' }

describe('operator announcements in the bell', () => {
  it('lets only the operator send, list and remove them', async () => {
    const { call, member, announce, admin } = await fixture(), reader = await member('readerone')
    expect((await call('/admin/announcements', 'POST', release)).status).toBe(403)
    expect((await call('/admin/announcements', 'POST', release, reader.session)).status).toBe(403)
    expect((await call('/admin/announcements', 'GET', undefined, reader.session)).status).toBe(403)
    const created = await announce(release)
    expect(created.status).toBe(201)
    const { id } = await created.json()
    expect((await call('/admin/announcements/' + id, 'DELETE', undefined, reader.session)).status).toBe(403)
    expect(await (await call('/admin/announcements', 'GET', undefined, '', admin)).json()).toMatchObject([{ id, slug: release.slug, title: release.title, reads: 0, audience: 1 }]) // The reader joined before it was sent.
  })

  it('refuses what a bell entry may not contain', async () => {
    const { announce } = await fixture()
    for (const bad of [
      { ...release, slug: 'Bad Key' }, { ...release, slug: 'ab' }, { ...release, title: 'no' }, { ...release, title: 'x'.repeat(121) },
      { ...release, body: '' }, { ...release, body: 'x'.repeat(401) }, { ...release, body: 'bell\u0007' }, { ...release, moduleId: 'not-a-module' },
      { ...release, url: 'https://evil.example/phish' }, { ...release, url: 'javascript:alert(1)' }, { ...release, url: 'https://modwerk.app.evil.example/' }, { ...release, url: '//evil.example' },
    ]) expect((await announce(bad)).status, JSON.stringify(bad).slice(0, 80)).toBe(400)
    expect((await announce({ ...release, url: '#module/miniverb' })).status).toBe(201)
    expect((await announce({ ...release, slug: 'second-one', url: 'https://modwerk.app/#library' })).status).toBe(201)
    expect(announcementLink(undefined)).toBeNull(); expect(announcementLink('')).toBeNull()
  })

  it('reaches every member, with their own read state and no second send of the same key', async () => {
    const { member, bell, unread, announce, call } = await fixture(), one = await member('readerone'), two = await member('readertwo')
    expect((await announce(release)).status).toBe(201)
    expect((await announce(release)).status).toBe(409)
    expect(await unread(one.session)).toBe(1); expect(await unread(two.session)).toBe(1)
    const first = await bell(one.session)
    expect(first.unread).toBe(1)
    expect(first.items).toEqual([expect.objectContaining({ kind: 'announcement', seen: false, actorOfficial: true, title: release.title, excerpt: release.body, module_id: 'miniverb', url: null })])
    // One member reading it changes nothing for the other.
    expect((await call('/notifications', 'PATCH', { ids: [first.items[0].id] }, one.session)).status).toBe(200)
    expect(await unread(one.session)).toBe(0); expect(await unread(two.session)).toBe(1)
    expect((await bell(one.session)).items[0].seen).toBe(true)
    expect((await call('/notifications', 'PATCH', {}, two.session)).status).toBe(200)
    expect(await unread(two.session)).toBe(0)
  })

  it('shows announcements beside activity, newest first, and marks either kind without touching the other', async () => {
    const { member, bell, unread, announce, call } = await fixture(), author = await member('authorone'), other = await member('othertwo')
    const { id } = await (await call('/forum/threads', 'POST', { title: 'How do you use Mini Verb?', body: 'Share your settings.', category: 'modules', moduleId: 'miniverb' }, author.session)).json()
    await call('/forum/threads/' + id + '/replies', 'POST', { body: 'Short decay.' }, other.session)
    await announce(release)
    const items = await bell(author.session)
    expect(items.unread).toBe(2)
    expect(items.items.map(item => item.kind).sort()).toEqual(['announcement', 'reply'])
    const note = items.items.find(item => item.kind === 'announcement')!, reply = items.items.find(item => item.kind === 'reply')!
    expect((await call('/notifications', 'PATCH', { ids: [reply.id] }, author.session)).status).toBe(200)
    expect(await unread(author.session)).toBe(1)
    expect((await call('/notifications', 'PATCH', { ids: ['announcement-' + 'f'.repeat(32), note.id] }, author.session)).status).toBe(200)
    expect(await unread(author.session)).toBe(0)
    expect((await call('/notifications', 'PATCH', { ids: [note.id] }, other.session)).status).toBe(200)
    expect(await unread(other.session)).toBe(0)
  })

  it('does not show history to a member who joins later, and a removal takes it out of every bell', async () => {
    const { member, bell, unread, announce, call, db, admin } = await fixture(), early = await member('earlyone')
    const { id } = await (await announce(release)).json()
    // Sent a day before the late member's account exists.
    db.prepare("UPDATE announcements SET created_at='2000-01-01 00:00:00' WHERE id=?").run(id)
    const late = await member('latetwo')
    expect(await unread(late.session)).toBe(0); expect((await bell(late.session)).items).toEqual([])
    db.prepare("UPDATE announcements SET created_at=CURRENT_TIMESTAMP WHERE id=?").run(id)
    expect(await unread(late.session)).toBe(1)
    expect((await call('/notifications', 'PATCH', {}, early.session)).status).toBe(200)
    expect(db.prepare('SELECT COUNT(*) AS n FROM announcement_reads').get()).toEqual({ n: 1 })
    expect((await call('/admin/announcements/' + id, 'DELETE', undefined, '', admin)).status).toBe(200)
    expect((await call('/admin/announcements/' + id, 'DELETE', undefined, '', admin)).status).toBe(404)
    expect(await unread(late.session)).toBe(0); expect((await bell(early.session)).items).toEqual([])
    expect(db.prepare('SELECT COUNT(*) AS n FROM announcement_reads').get()).toEqual({ n: 0 })
  })

  it('is never mailed, and no activity entry is made for it', async () => {
    const { member, announce, db } = await fixture()
    await member('readerone'); await member('readertwo')
    await announce(release)
    expect(db.prepare('SELECT COUNT(*) AS n FROM notifications').get()).toEqual({ n: 0 })
    const server = await testServer(); databases.push(server.db)
    sent.length = 0
    await sendActivityDigests(server.env, server.env.DB!, new Date(Date.now() + 3 * 60 * 60 * 1000))
    expect(sent).toEqual([])
  })

  it('renders as an official line that opens its link, or the module page, or the library', () => {
    const base = { seen: false, created_at: '2026-10-05 12:00:00', thread_id: null, post_id: null, actor: null, actorOfficial: true, rating: null, issue_id: null, github_actor: null, kind: 'announcement' as const, title: 'Mini Verb has a new release', excerpt: 'Plain words about what changed.' }
    const lines = notificationLines([
      { ...base, id: 'announcement-1', module_id: 'miniverb', url: null },
      { ...base, id: 'announcement-2', module_id: null, url: 'https://modwerk.app/#library' },
      { ...base, id: 'announcement-3', module_id: null, url: null, title: null },
    ])
    expect(lines.map(line => line.text)).toEqual(['Modwerk: Mini Verb has a new release', 'Modwerk: Mini Verb has a new release', 'Modwerk: News'])
    expect(lines.map(line => line.href)).toEqual(['#module/miniverb', 'https://modwerk.app/#library', '#library'])
    expect(lines[0].excerpt).toBe('Plain words about what changed.')
  })
})
