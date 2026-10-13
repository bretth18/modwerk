import { COMMUNITY_RULES_VERSION } from '../legal/policy'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { testServer } from './test-server'
import { cleanupPresence, notePresence, noteSitePresence } from '../../server/presence'
import { handleCommunity } from '../../server/transport'
import * as push from '../../server/push'

const databases: DatabaseSync[] = [], sent: { to: string[]; text: string }[] = [], password = 'a long original test passphrase'
beforeEach(() => { sent.length = 0; vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => { sent.push(JSON.parse(String(options.body))); return Response.json({ id: crypto.randomUUID() }) })) })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); for (const db of databases.splice(0)) db.close() })

async function fixture() {
  const server = await testServer(); databases.push(server.db)
  async function member(username: string) {
    const email = username + '@example.test'
    expect((await server.call('/auth/register', 'POST', { rulesVersion: COMMUNITY_RULES_VERSION, username, email, password })).status).toBe(202)
    const token = [...sent].reverse().find(message => message.to[0] === email)!.text.match(/#account\/verify\/([^\s]+)/)![1]
    expect((await server.call('/auth/verify', 'POST', { token, password })).status).toBe(200)
    const login = await server.call('/auth/login', 'POST', { email, password })
    return { id: String(server.db.prepare('SELECT id FROM users WHERE username=?').get(username)!.id), session: login.headers.get('X-Octamod-Session')! }
  }
  const online = async () => (await (await server.call('/community/online')).json()) as { online: number; members: { username: string; avatar: string | null }[]; more: number; guests: number }
  const presence = (id: string) => server.db.prepare('SELECT seen_at FROM member_presence WHERE user_id=?').get(id) as { seen_at: number } | undefined
  const daily = () => server.db.prepare('SELECT day,members FROM member_activity_daily WHERE members>0 ORDER BY day').all()
  async function see(id: string, now: number) { await notePresence(server.env.DB!,id,now); await noteSitePresence(server.env.DB!,id,id,now) }
  async function visit(agent: string, session = '', headers: Record<string,string> = {}, body: unknown = {}) {
    return handleCommunity(new Request('https://api.example.test/api/community/online', { method: 'POST', headers: { Origin: 'https://octamod.test', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', 'User-Agent': agent, ...(session ? { Authorization: 'Bearer ' + session } : {}), ...headers }, body: JSON.stringify(body) }),server.env)
  }
  return { ...server, member, online, presence, daily, see, visit }
}

describe('site visitors online', () => {
  it('does not start notification dispatch for a visitor heartbeat',async () => {
    const f = await fixture(), dispatch = vi.spyOn(push,'startPush').mockImplementation(() => {})
    const result = await handleCommunity(new Request('https://api.example.test/api/community/online',{ method: 'POST', headers: { Origin: 'https://octamod.test', 'Content-Type': 'application/json' }, body: '{}' }),f.env,{ waitUntil: vi.fn() })
    expect(result.status).toBe(200)
    expect(dispatch).not.toHaveBeenCalled()
  })
  it('counts signed-out visitors, deduplicates repeated tabs, and replaces the anonymous row on sign-in or sign-out', async () => {
    const f = await fixture(), a = await f.member('alpha')
    expect((await f.visit('browser-a')).status).toBe(200)
    await f.visit('browser-a'); await f.visit('browser-b')
    expect(await f.online()).toEqual({ online: 2, members: [], more: 2, guests: 2 })
    await f.visit('browser-a',a.session)
    expect(await f.online()).toEqual({ online: 2, members: [{ username: 'alpha', avatar: null }], more: 1, guests: 1 })
    // Two devices signed in to the same account count once, with one public name.
    await f.visit('browser-b',a.session)
    expect(await f.online()).toEqual({ online: 1, members: [{ username: 'alpha', avatar: null }], more: 0, guests: 0 })
    await f.visit('browser-a'); await f.visit('browser-b')
    expect(await f.online()).toEqual({ online: 2, members: [], more: 2, guests: 2 })
    const rows = f.db.prepare('SELECT * FROM site_presence').all()
    expect(rows).toHaveLength(2)
    expect(rows.every(row => /^[a-f0-9]{64}$/.test(String(row.visitor_hash)))).toBe(true)
    expect(JSON.stringify(rows)).not.toMatch(/browser-|192\.0\.2|email|session/)
  })

  it('keeps reads read-only, respects browser privacy signals, and refuses cross-origin or identifying check-ins', async () => {
    const f = await fixture()
    await f.online()
    await f.visit('private-browser','',{ DNT: '1' })
    await f.visit('private-browser','',{ 'Sec-GPC': '1' })
    expect(await f.online()).toEqual({ online: 0, members: [], more: 0, guests: 0 })
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM site_presence').get()!.n).toBe(0)
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM rate_limits').get()!.n).toBe(0)
    expect((await f.visit('browser','',{ Origin: 'https://foreign.test' })).status).toBe(403)
    expect((await f.visit('browser','',{}, { userId: 'forged-account' })).status).toBe(400)
    expect((await f.visit('browser','',{}, { ignored: 'x'.repeat(100) })).status).toBe(413)
    await f.visit('browser')
    f.db.prepare('UPDATE rate_limits SET count=600').run()
    expect((await f.visit('browser')).status).toBe(429)
  })

  it('retains bell-only members, including privacy opt-outs and accounts sharing a visitor signature', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026,9,13,12), toFake: ['Date'] })
    const f = await fixture(), a = await f.member('alpha'), b = await f.member('bravo')
    await f.visit('private-browser',a.session,{ DNT: '1' })
    await f.call('/notifications/unread','GET',undefined,a.session)
    expect(await f.online()).toEqual({ online: 1, members: [{ username: 'alpha', avatar: null }], more: 0, guests: 0 })
    await f.call('/notifications/unread','GET',undefined,b.session)
    // A shared connection/browser signature can only hold one site row; account polls retain both people.
    await f.visit('shared-browser',a.session); await f.visit('shared-browser',b.session)
    await f.visit('guest-browser')
    expect(await f.online()).toEqual({ online: 3, members: [{ username: 'alpha', avatar: null }, { username: 'bravo', avatar: null }], more: 1, guests: 1 })
    f.db.prepare('UPDATE users SET show_online=0 WHERE id=?').run(a.id)
    expect(await f.online()).toEqual({ online: 3, members: [{ username: 'bravo', avatar: null }], more: 2, guests: 1 })
    vi.setSystemTime(Date.now() + 301000)
    expect(await f.online()).toEqual({ online: 0, members: [], more: 0, guests: 0 })
  })

  it('does not double count an old bell poll after sign-out, but keeps other signed-in devices', async () => {
    const start = Date.UTC(2026,9,13,12)
    vi.useFakeTimers({ now: start, toFake: ['Date'] })
    const f = await fixture(), a = await f.member('alpha')
    await notePresence(f.env.DB!,a.id,start)
    await noteSitePresence(f.env.DB!,'first-device',a.id,start)
    await noteSitePresence(f.env.DB!,'second-device',a.id,start)
    vi.setSystemTime(start + 1000)
    await noteSitePresence(f.env.DB!,'first-device',null)
    expect(await f.online()).toEqual({ online: 2, members: [{ username: 'alpha', avatar: null }], more: 1, guests: 1 })
    await noteSitePresence(f.env.DB!,'second-device',null)
    expect(await f.online()).toEqual({ online: 2, members: [], more: 2, guests: 2 })
    // Another device's newer bell poll restores the member even without its own site check-in.
    vi.setSystemTime(start + 120000)
    await notePresence(f.env.DB!,a.id)
    expect(await f.online()).toEqual({ online: 3, members: [{ username: 'alpha', avatar: null }], more: 2, guests: 2 })
    vi.setSystemTime(start + 302000)
    expect(await f.online()).toEqual({ online: 1, members: [{ username: 'alpha', avatar: null }], more: 0, guests: 0 })
  })

  it('carries sign-out deduplication through midnight and exports and deletes its short-lived account link', async () => {
    const start = Date.UTC(2026,9,13,23,59,58)
    vi.useFakeTimers({ now: start, toFake: ['Date'] })
    const f = await fixture(), a = await f.member('alpha')
    await notePresence(f.env.DB!,a.id)
    await f.visit('browser',a.session)
    vi.setSystemTime(start + 1000); await f.visit('browser')
    const before = f.db.prepare('SELECT * FROM site_presence').get()!
    expect(before.signed_out_user_id).toBe(a.id)
    vi.setSystemTime(start + 3000); await f.visit('browser')
    const after = f.db.prepare('SELECT * FROM site_presence').get()!
    expect(after.visitor_hash).not.toBe(before.visitor_hash)
    expect(after.signed_out_at).toBe(before.signed_out_at)
    expect(await f.online()).toEqual({ online: 1, members: [], more: 1, guests: 1 })
    const exported = await (await f.call('/auth/data-export','POST',{ password },a.session)).json()
    expect(exported.data.sitePresence).toEqual([{ seen_at: new Date(Date.now()).toISOString().replace('.000','') }])
    expect((await f.call('/auth/account','DELETE',{ confirm: 'DELETE', password },a.session)).status).toBe(200)
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM site_presence').get()!.n).toBe(0)
  })

  it('expires inactive visitors, throttles timestamp writes and rotates digests at midnight without double counting', async () => {
    const f = await fixture(), start = Date.UTC(2026,9,13,23,59)
    vi.useFakeTimers({ now: start, toFake: ['Date'] })
    await f.visit('browser')
    const first = f.db.prepare('SELECT * FROM site_presence').get()!
    vi.setSystemTime(start + 30000); await f.visit('browser')
    expect(f.db.prepare('SELECT seen_at FROM site_presence').get()!.seen_at).toBe(start / 1000)
    vi.setSystemTime(start + 60000); await f.visit('browser')
    const rows = f.db.prepare('SELECT * FROM site_presence').all()
    expect(rows).toHaveLength(1)
    expect(rows[0].visitor_hash).not.toBe(first.visitor_hash)
    expect((await f.online()).online).toBe(1)
    vi.setSystemTime(start + 361000)
    expect(await f.online()).toEqual({ online: 0, members: [], more: 0, guests: 0 })
    await cleanupPresence(f.env.DB!)
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM site_presence').get()!.n).toBe(0)
  })

  it('combines bell-only members with site check-ins, naming eligible members without exposing account details', async () => {
    vi.useFakeTimers({now:Date.UTC(2026,9,13,12),toFake:['Date']})
    const f = await fixture(), a = await f.member('alpha'), b = await f.member('bravo')
    // Signing in alone does not register presence. Older tabs and privacy opt-outs still use the bell.
    expect(await f.online()).toEqual({ online: 0, members: [], more: 0, guests: 0 })
    expect((await f.call('/notifications/unread', 'GET', undefined, a.session)).status).toBe(200)
    expect((await f.call('/notifications/unread', 'GET', undefined, b.session)).status).toBe(200)
    expect(await f.online()).toEqual({ online: 2, members: [{ username: 'alpha', avatar: null }, { username: 'bravo', avatar: null }], more: 0, guests: 0 })
    await f.visit('browser-a', a.session); await f.visit('browser-b', b.session)
    const result = await f.call('/community/online')
    expect(result.status).toBe(200)
    const body = await result.json()
    // Seen in the same second, names are listed alphabetically.
    expect(body).toEqual({ online: 2, members: [{ username: 'alpha', avatar: null }, { username: 'bravo', avatar: null }], more: 0, guests: 0 })
    expect(JSON.stringify(body)).not.toMatch(/@|email|user_id|seen_at|password|token/)
    // The notification bell remains member-only. Ineligible accounts still browse but never appear by name.
    expect((await f.call('/notifications/unread')).status).toBe(401)
    f.db.prepare('UPDATE users SET suspended=1 WHERE id=?').run(b.id)
    expect(await f.online()).toEqual({ online: 2, members: [{ username: 'alpha', avatar: null }], more: 1, guests: 0 })
    // Accounts still signing up contribute to the total but are not named.
    f.db.prepare('UPDATE users SET suspended=0 WHERE id=?').run(b.id)
    f.db.prepare("INSERT INTO social_pending_accounts(user_id,expires) VALUES(?,?)").run(b.id, Math.floor(Date.now() / 1000) + 600)
    expect(await f.online()).toEqual({ online: 2, members: [{ username: 'alpha', avatar: null }], more: 1, guests: 0 })
    f.db.prepare('DELETE FROM social_pending_accounts WHERE user_id=?').run(b.id)
    f.db.prepare('UPDATE users SET email_verified=0 WHERE id=?').run(b.id)
    expect(await f.online()).toEqual({ online: 2, members: [{ username: 'alpha', avatar: null }], more: 1, guests: 0 })
  })

  it('lets a member leave the online list through their profile settings while staying in the count', async () => {
    const f = await fixture(), a = await f.member('alpha'), b = await f.member('bravo'), now = Date.now()
    await f.see(a.id, now); await f.see(b.id, now)
    const profile = await (await f.call('/auth/profile', 'GET', undefined, b.session)).json()
    expect(profile.showOnline).toBe(true)
    expect((await f.call('/auth/profile', 'PATCH', { username: 'bravo', displayName: 'Bravo', bio: '', showOnline: 'no' }, b.session)).status).toBe(400)
    expect((await f.call('/auth/profile', 'PATCH', { username: 'bravo', displayName: 'Bravo', bio: '', showOnline: false }, b.session)).status).toBe(200)
    expect((await (await f.call('/auth/profile', 'GET', undefined, b.session)).json()).showOnline).toBe(false)
    expect(await f.online()).toEqual({ online: 2, members: [{ username: 'alpha', avatar: null }], more: 1, guests: 0 })
    // Saving the profile without the field keeps the choice, and the data export lists it.
    expect((await f.call('/auth/profile', 'PATCH', { username: 'bravo', displayName: 'Bravo again', bio: '' }, b.session)).status).toBe(200)
    expect((await (await f.call('/auth/profile', 'GET', undefined, b.session)).json()).showOnline).toBe(false)
    expect((await (await f.call('/auth/data-export', 'POST', { password }, b.session)).json()).data.onlineList).toEqual([{ shown: 0 }])
    expect((await f.call('/auth/profile', 'PATCH', { username: 'bravo', displayName: 'Bravo', bio: '', showOnline: true }, b.session)).status).toBe(200)
    expect((await f.online()).members.map(member => member.username)).toEqual(['alpha', 'bravo'])
  })

  it('lists at most twelve eligible members, most recently seen first, and keeps the rest in the total', async () => {
    const f = await fixture(), now = Math.floor(Date.now() / 1000), seen = f.db.prepare('INSERT INTO site_presence(visitor_hash,user_id,seen_at) VALUES(?,?,?)')
    const add = f.db.prepare('INSERT INTO users(id,display_name,username,email_verified) VALUES(?,?,?,1)')
    for (let index = 0; index < 14; index++) { const name = 'member' + String(index).padStart(2, '0'); add.run(name, name, name); seen.run(name, name, now - index) }
    // Newer hidden/ineligible accounts must not consume public-name slots.
    for (const name of ['hidden','suspended']) { add.run(name,name,name); seen.run(name,name,now + 1) }
    f.db.prepare("UPDATE users SET show_online=0 WHERE id='hidden'").run()
    f.db.prepare("UPDATE users SET suspended=1 WHERE id='suspended'").run()
    const body = await f.online()
    expect(body.online).toBe(16)
    expect(body.more).toBe(4)
    expect(body.guests).toBe(0)
    expect(body.members.map(member => member.username)).toEqual(Array.from({ length: 12 }, (_, index) => 'member' + String(index).padStart(2, '0')))
  })

  it('keeps one overwritten time per member, written at most every two minutes, and counts each member once a day', async () => {
    const f = await fixture(), a = await f.member('alpha'), start = Date.UTC(2026, 9, 7, 23, 57)
    await f.see(a.id, start)
    await f.see(a.id, start + 60000)
    expect(f.presence(a.id)!.seen_at).toBe(start / 1000)
    await f.see(a.id, start + 120000)
    expect(f.presence(a.id)!.seen_at).toBe(start / 1000 + 120)
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM member_presence').get()!.n).toBe(1)
    expect(f.daily()).toEqual([{ day: '2026-10-07', members: 1 }])
    // The first poll after midnight counts the new day even within two minutes of the last write, and only once.
    await f.see(a.id, start + 180000)
    await f.see(a.id, start + 240000)
    expect(f.daily()).toEqual([{ day: '2026-10-07', members: 1 }, { day: '2026-10-08', members: 1 }])
    // Historical member activity includes the first poll of the new UTC day; site timestamps remain separately throttled.
    expect(f.presence(a.id)!.seen_at).toBe(start / 1000 + 180)
    const siteSeen = Number(f.db.prepare('SELECT seen_at FROM site_presence').get()!.seen_at) * 1000
    vi.useFakeTimers({ now: siteSeen + 299000, toFake: ['Date'] })
    expect((await f.online()).online).toBe(1)
    vi.setSystemTime(siteSeen + 301000)
    expect(await f.online()).toEqual({ online: 0, members: [], more: 0, guests: 0 })
  })

  it('removes last-seen times after 31 days and with the account, and includes them in the data export', async () => {
    const f = await fixture(), a = await f.member('alpha'), b = await f.member('bravo'), now = Date.now()
    await f.see(a.id, now)
    await f.see(b.id, now - 32 * 86400000)
    await cleanupPresence(f.env.DB!, now)
    expect(f.presence(b.id)).toBeUndefined()
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM site_presence').get()!.n).toBe(1)
    expect(f.presence(a.id)).toBeDefined()
    expect(f.daily().length).toBeGreaterThan(0)
    const exported = await (await f.call('/auth/data-export', 'POST', { password }, a.session)).json()
    expect(exported.data.sitePresence).toEqual([{ seen_at: new Date(Math.floor(now / 1000) * 1000).toISOString().replace('.000', '') }])
    expect(exported.data.lastSeen).toEqual([{ seen_at: new Date(Math.floor(now / 1000) * 1000).toISOString().replace('.000', '') }])
    expect((await f.call('/auth/account', 'DELETE', { confirm: 'DELETE', password }, a.session)).status).toBe(200)
    expect(f.presence(a.id)).toBeUndefined()
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM site_presence').get()!.n).toBe(0)
  })

  it('reports online and active members to administrators as counts', async () => {
    const f = await fixture(), a = await f.member('alpha'), b = await f.member('bravo'), c = await f.member('charlie'), now = Date.now()
    await f.see(a.id, now)
    const seen = f.db.prepare('INSERT INTO member_presence(user_id,seen_at) VALUES(?,?)')
    seen.run(b.id, Math.floor(now / 1000) - 3 * 86400); seen.run(c.id, Math.floor(now / 1000) - 20 * 86400)
    f.db.prepare("UPDATE users SET is_admin=1 WHERE username='alpha'").run()
    const data = await (await f.call('/admin/accounts?days=7', 'GET', undefined, a.session)).json()
    expect(data.totals).toMatchObject({ online: 1, activeDay: 1, activeWeek: 2, activeMonth: 3 })
    const today = new Date(now).toISOString().slice(0, 10)
    expect(data.activeFrom).toBe(today)
    expect(data.daily.at(-1)).toMatchObject({ day: today, active: 1 })
    // Days before counting began are unknown, not zero.
    expect(data.daily[0].active).toBeNull()
    expect(JSON.stringify(data)).not.toMatch(/alpha|bravo|charlie|@/)
  })
})
