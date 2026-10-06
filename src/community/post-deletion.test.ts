import { afterEach, describe, expect, it } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { testServer } from './test-server'
import { digest } from '../../server/security'

const databases: DatabaseSync[] = []
afterEach(() => { for (const db of databases.splice(0)) db.close() })

async function fixture() {
  const server = await testServer(); databases.push(server.db)
  async function member(name: string) {
    const token = name.charCodeAt(0).toString(16).repeat(32)
    server.db.prepare("INSERT INTO users(id,display_name,username,email_verified) VALUES(?,?,?,1)").run('user-' + name, name, name)
    server.db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(await digest(token), 'user-' + name, Math.floor(Date.now() / 1000) + 600)
    return token
  }
  const admin = async () => (await (await server.call('/auth/admin', 'POST', { key: 'e'.repeat(64) })).json()).token as string
  // A member thread: the opening post by the author and one reply each from the author and a second member.
  async function discussion() {
    const author = await member('author'), other = await member('other')
    const { id } = await (await server.call('/forum/threads', 'POST', { title: 'Delete tests', body: 'Opening post', category: 'general' }, author)).json()
    const reply = async (body: string, token: string) => (await (await server.call('/forum/threads/' + id + '/replies', 'POST', { body }, token)).json()).id as string
    const first = (await (await server.call('/forum/threads/' + id)).json()).posts[0].id as string
    return { author, other, id, first, reply }
  }
  const posts = async (id: string, token = '', admin = '') => (await (await server.call('/forum/threads/' + id, 'GET', undefined, token, admin)).json()).posts as { id: string; body: string; canEdit: boolean }[]
  return { ...server, member, admin, discussion, posts }
}

describe('deleting posts', () => {
  it('lets authors delete their own replies and nobody else’s, and erases the text', async () => {
    const f = await fixture(), { author, other, id, reply } = await f.discussion()
    const mine = await reply('A reply to delete', other), theirs = await reply('Someone else’s reply', author)
    expect((await f.call('/forum/posts/' + theirs, 'DELETE', {}, other)).status).toBe(403)
    expect((await f.call('/forum/posts/' + mine, 'DELETE', {})).status).toBe(401)
    expect((await f.call('/forum/posts/' + mine, 'DELETE', {}, other)).status).toBe(200)
    for (const viewer of ['', author, other]) expect((await f.posts(id, viewer)).map(post => post.body)).toEqual(['Opening post', 'Someone else’s reply'])
    expect(f.db.prepare('SELECT body,hidden FROM forum_posts WHERE id=?').get(mine)).toEqual({ body: '', hidden: 2 })
    // It is gone for good: no second delete, edit, like or report.
    expect((await f.call('/forum/posts/' + mine, 'DELETE', {}, other)).status).toBe(404)
    expect((await f.call('/forum/posts/' + mine, 'PATCH', { body: 'Back again' }, other)).status).toBe(404)
    expect((await f.call('/forum/posts/' + mine + '/react', 'POST', { liked: true }, author)).status).toBe(404)
    expect((await (await f.call('/forum/threads?q=delete')).json()).threads[0].replies).toBe(1)
  })

  it('keeps the first post, and blocks deleting in a locked thread', async () => {
    const f = await fixture(), { author, other, id, first, reply } = await f.discussion(), admin = await f.admin()
    const mine = await reply('My reply', other)
    expect((await f.call('/forum/posts/' + first, 'DELETE', {}, author)).status).toBe(409)
    expect((await f.call('/admin/forum/posts/' + first, 'PATCH', { action: 'deleted', value: true, reason: 'Spam' }, '', admin)).status).toBe(409)
    expect((await f.posts(id))[0].body).toBe('Opening post')
    expect((await f.call('/admin/forum/threads/' + id, 'PATCH', { action: 'locked', value: true, reason: 'Done' }, '', admin)).status).toBe(200)
    expect((await f.call('/forum/posts/' + mine, 'DELETE', {}, other)).status).toBe(409)
    expect(f.db.prepare('SELECT hidden FROM forum_posts WHERE id=?').get(mine)).toEqual({ hidden: 0 })
  })

  it('offers Delete only on replies the member may delete', async () => {
    const f = await fixture(), { author, other, id, reply } = await f.discussion()
    await reply('Other’s reply', other)
    expect((await f.posts(id, other)).map(post => post.canEdit)).toEqual([false, true])
    expect((await f.posts(id, author)).map(post => post.canEdit)).toEqual([true, false])
  })

  it('removes the files and closes the reports of a deleted post', async () => {
    const f = await fixture(), { author, other, reply } = await f.discussion()
    const mine = await reply('With a file', other)
    f.db.prepare("INSERT INTO forum_media(id,user_id,post_id,kind,mime,bytes,object_key) VALUES('file-1','user-other',?,'image','image/png',64,'forum/file-1')").run(mine)
    expect((await f.call('/forum/posts/' + mine + '/report', 'POST', { reason: 'Off topic' }, author)).status).toBe(200)
    expect((await f.call('/forum/posts/' + mine, 'DELETE', {}, other)).status).toBe(200)
    expect(f.db.prepare("SELECT removed FROM forum_media WHERE id='file-1'").get()).toEqual({ removed: 1 })
    expect(f.db.prepare('SELECT resolved FROM forum_reports WHERE post_id=?').get(mine)).toEqual({ resolved: 1 })
  })

  it('lets the administrator delete any reply with a recorded reason, and a deleted post cannot be restored', async () => {
    const f = await fixture(), { author, other, id, reply } = await f.discussion(), admin = await f.admin()
    const spam = await reply('Buy things', other)
    expect((await f.call('/admin/forum/posts/' + spam, 'PATCH', { action: 'deleted', value: true, reason: 'Spam' }, other)).status).toBe(403)
    expect((await f.call('/admin/forum/posts/' + spam, 'PATCH', { action: 'deleted', value: true }, '', admin)).status).toBe(400)
    expect((await f.call('/admin/forum/posts/' + spam, 'PATCH', { action: 'deleted', value: true, reason: 'Spam' }, '', admin)).status).toBe(200)
    expect((await f.posts(id, '', admin)).map(post => post.body)).toEqual(['Opening post'])
    expect((await f.call('/admin/forum/posts/' + spam, 'PATCH', { action: 'hidden', value: false, reason: 'Oops' }, '', admin)).status).toBe(404)
    expect((await f.call('/admin/forum/posts/' + spam, 'PATCH', { action: 'deleted', value: true, reason: 'Again' }, '', admin)).status).toBe(404)
    expect(f.db.prepare('SELECT hidden FROM forum_posts WHERE id=?').get(spam)).toEqual({ hidden: 2 })
    const history = await (await f.call('/admin/forum/history', 'GET', undefined, '', admin)).json()
    expect(history.filter((entry: { target: string }) => entry.target === spam).map((entry: { action: string; reason: string }) => [entry.action, entry.reason])).toEqual([['deleted:1', 'Spam']])
    // Hiding stays available and reversible for the other replies.
    const kept = await reply('Fine', author)
    expect((await f.call('/admin/forum/posts/' + kept, 'PATCH', { action: 'hidden', value: true, reason: 'Review' }, '', admin)).status).toBe(200)
    expect((await f.call('/admin/forum/posts/' + kept, 'PATCH', { action: 'hidden', value: false, reason: 'Fine' }, '', admin)).status).toBe(200)
  })

  it('works in module discussions, and the automatic opening post stays', async () => {
    const f = await fixture(), member = await f.member('reader'), admin = await f.admin()
    await f.call('/forum/threads')
    const posted = await f.call('/forum/threads/module-miniverb/replies', 'POST', { body: 'My Mini Verb settings' }, member)
    expect(posted.status).toBe(201)
    const detail = (await f.posts('module-miniverb', member))
    expect(detail.map(post => post.canEdit)).toEqual([false, true])
    expect((await f.call('/forum/posts/' + detail[0].id, 'DELETE', {}, member)).status).toBe(403)
    expect((await f.call('/admin/forum/posts/' + detail[0].id, 'PATCH', { action: 'deleted', value: true, reason: 'Test' }, '', admin)).status).toBe(409)
    expect((await f.call('/forum/posts/' + detail[1].id, 'DELETE', {}, member)).status).toBe(200)
    expect((await f.posts('module-miniverb', member)).map(post => post.id)).toEqual([detail[0].id])
  })
})
