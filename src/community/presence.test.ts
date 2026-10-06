import { COMMUNITY_RULES_VERSION } from '../legal/policy'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { testServer } from './test-server'
import { cleanupPresence, notePresence } from '../../server/presence'

const databases: DatabaseSync[] = [], sent: { to: string[]; text: string }[] = [], password = 'a long original test passphrase'
beforeEach(() => { sent.length = 0; vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => { sent.push(JSON.parse(String(options.body))); return Response.json({ id: crypto.randomUUID() }) })) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); for (const db of databases.splice(0)) db.close() })

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
  const online = async () => (await (await server.call('/community/online')).json()) as { online: number }
  const presence = (id: string) => server.db.prepare('SELECT seen_at FROM member_presence WHERE user_id=?').get(id) as { seen_at: number } | undefined
  const daily = () => server.db.prepare('SELECT day,members FROM member_activity_daily WHERE members>0 ORDER BY day').all()
  return { ...server, member, online, presence, daily }
}

describe('members online', () => {
  it('counts members whose bell polls, publicly as a number only', async () => {
    const f = await fixture(), a = await f.member('alpha'), b = await f.member('bravo')
    // Signing in alone is not presence; only the visible tab's bell poll is.
    expect(await f.online()).toEqual({ online: 0 })
    expect((await f.call('/notifications/unread', 'GET', undefined, a.session)).status).toBe(200)
    expect((await f.call('/notifications/unread', 'GET', undefined, b.session)).status).toBe(200)
    const result = await f.call('/community/online')
    expect(result.status).toBe(200)
    const body = await result.json()
    expect(body).toEqual({ online: 2 })
    expect(JSON.stringify(body)).not.toMatch(/alpha|bravo|@/)
    // Guests cannot create presence, and suspension removes a member from the count at once.
    expect((await f.call('/notifications/unread')).status).toBe(401)
    f.db.prepare('UPDATE users SET suspended=1 WHERE id=?').run(b.id)
    expect(await f.online()).toEqual({ online: 1 })
  })

  it('keeps one overwritten time per member, written at most every two minutes, and counts each member once a day', async () => {
    const f = await fixture(), a = await f.member('alpha'), start = Date.UTC(2026, 9, 7, 23, 57)
    await notePresence(f.env.DB!, a.id, start)
    await notePresence(f.env.DB!, a.id, start + 60000)
    expect(f.presence(a.id)!.seen_at).toBe(start / 1000)
    await notePresence(f.env.DB!, a.id, start + 120000)
    expect(f.presence(a.id)!.seen_at).toBe(start / 1000 + 120)
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM member_presence').get()!.n).toBe(1)
    expect(f.daily()).toEqual([{ day: '2026-10-07', members: 1 }])
    // The first poll after midnight counts the new day even within two minutes of the last write, and only once.
    await notePresence(f.env.DB!, a.id, start + 180000)
    await notePresence(f.env.DB!, a.id, start + 240000)
    expect(f.daily()).toEqual([{ day: '2026-10-07', members: 1 }, { day: '2026-10-08', members: 1 }])
    // Online means seen within five minutes of the last write, which was the midnight poll.
    expect(f.presence(a.id)!.seen_at).toBe(start / 1000 + 180)
    vi.useFakeTimers({ now: start + 180000 + 299000, toFake: ['Date'] })
    expect(await f.online()).toEqual({ online: 1 })
    vi.setSystemTime(start + 180000 + 301000)
    expect(await f.online()).toEqual({ online: 0 })
  })

  it('removes last-seen times after 31 days and with the account, and includes them in the data export', async () => {
    const f = await fixture(), a = await f.member('alpha'), b = await f.member('bravo'), now = Date.now()
    await notePresence(f.env.DB!, a.id, now)
    await notePresence(f.env.DB!, b.id, now - 32 * 86400000)
    await cleanupPresence(f.env.DB!, now)
    expect(f.presence(b.id)).toBeUndefined()
    expect(f.presence(a.id)).toBeDefined()
    expect(f.daily().length).toBeGreaterThan(0)
    const exported = await (await f.call('/auth/data-export', 'POST', { password }, a.session)).json()
    expect(exported.data.lastSeen).toEqual([{ seen_at: new Date(Math.floor(now / 1000) * 1000).toISOString().replace('.000', '') }])
    expect((await f.call('/auth/account', 'DELETE', { confirm: 'DELETE', password }, a.session)).status).toBe(200)
    expect(f.presence(a.id)).toBeUndefined()
  })

  it('reports online and active members to administrators as counts', async () => {
    const f = await fixture(), a = await f.member('alpha'), b = await f.member('bravo'), c = await f.member('charlie'), now = Date.now()
    await notePresence(f.env.DB!, a.id, now)
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
