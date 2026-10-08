import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { testServer } from './test-server'
import { GithubIssueReplies, GithubReplyList } from './GithubIssueReplies'

afterEach(() => vi.unstubAllGlobals())

const comment = { id: 123, body: 'Thanks for the report. **Reselect COMPRESSOR**.\n\n' + 'Full reply. '.repeat(80), created_at: '2026-10-08T20:08:59Z', updated_at: '2026-10-08T20:08:59Z', user: { login: 'Zac-Kyoti', email: 'private@example.test' } }
async function fixture() {
  const server = await testServer()
  Object.assign(server.env, { GITHUB_TOKEN: 'test-github-token', GITHUB_REPOSITORY: 'repeat98/modwerk' })
  server.db.prepare("INSERT INTO users(id,display_name) VALUES('reporter','Reporter')").run()
  server.db.prepare("INSERT INTO issues(id,module_id,author_login,reporter_id,title,body,public_json,github_number,github_url,context_json) VALUES('shared','sidechain-compressor','Zac-Kyoti','reporter','Track 8','PRIVATE BODY',?,321,'https://github.com/repeat98/modwerk/issues/321',?)").run('{"actual":"Public description"}', '{"private":"configuration"}')
  return server
}

describe('public GitHub issue replies', () => {
  it('reads existing replies in full, returns only public fields and keeps pagination on the mapped issue', async () => {
    const f = await fixture()
    try {
      const provider = vi.fn().mockResolvedValueOnce(Response.json([comment], { headers: { Link: '<https://api.github.com/repos/repeat98/modwerk/issues/321/comments?page=2>; rel="next"' } })).mockResolvedValueOnce(Response.json([{ ...comment, body: 'Edited reply', updated_at: '2026-10-08T21:00:00Z' }]))
      vi.stubGlobal('fetch', provider)
      const result = await f.call('/modules/sidechain-compressor/issues/shared/replies')
      expect(result.status).toBe(200)
      expect(await result.json()).toEqual({ replies: [{ id: 123, author: 'Zac-Kyoti', body: comment.body, created_at: comment.created_at, updated_at: comment.updated_at, url: 'https://github.com/repeat98/modwerk/issues/321#issuecomment-123' }], hasMore: true })
      expect(provider.mock.calls[0][0]).toBe('https://api.github.com/repos/repeat98/modwerk/issues/321/comments?per_page=20&page=1')
      const updated = await (await f.call('/modules/sidechain-compressor/issues/shared/replies?page=1')).json()
      expect(updated).toMatchObject({ replies: [{ body: 'Edited reply' }], hasMore: false })
      expect(provider.mock.calls[1][0]).toContain('per_page=20&page=2')
      expect(JSON.stringify(updated)).not.toMatch(/PRIVATE BODY|configuration|private@example|test-github-token/)
    } finally { f.db.close() }
  })

  it('rejects private, unknown, other-module and forum-only reports before contacting GitHub', async () => {
    const f = await fixture(), provider = vi.fn()
    vi.stubGlobal('fetch', provider)
    try {
      expect((await f.call('/modules/miniverb/issues/shared/replies')).status).toBe(404)
      expect((await f.call('/modules/sidechain-compressor/issues/unknown/replies')).status).toBe(404)
      f.db.exec("UPDATE issues SET public_json=NULL WHERE id='shared'")
      expect((await f.call('/modules/sidechain-compressor/issues/shared/replies')).status).toBe(404)
      f.db.exec("UPDATE issues SET public_json='{}',github_url=NULL,github_number=NULL WHERE id='shared'")
      expect((await f.call('/modules/sidechain-compressor/issues/shared/replies')).status).toBe(404)
      expect(provider).not.toHaveBeenCalled()
    } finally { f.db.close() }
  })

  it('reports upstream failures without disclosing credentials or presenting an empty conversation', async () => {
    const f = await fixture()
    try {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'private-provider-message' }, { status: 403 })))
      const failure = await f.call('/modules/sidechain-compressor/issues/shared/replies')
      expect(failure.status).toBe(502)
      expect(await failure.text()).not.toMatch(/private-provider|test-github-token|"replies"/)
      delete f.env.GITHUB_TOKEN
      expect((await f.call('/modules/sidechain-compressor/issues/shared/replies')).status).toBe(503)
    } finally { f.db.close() }
  })

  it('rejects invalid pages and malformed provider replies, and reflects deletions on refresh', async () => {
    const f = await fixture(), provider = vi.fn().mockResolvedValueOnce(Response.json([{ ...comment, created_at: 'bad-date' }])).mockResolvedValueOnce(Response.json([]))
    vi.stubGlobal('fetch', provider)
    try {
      for (const page of ['-1', '1.5', 'no', '10001']) expect((await f.call('/modules/sidechain-compressor/issues/shared/replies?page=' + page)).status).toBe(400)
      expect(provider).not.toHaveBeenCalled()
      expect((await f.call('/modules/sidechain-compressor/issues/shared/replies')).status).toBe(502)
      expect(await (await f.call('/modules/sidechain-compressor/issues/shared/replies')).json()).toEqual({ replies: [], hasMore: false })
    } finally { f.db.close() }
  })

  it('rate limits public GitHub reads', async () => {
    const f = await fixture(), provider = vi.fn().mockImplementation(async () => Response.json([]))
    vi.stubGlobal('fetch', provider)
    try {
      for (let request = 0; request < 60; request++) expect((await f.call('/modules/sidechain-compressor/issues/shared/replies')).status).toBe(200)
      expect((await f.call('/modules/sidechain-compressor/issues/shared/replies')).status).toBe(429)
      expect(provider).toHaveBeenCalledTimes(60)
    } finally { f.db.close() }
  })
})

describe('GitHub reply presentation', () => {
  it('renders full formatted replies safely and keeps GitHub handles out of forum profile links', () => {
    const html = renderToStaticMarkup(createElement(GithubReplyList, { replies: [{ id: 123, author: 'Zac-Kyoti', body: comment.body + '\n\n@someone <script>alert(1)</script> [bad](javascript:alert%281%29) ![tracking](https://tracking.example.test/image.png)', url: 'https://github.com/repeat98/modwerk/issues/321#issuecomment-123', created_at: comment.created_at, updated_at: '2026-10-08T21:00:00Z' }] }))
    expect(html).toContain('<strong>Reselect COMPRESSOR</strong>')
    expect(html).toContain('Full reply. '.repeat(80).trim())
    expect(html).toContain('Edited')
    expect(html).not.toMatch(/<script|<img|href="javascript|#forum\/profile/)
  })

  it('loads on expansion and distinguishes loading from an empty conversation', () => {
    const props = { moduleId: 'sidechain-compressor', issueId: 'shared', githubUrl: 'https://github.com/repeat98/modwerk/issues/321' }
    const collapsed = renderToStaticMarkup(createElement(GithubIssueReplies, props))
    expect(collapsed).toContain('GitHub replies')
    expect(collapsed).not.toContain('Loading replies')
    const expanded = renderToStaticMarkup(createElement(GithubIssueReplies, { ...props, initiallyOpen: true }))
    expect(expanded).toContain('Loading replies…')
    expect(expanded).toContain('Reply on GitHub')
    expect(expanded).not.toContain('No GitHub replies yet')
  })
})
