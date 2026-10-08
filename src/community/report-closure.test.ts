import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { developerApi } from '../../server/developers'
import { handleGithubWebhook, signGithubPayload } from '../../server/github'
import type { Env, User } from '../../server/platform'
import { CloseReportForm } from './CloseReportForm'
import { testDatabase } from './test-server'

afterEach(() => vi.unstubAllGlobals())

function fixture() {
  const { db, adapter } = testDatabase()
  // A declared, claimed maintainer can triage without release-author or repository write privileges.
  const developer: User = { id: 'developer', display_name: 'Zac', github_id: 'synthetic-github-id', github_login: 'Zac-Kyoti' }
  db.prepare("INSERT INTO users(id,display_name,github_id,github_login) VALUES(?,?,?,?)").run(developer.id, developer.display_name, developer.github_id!, developer.github_login!)
  db.exec("INSERT INTO users(id,display_name,email_verified) VALUES('reporter','Reporter',1)")
  db.prepare("INSERT INTO module_maintainers(module_id,user_id,github_login) VALUES('sidechain-compressor','developer','Zac-Kyoti')").run()
  db.exec("INSERT INTO issues(id,module_id,author_login,reporter_id,title,body,maintainer_sharing,public_json,github_number,github_url) VALUES('report','sidechain-compressor','Zac-Kyoti','reporter','Track 8','PRIVATE configuration',1,'{}',321,'https://github.com/repeat98/modwerk/issues/321')")
  const env: Env = { GITHUB_TOKEN: 'synthetic-token', GITHUB_REPOSITORY: 'repeat98/modwerk', GITHUB_WEBHOOK_SECRET: 'test-webhook-secret' }
  const body = { status: 'closed', closureReason: 'configuration', note: 'The CUE mix included the preceding track. Set that CUE level to zero.' }
  const call = (data: unknown = body, who: User | null = developer, id = 'report') => developerApi(new Request('https://modwerk.test/api/issues/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }), adapter, null, false, who, null, env)
  return { db, adapter, env, developer, body, call }
}

describe('maintainer report closure without a release', () => {
  it('comments and closes both trackers, queues a closure rather than a fix, and reopens without general GitHub privileges', async () => {
    const f = fixture(), comments: { body: string }[] = []
    const provider = vi.fn(async (_url: string, init: RequestInit) => {
      if (init.method === 'GET') return Response.json(comments)
      if (init.method === 'POST') comments.push(JSON.parse(String(init.body)))
      return Response.json({ ok: true })
    })
    vi.stubGlobal('fetch', provider)
    try {
      for (let attempt = 0; attempt < 2; attempt++) expect(await (await f.call())!.json()).toEqual({ ok: true })
      expect(comments).toHaveLength(1)
      expect(comments[0].body).toContain('Zac-Kyoti')
      expect(comments[0].body).toContain(f.body.note)
      expect(comments[0].body).not.toMatch(/PRIVATE configuration|synthetic-token/)
      expect(JSON.parse(String(provider.mock.calls.at(-1)![1].body))).toEqual({ state: 'closed', state_reason: 'not_planned' })
      expect(f.db.prepare("SELECT status FROM issues WHERE id='report'").get()!.status).toBe('closed')
      expect(f.db.prepare("SELECT kind FROM notifications").all()).toEqual([{ kind: 'issue_closed' }])
      const payload = new TextEncoder().encode(JSON.stringify({ action: 'closed', issue: { number: 321, state_reason: 'not_planned' }, sender: { login: 'repeat98' }, repository: { full_name: 'repeat98/modwerk' } })).buffer as ArrayBuffer
      await handleGithubWebhook(new Request('https://modwerk.test/api/github/webhook', { method: 'POST', headers: { 'X-GitHub-Event': 'issues', 'X-GitHub-Delivery': 'closure-echo', 'X-Hub-Signature-256': await signGithubPayload('test-webhook-secret', payload) }, body: payload }), f.env, f.adapter, payload)
      expect(f.db.prepare('SELECT COUNT(*) AS count FROM notifications').get()!.count).toBe(1)
      expect(await (await f.call({ status: 'open' }))!.json()).toEqual({ ok: true })
      expect(JSON.parse(String(provider.mock.calls.at(-1)![1].body))).toEqual({ state: 'open' })
      expect(f.db.prepare("SELECT status,closed_at FROM issues WHERE id='report'").get()).toEqual({ status: 'open', closed_at: null })
      expect(f.db.prepare('SELECT kind FROM notifications ORDER BY rowid').all()).toEqual([{ kind: 'issue_closed' }, { kind: 'issue_reopened' }])
    } finally { f.db.close() }
  })

  it('leaves local status open on GitHub closure failure and reuses the explanation on retry', async () => {
    const f = fixture(), comments: { body: string }[] = [], requests: string[] = []
    let fail = true
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      requests.push(String(init.method))
      if (init.method === 'GET') return Response.json(comments)
      if (init.method === 'POST') comments.push(JSON.parse(String(init.body)))
      if (init.method === 'PATCH' && fail) return Response.json({ message: 'private provider failure' }, { status: 403 })
      return Response.json({ ok: true })
    }))
    try {
      await expect(f.call()).rejects.toThrow('Its Modwerk status was not changed')
      expect(f.db.prepare("SELECT status FROM issues WHERE id='report'").get()!.status).toBe('open')
      expect(f.db.prepare('SELECT COUNT(*) AS count FROM notifications').get()!.count).toBe(0)
      fail = false
      await f.call()
      expect(comments).toHaveLength(1)
      expect(requests).toEqual(['GET', 'POST', 'PATCH', 'GET', 'PATCH'])
    } finally { f.db.close() }
  })

  it('preserves module scope, consent and revocation checks before any GitHub write', async () => {
    const f = fixture(), provider = vi.fn()
    vi.stubGlobal('fetch', provider)
    try {
      await expect(f.call(f.body, null)).rejects.toThrow('Report not found')
      await expect(f.call(f.body, { ...f.developer, id: 'other-developer' })).rejects.toThrow('Report not found')
      f.db.exec("UPDATE issues SET maintainer_sharing=0")
      await expect(f.call()).rejects.toThrow('Report not found')
      f.db.exec("UPDATE issues SET maintainer_sharing=1; UPDATE module_maintainers SET revoked=1")
      await expect(f.call()).rejects.toThrow('Report not found')
      f.db.exec("UPDATE module_maintainers SET revoked=0; UPDATE issues SET module_id='miniverb'")
      await expect(f.call()).rejects.toThrow('Report not found')
      expect(provider).not.toHaveBeenCalled()
    } finally { f.db.close() }
  })

  it('requires a public reason and explanation and retains the existing release-author check for a claimed firmware fix', async () => {
    const f = fixture(), provider = vi.fn()
    vi.stubGlobal('fetch', provider)
    try {
      for (const data of [{ ...f.body, note: '' }, { ...f.body, closureReason: 'fixed' }, { ...f.body, status: 'open' }, { ...f.body, maintainerSharing: true }]) await expect(f.call(data)).rejects.toThrow()
      await expect(f.call({ status: 'closed' })).rejects.toThrow('registered GitHub identity')
      expect(provider).not.toHaveBeenCalled()
    } finally { f.db.close() }
  })

  it('shows the non-release path with a required public explanation and no firmware verification claim', () => {
    const html = renderToStaticMarkup(createElement(CloseReportForm, { busy: false, onClose: () => {} }))
    expect(html).toContain('Close without a new release')
    expect(html).toContain('Public explanation')
    expect(html).toContain('Close report and notify reporter')
    expect(html).not.toContain('verifiedDownload')
  })
})
