import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { handleApi } from '../../server/api'
import { signGithubPayload } from '../../server/github'
import { digest } from '../../server/security'
import { testServer } from './test-server'
import { communityModule } from './modules'
import { moduleChangelogs } from './module-changelogs'
import { GithubReplyForm } from './GithubIssueReplies'
import { CommunityContext, emptySession } from './context'
import { DeveloperPage } from './DeveloperPage'
import { BugReportSuccess, ExistingIssues } from './BugReportNotice'

const databases: DatabaseSync[] = []
afterEach(() => { vi.unstubAllGlobals(); for (const db of databases.splice(0)) db.close() })
async function fixture(moduleId = 'sidechain-compressor') {
  const f = await testServer(); databases.push(f.db)
  Object.assign(f.env, { GITHUB_TOKEN: 'private-test-token', GITHUB_REPOSITORY: 'repeat98/modwerk', GITHUB_WEBHOOK_SECRET: 'test-webhook-secret' })
  const module = communityModule(moduleId)!, session = 'a'.repeat(64)
  f.db.prepare("INSERT INTO users(id,display_name,username,email_verified) VALUES('listener','Listener','listener',1)").run()
  f.db.prepare("INSERT INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES('listener','Listener','listener@example.test',1,0,0)").run()
  f.db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(await digest(session), 'listener', Math.floor(Date.now() / 1000) + 3600)
  f.db.prepare("INSERT INTO issues(id,module_id,author_login,reporter_id,title,body,public_json,github_number,github_url,maintainer_sharing) VALUES('report',?,?,'listener','Public title','PRIVATE CONFIGURATION','{}',321,'https://github.com/repeat98/modwerk/issues/321',1)").run(module.id, module.author)
  const comments: { id: number; body: string }[] = [], writes: { method: string; body: Record<string, unknown> }[] = []
  let live = true, failPatch = false, dropPost = false
  vi.stubGlobal('fetch', vi.fn(async (value: string | URL, init: RequestInit = {}) => {
    const url = String(value), method = init.method ?? 'GET', body = init.body ? JSON.parse(String(init.body)) : undefined
    if (url === f.env.APP_URL + 'module-releases.json') return Response.json({ format: 'modwerk-module-releases-v1', modules: [{ id: module.id, name: module.name, version: live ? module.version : '0.0.0', href: module.href, ...(live ? { notes: moduleChangelogs[module.id].find(entry => entry.version === module.version) } : {}) }] })
    if (method === 'GET') return Response.json(comments)
    writes.push({ method, body })
    if (method === 'POST') {
      comments.push({ id: comments.length + 1, body: body.body })
      if (dropPost) { dropPost = false; throw new Error('Response lost after GitHub saved the reply') }
    }
    if (method === 'PATCH' && failPatch) return new Response('{}', { status: 503 })
    return Response.json({ id: comments.length, state: body?.state })
  }))
  const identity = moduleId === 'sidechain-compressor' ? { id: 273702472, login: 'Zac-Kyoti', type: 'User' } : { id: 67785539, login: 'repeat98', type: 'User' }
  function payload(body: string, commentId = 1) { return { action: 'created', repository: { full_name: 'repeat98/modwerk' }, issue: { number: 321 }, comment: { id: commentId, body, user: identity }, sender: identity } }
  async function hook(data: unknown, delivery = crypto.randomUUID(), signature?: string) {
    const body = new TextEncoder().encode(JSON.stringify(data)).buffer
    return handleApi(new Request('https://api.example.test/api/github/webhook', { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'issue_comment', 'X-GitHub-Delivery': delivery, 'X-Hub-Signature-256': signature ?? await signGithubPayload('test-webhook-secret', body) } }), f.env)
  }
  const reply = { body: 'Thanks! **It works**. @repeat98 #12 <script>no</script>', requestId: '11111111-1111-4111-8111-111111111111' }
  const send = (body = reply, path = '/modules/' + module.id + '/issues/report/replies', token = session) => f.call(path, 'POST', body, token)
  return { ...f, module, session, reply, send, payload, hook, comments, writes, offline: () => { live = false }, failPatch: (value: boolean) => { failPatch = value }, dropPost: () => { dropPost = true } }
}

describe('frontend public replies into GitHub', () => {
  it('posts an attributed public reply for a verified Modwerk member without a GitHub account, and retries only once', async () => {
    const f = await fixture()
    expect((await f.send()).status).toBe(201)
    expect((await f.send()).status).toBe(201)
    expect(f.comments).toHaveLength(1)
    expect(f.comments[0].body).toContain('[listener on Modwerk](https://octamod.test/forum/profile/listener/)')
    expect(f.comments[0].body).toContain('> Thanks! **It works**.')
    expect(f.comments[0].body).not.toMatch(/PRIVATE CONFIGURATION|private-test-token|<script>|@repeat98|#12/)
    expect(f.db.prepare('SELECT completed FROM github_actions').get()!.completed).toBe(1)
    await f.hook(f.payload(f.comments[0].body, 99))
    expect(f.db.prepare('SELECT COUNT(*) AS count FROM notifications').get()!.count).toBe(0)
    expect((await f.send({ ...f.reply, body: 'Different text' })).status).toBe(409)
    expect(f.comments).toHaveLength(1)
  })
  it('recovers a reply saved on GitHub when its response was lost, using the same draft identifier', async () => {
    const f = await fixture(); f.dropPost()
    expect((await f.send()).status).toBe(502)
    expect((await f.send()).status).toBe(201)
    expect(f.comments).toHaveLength(1)
  })
  it('notifies the reporter once with the frontend member identity when another member replies, including bot relay redelivery', async () => {
    const f = await fixture()
    f.db.exec("INSERT INTO users(id,display_name,username,email_verified) VALUES('reporter','Reporter','reporter',1); UPDATE issues SET reporter_id='reporter'")
    await f.send(); await f.send()
    const p = f.payload(f.comments[0].body, 99)
    await f.hook(p)
    await f.hook({ ...p, comment: { ...p.comment, user: { ...p.comment.user, type: 'Bot' } } })
    expect(f.db.prepare('SELECT user_id,actor_id,kind,excerpt FROM notifications').all()).toEqual([{ user_id: 'reporter', actor_id: 'listener', kind: 'issue_comment', excerpt: f.reply.body }])
  })
  it('blocks anonymous, unverified and suspended users and private or other-module reports before writing', async () => {
    const f = await fixture()
    expect((await f.send(f.reply, undefined, '')).status).toBe(401)
    f.db.exec("UPDATE users SET email_verified=0 WHERE id='listener'")
    expect((await f.send()).status).toBe(403)
    f.db.exec("UPDATE users SET email_verified=1,suspended=1 WHERE id='listener'")
    expect((await f.send()).status).toBe(401)
    f.db.exec("UPDATE users SET suspended=0 WHERE id='listener'")
    expect((await f.send(f.reply, '/modules/miniverb/issues/report/replies')).status).toBe(404)
    f.db.exec("UPDATE issues SET public_json=NULL")
    expect((await f.send()).status).toBe(404)
    expect(f.writes).toEqual([])
  })
  it('serializes simultaneous retries instead of opening two comments', async () => {
    const f = await fixture()
    let release!: () => void, entered!: () => void
    const held = new Promise<void>(resolve => { release = resolve }), started = new Promise<void>(resolve => { entered = resolve })
    const provider = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL, init: RequestInit = {}) => { if (init.method === 'GET') { entered(); await held } return provider(url, init) }))
    const first = f.send(); await started
    expect((await f.send()).status).toBe(409)
    release(); expect((await first).status).toBe(201)
    expect(f.comments).toHaveLength(1)
  })
  it('caps frontend public writes and rejects malformed request identities', async () => {
    const f = await fixture()
    expect((await f.send({ ...f.reply, requestId: 'bad' })).status).toBe(400)
    for (let index = 0; index < 20; index++) expect((await f.send({ ...f.reply, requestId: crypto.randomUUID() })).status).toBe(201)
    expect((await f.send({ ...f.reply, requestId: crypto.randomUUID() })).status).toBe(429)
    expect(f.comments).toHaveLength(20)
  })
})

describe('scoped GitHub maintainer commands', () => {
  it('allows Zac to close and reopen his module report without a site claim or repository write access', async () => {
    const f = await fixture()
    const close = f.payload('/modwerk close configuration Set the preceding track’s CUE volume to zero.')
    expect(await (await f.hook(close)).json()).toMatchObject({ command: 'completed' })
    expect(f.db.prepare('SELECT status FROM issues').get()!.status).toBe('closed')
    expect(f.writes.find(write => write.method === 'PATCH')!.body).toEqual({ state: 'closed', state_reason: 'not_planned' })
    expect(f.db.prepare('SELECT kind,github_actor FROM notifications').all()).toEqual([{ kind: 'issue_closed', github_actor: 'Zac-Kyoti' }])
    expect(f.comments.map(comment => comment.body).join('\n')).not.toContain('PRIVATE CONFIGURATION')
    expect(await (await f.hook(f.payload('/modwerk reopen Please check the new reproduction steps.', 2))).json()).toMatchObject({ command: 'completed' })
    expect(f.db.prepare('SELECT status FROM issues').get()!.status).toBe('open')
    const count = f.writes.length
    expect(await (await f.hook(close)).json()).toMatchObject({ command: 'already-completed' })
    expect(f.writes).toHaveLength(count)
    expect(f.db.prepare('SELECT status FROM issues').get()!.status).toBe('open')
  })
  it('ignores forged signatures, PR comments, edits, bots and wrong repositories', async () => {
    const f = await fixture(), p = f.payload('/modwerk close duplicate Already reported.')
    expect((await f.hook(p, undefined, 'sha256=bad')).status).toBe(401)
    for (const data of [{ ...p, issue: { number: 321, pull_request: {} } }, { ...p, action: 'edited' }, { ...p, comment: { ...p.comment, user: { ...p.comment.user, type: 'Bot' } } }, { ...p, repository: { full_name: 'someone/else' } }]) expect(await (await f.hook(data)).json()).toMatchObject({ handled: false })
    expect(f.writes).toEqual([])
  })
  it('denies recycled handles, another author, mismatched senders, withdrawn sharing and suspended/revoked identities', async () => {
    const f = await fixture(), p = f.payload('/modwerk close duplicate Already reported.')
    for (const identity of [{ ...p.comment.user, id: 1 }, { id: 67785539, login: 'repeat98', type: 'User' }]) expect(await (await f.hook({ ...p, comment: { ...p.comment, user: identity }, sender: identity })).json()).toMatchObject({ command: 'denied' })
    expect(await (await f.hook({ ...p, sender: { ...p.sender, id: 1 } })).json()).toMatchObject({ command: 'ignored' })
    f.db.exec('UPDATE issues SET maintainer_sharing=0')
    expect(await (await f.hook(p)).json()).toMatchObject({ command: 'denied' })
    f.db.exec("UPDATE issues SET maintainer_sharing=1; INSERT INTO users(id,display_name,github_id,github_login,suspended) VALUES('maker','Maker','273702472','Zac-Kyoti',1)")
    expect(await (await f.hook(p)).json()).toMatchObject({ command: 'denied' })
    f.db.exec("UPDATE users SET suspended=0 WHERE id='maker'; INSERT INTO module_maintainers(module_id,user_id,github_login,revoked) VALUES('sidechain-compressor','maker','Zac-Kyoti',1)")
    expect(await (await f.hook(p)).json()).toMatchObject({ command: 'denied' })
    expect(f.writes).toEqual([])
  })
  it('keeps the local report open on GitHub failure and retries without duplicate explanations', async () => {
    const f = await fixture(), p = f.payload('/modwerk close not_reproducible Tested both FX slots.')
    f.failPatch(true)
    expect((await f.hook(p)).status).toBe(502)
    expect(f.db.prepare('SELECT status FROM issues').get()!.status).toBe('open')
    expect(f.db.prepare('SELECT COUNT(*) AS count FROM notifications').get()!.count).toBe(0)
    f.failPatch(false)
    expect((await f.hook(p)).status).toBe(200)
    expect(f.comments.filter(comment => comment.body.includes('No new firmware fix'))).toHaveLength(1)
    expect(f.db.prepare('SELECT status FROM issues').get()!.status).toBe('closed')
  })
  it('requires an explanation or version-bound download confirmation and explains errors publicly', async () => {
    const f = await fixture()
    for (const [index, text] of ['/modwerk close configuration', '/modwerk reopen', '/modwerk resolve 9.0.0', '/modwerk resolve 9.0.0 verified-download'].entries()) expect((await f.hook(f.payload(text, index + 1))).status).toBe(200)
    expect(f.comments).toHaveLength(4)
    expect(f.comments.every(comment => comment.body.startsWith('Command could not complete:'))).toBe(true)
    expect(f.writes.some(write => write.method === 'PATCH')).toBe(false)
    expect(f.db.prepare('SELECT COUNT(*) AS count FROM notifications').get()!.count).toBe(0)
  })
  it('uses the existing live release gate and preference-aware fanout after the author confirms the published download', async () => {
    const f = await fixture('miniverb')
    f.db.exec("INSERT INTO module_update_subscriptions(user_id,module_id,after_version) VALUES('listener','miniverb','0.0.0')")
    f.offline()
    await f.hook(f.payload('/modwerk resolve ' + f.module.version + ' verified-download'))
    expect(f.db.prepare('SELECT status FROM issues').get()!.status).toBe('open')
    expect(f.db.prepare('SELECT COUNT(*) AS count FROM notifications').get()!.count).toBe(0)
    const live = await fixture('miniverb')
    live.db.exec("INSERT INTO module_update_subscriptions(user_id,module_id,after_version) VALUES('listener','miniverb','0.0.0')")
    const p = live.payload('/modwerk resolve ' + live.module.version + ' verified-download')
    expect(await (await live.hook(p)).json()).toMatchObject({ command: 'completed' })
    await live.hook(p)
    expect(live.db.prepare('SELECT status FROM issues').get()!.status).toBe('closed')
    expect(live.db.prepare('SELECT kind FROM notifications ORDER BY kind').all()).toEqual([{ kind: 'issue_resolved' }, { kind: 'module_update' }])
    expect(live.comments.at(-1)!.body).toContain('1 module update notifications queued')
    expect(live.writes.filter(write => write.method === 'PATCH')).toHaveLength(1)
  })
})

describe('GitHub-first presentation', () => {
  it('shows a public frontend reply form with explicit attribution and verification gates', () => {
    const render = (user: { id: string; username: string; displayName: string; verified: boolean } | null) => renderToStaticMarkup(createElement(CommunityContext.Provider, { value: { session: { ...emptySession, user }, developer: null, catalog: [], refresh: async () => {}, refreshDeveloper: async () => {} } }, createElement(GithubReplyForm, { moduleId: 'miniverb', issueId: 'report', onSent: () => {} })))
    expect(render(null)).toContain('Sign in to reply on Modwerk')
    expect(render({ id: 'listener', username: 'listener', displayName: 'Listener', verified: false })).toContain('Verify your email')
    const verified = render({ id: 'listener', username: 'listener', displayName: 'Listener', verified: true })
    expect(verified).toContain('Send public reply')
    expect(verified).toContain('publicly here and on GitHub')
  })
  it('keeps creator settings and GitHub entry points while removing the duplicated report/activity inbox', () => {
    const html = renderToStaticMarkup(createElement(CommunityContext.Provider, { value: { session: emptySession, developer: { available: true, user: { login: 'Zac-Kyoti' } }, catalog: [], refresh: async () => {}, refreshDeveloper: async () => {} } }, createElement(DeveloperPage, { route: 'developer' })))
    expect(html).toContain('Creator settings')
    expect(html).toContain('GitHub reports')
    expect(html).not.toMatch(/Module activity|Mark all read|View reports|Open report to reply or close/)
  })
  it('keeps report submission and duplicate-report reply entry points on the frontend', () => {
    const success = renderToStaticMarkup(createElement(BugReportSuccess, { report: { id: 'report', author: 'Zac-Kyoti', github: 'synced', githubUrl: 'https://github.com/repeat98/modwerk/issues/321', forumThreadId: null } }))
    expect(success).toContain('href="#account/report/report">Read and reply on Modwerk')
    const existing = renderToStaticMarkup(createElement(ExistingIssues, { id: 'sidechain-compressor', tracker: { tracker: 'github', issues: [], allUrl: 'https://github.com/repeat98/modwerk/issues', openCount: 0, closedCount: 0, hasMore: false } }))
    expect(existing).toContain('href="#module/sidechain-compressor?tab=issues"')
    expect(existing).not.toContain('target="_blank"')
  })
})
