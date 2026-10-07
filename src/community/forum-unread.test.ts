import { COMMUNITY_RULES_VERSION } from '../legal/policy'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { testServer } from './test-server'
import { noteForumVisit } from '../../server/forum-unread'
import type { ForumThread, ForumVisit, ThreadDetail } from './forum-contract'

const databases: DatabaseSync[] = [], sent: { to: string[]; text: string }[] = [], password = 'a long original test passphrase'
beforeEach(() => { sent.length = 0; vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => { sent.push(JSON.parse(String(options.body))); return Response.json({ id: crypto.randomUUID() }) })) })
afterEach(() => { vi.unstubAllGlobals(); for (const db of databases.splice(0)) db.close() })

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
  async function thread(session: string, title: string) {
    const result = await server.call('/forum/threads', 'POST', { title, body: 'Opening post of ' + title, category: 'general' }, session)
    expect(result.status).toBe(201)
    return (await result.json()).id as string
  }
  async function reply(session: string, threadId: string, body: string) {
    const result = await server.call('/forum/threads/' + threadId + '/replies', 'POST', { body }, session)
    expect(result.status).toBe(201)
    return (await result.json()).id as string
  }
  const list = async (session = '', query = '') => (await (await server.call('/forum/threads' + query, 'GET', undefined, session)).json()).threads as ForumThread[]
  const view = async (session: string, threadId: string, page = 0) => (await (await server.call('/forum/threads/' + threadId + '?page=' + page, 'GET', undefined, session)).json()) as ThreadDetail
  const marker = (memberId: string, threadId: string) => server.db.prepare('SELECT last_read_post_id FROM forum_thread_reads WHERE member_id=? AND thread_id=?').get(memberId, threadId) as { last_read_post_id: string } | undefined
  return { ...server, member, thread, reply, list, view, marker }
}
const state = (threads: ForumThread[], id: string) => { const row = threads.find(thread => thread.id === id)!; return { unread: !!row.unread, newReplies: row.new_replies } }

describe('forum unread tracking', () => {
  it('records the last post a member saw and flags threads with replies after it', async () => {
    const f = await fixture(), a = await f.member('alpha'), b = await f.member('bravo'), t = await f.thread(a.session, 'First thread')
    // Anonymous readers get the list as before, without read state.
    expect(Object.keys((await f.list())[0])).not.toContain('unread')
    expect(state(await f.list(b.session), t)).toEqual({ unread: true, newReplies: 0 })
    // The author has seen their own thread, and their own posts never count as new.
    expect(state(await f.list(a.session), t)).toEqual({ unread: false, newReplies: 0 })
    // Opening the thread records the newest post on the page; anonymous views record nothing.
    expect((await f.view('', t)).firstUnread).toBeUndefined()
    expect(f.marker(b.id, t)).toBeUndefined()
    const opened = await f.view(b.session, t)
    expect(opened.firstUnread).toBeNull()
    expect(f.marker(b.id, t)).toEqual({ last_read_post_id: opened.posts[0].id })
    expect(state(await f.list(b.session), t)).toEqual({ unread: false, newReplies: 0 })
    const r1 = await f.reply(a.session, t, 'Reply one'), r2 = await f.reply(a.session, t, 'Reply two')
    expect(state(await f.list(b.session), t)).toEqual({ unread: true, newReplies: 2 })
    // "Jump to first unread" names the first reply after the marker, and this view then reads both.
    const again = await f.view(b.session, t)
    expect(again.firstUnread).toEqual({ id: r1, page: 0 })
    expect(f.marker(b.id, t)).toEqual({ last_read_post_id: r2 })
    expect(state(await f.list(b.session), t)).toEqual({ unread: false, newReplies: 0 })
    // A hidden reply is not new, and bravo's own reply does not make the thread unread for bravo.
    const r3 = await f.reply(a.session, t, 'Reply three')
    f.db.prepare('UPDATE forum_posts SET hidden=1 WHERE id=?').run(r3)
    await f.reply(b.session, t, 'Bravo replies')
    expect(state(await f.list(b.session), t)).toEqual({ unread: false, newReplies: 0 })
    expect(state(await f.list(a.session), t)).toEqual({ unread: true, newReplies: 1 })
    // Read markers leave with the account and appear in the data export.
    const exported = await (await f.call('/auth/data-export', 'POST', { password }, b.session)).json()
    expect(exported.data.threadReads).toEqual([{ thread_id: t, last_read_at: expect.any(String), last_read_post_id: r2 }])
    expect((await f.call('/auth/account', 'DELETE', { confirm: 'DELETE', password }, b.session)).status).toBe(200)
    expect(f.marker(b.id, t)).toBeUndefined()
  })

  it('does not drown a new member in everything posted before they joined', async () => {
    const f = await fixture(), a = await f.member('alpha'), old = await f.thread(a.session, 'Old thread')
    await f.reply(a.session, old, 'Old reply')
    f.db.prepare("UPDATE forum_threads SET created_at=datetime('now','-1 day'),updated_at=datetime('now','-1 day')").run()
    f.db.prepare("UPDATE forum_posts SET created_at=datetime('now','-1 day')").run()
    const c = await f.member('charlie')
    expect(state(await f.list(c.session), old)).toEqual({ unread: false, newReplies: 0 })
    expect((await f.view(c.session, old)).firstUnread).toBeNull()
    // Activity after joining counts, in old threads too.
    await f.reply(a.session, old, 'Fresh reply')
    const fresh = await f.thread(a.session, 'Fresh thread')
    expect(state(await f.list(c.session), old)).toEqual({ unread: true, newReplies: 1 })
    expect(state(await f.list(c.session), fresh)).toEqual({ unread: true, newReplies: 0 })
  })

  it('keeps the marker right across pages and never moves it backwards', async () => {
    const f = await fixture(), a = await f.member('alpha'), b = await f.member('bravo'), t = await f.thread(a.session, 'Long thread')
    const replies: string[] = []
    for (let index = 1; index <= 34; index++) replies.push(await f.reply(a.session, t, 'Reply ' + index))
    expect(state(await f.list(b.session), t)).toEqual({ unread: true, newReplies: 34 })
    const first = await f.view(b.session, t, 0)
    expect(first.firstUnread).toEqual({ id: replies[0], page: 0 })
    expect(first.hasMore).toBe(true)
    // Page 0 holds the opening post and 29 replies; five replies remain unread on page 1.
    expect(f.marker(b.id, t)).toEqual({ last_read_post_id: replies[28] })
    expect(state(await f.list(b.session), t)).toEqual({ unread: true, newReplies: 5 })
    const second = await f.view(b.session, t, 1)
    expect(second.firstUnread).toEqual({ id: replies[29], page: 1 })
    expect(second.posts.map(post => post.id)).toEqual(replies.slice(29))
    expect(f.marker(b.id, t)).toEqual({ last_read_post_id: replies[33] })
    expect(state(await f.list(b.session), t)).toEqual({ unread: false, newReplies: 0 })
    await f.view(b.session, t, 0)
    expect(f.marker(b.id, t)).toEqual({ last_read_post_id: replies[33] })
    expect(state(await f.list(b.session), t)).toEqual({ unread: false, newReplies: 0 })
  })

  it('filters a list to unread threads, reports what happened since the last visit and marks everything read at once', async () => {
    const f = await fixture(), a = await f.member('alpha'), b = await f.member('bravo')
    const followed = await f.thread(a.session, 'Followed thread'), other = await f.thread(a.session, 'Other thread')
    expect((await f.call('/forum/threads/' + followed + '/follow', 'POST', { enabled: true }, b.session)).status).toBe(200)
    await f.reply(a.session, followed, 'Reply in followed'); await f.reply(a.session, followed, 'Another in followed'); await f.reply(a.session, other, 'Reply elsewhere')
    expect((await f.call('/forum/threads?unread=1')).status).toBe(401)
    expect((await f.list(b.session, '?following=1&unread=1')).map(thread => thread.id)).toEqual([followed])
    expect((await f.list(b.session, '?unread=1')).map(thread => thread.id).sort()).toEqual([followed, other].sort())
    // The first visit has nothing to compare with; a load 30 minutes after the last one starts a new visit.
    const start = Date.UTC(2026, 0, 1, 12, 0)
    expect(await noteForumVisit(f.env.DB!, b.id, start)).toEqual({ since: null, newThreads: 0, newReplies: 0, unreadFollowed: 1 })
    expect((await noteForumVisit(f.env.DB!, b.id, start + 10 * 60000)).since).toBeNull()
    const visit = await noteForumVisit(f.env.DB!, b.id, start + 45 * 60000)
    expect(visit.since).toBe('2026-01-01 12:10:00')
    // The seeded times lie in the past, so everything the other member posted is "since" that visit.
    expect(visit).toMatchObject({ newThreads: 2, newReplies: 2, unreadFollowed: 1 })
    expect(await noteForumVisit(f.env.DB!, b.id, start + 46 * 60000)).toEqual(visit)
    // The route reads the clock; the 12:46 load was within two minutes of 12:45 and wrote nothing, so that visit ended at 12:45.
    const route = await (await f.call('/forum/visit', 'GET', undefined, b.session)).json() as ForumVisit
    expect(route.since).toBe('2026-01-01 12:45:00')
    expect((await f.call('/forum/visit')).status).toBe(401)
    // Mark all as read: nothing posted so far is unread, the "since" block starts over, and later replies count again.
    f.db.prepare("UPDATE forum_posts SET created_at=datetime('now','-1 minute')").run(); f.db.prepare("UPDATE forum_threads SET created_at=datetime('now','-1 minute')").run()
    expect((await f.call('/forum/read-all', 'POST', {}, b.session)).status).toBe(200)
    expect((await f.list(b.session, '?unread=1'))).toEqual([])
    expect(state(await f.list(b.session), followed)).toEqual({ unread: false, newReplies: 0 })
    expect(await (await f.call('/forum/visit', 'GET', undefined, b.session)).json()).toMatchObject({ newThreads: 0, newReplies: 0, unreadFollowed: 0 })
    await f.reply(a.session, followed, 'After the reset')
    expect(state(await f.list(b.session), followed)).toEqual({ unread: true, newReplies: 1 })
    expect((await f.list(b.session, '?following=1&unread=1')).map(thread => thread.id)).toEqual([followed])
  })
})
