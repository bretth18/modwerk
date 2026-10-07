import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { fetchForumThreads, forumPages, forumThreadPageHtml } from './forum-pages.ts'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace('%BASE_URL%', './')
const id = '0f3a1b2c-4d5e-4f60-8a9b-0c1d2e3f4a5b'
const thread = { id, title: 'Granular pad from "Tapehead"', category: 'showcase', machine: 'octatrack', username: 'synth_fan', created_at: '2026-10-01 10:00:00', updated_at: '2026-10-02 10:00:00', replies: 3, excerpt: 'Here is how it sounds <with> a long tail.', image: null }
const api = 'https://community.example.test/api'
afterEach(() => vi.unstubAllGlobals())

it('provides thread cards to crawlers and loads the app relative to the thread path', () => {
  const page = forumThreadPageHtml(html, thread, './')
  expect(page).toContain('<base href="../../../" />')
  expect(page).toContain('<title>Granular pad from &quot;Tapehead&quot; — Modwerk forum</title>')
  expect(page).toContain('<link rel="canonical" href="https://modwerk.app/forum/thread/' + id + '-granular-pad-from-tapehead/" />')
  expect(page).toContain('<meta property="og:url" content="https://modwerk.app/forum/thread/' + id + '-granular-pad-from-tapehead/" />')
  expect(page).toContain('<meta property="og:type" content="article" />')
  expect(page).toContain('<meta name="description" content="Here is how it sounds &lt;with&gt; a long tail." />')
  expect(page).toContain('<meta name="twitter:description" content="Here is how it sounds &lt;with&gt; a long tail." />')
  expect(page).toContain('modwerk-social-preview-v2.jpg')
  expect(page).toContain('<div id="root"></div>')
  expect(forumThreadPageHtml(html, thread, '/octamod/')).toContain('<base href="/octamod/" />')
  expect(forumThreadPageHtml(html, thread, '/octamod/')).toContain('content="https://modwerk.app/octamod/forum/thread/' + id + '-granular-pad-from-tapehead/"')
})

it('uses the first public image as the card and describes a thread without text by its topic', () => {
  const page = forumThreadPageHtml(html, { ...thread, excerpt: '', image: api + '/forum/media/abc' }, './')
  expect(page).toContain('<meta property="og:image" content="https://community.example.test/api/forum/media/abc" />')
  expect(page).toContain('<meta name="twitter:image" content="https://community.example.test/api/forum/media/abc" />')
  expect(page).not.toContain('og:image:width')
  expect(page).not.toContain('modwerk-social-preview-v2.jpg')
  expect(page).toContain('content="A Showcase discussion started by @synth_fan on the Modwerk forum." />')
})

it('emits the canonical page, the plain ID alias and robots.txt, and skips the forum when the API is unreachable', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ threads: [thread, { ...thread, id: 'module-miniverb', title: 'Miniverb discussion' }, { id: '../x', title: 'bad' }] })))
  const plugin = forumPages(api)
  plugin.configResolved({ root: new URL('../', import.meta.url).pathname, base: './' })
  const assets = [], warnings = []
  await plugin.generateBundle.call({ emitFile(asset) { assets.push(asset) }, warn(message) { warnings.push(message) } }, {}, { 'index.html': { type: 'asset', source: html } })
  expect(String(fetch.mock.calls[0][0])).toBe('https://community.example.test/api/forum/pages.json')
  expect(assets.map(asset => asset.fileName)).toEqual(['robots.txt', 'forum/thread/' + id + '-granular-pad-from-tapehead/index.html', 'forum/thread/' + id + '/index.html', 'forum/thread/module-miniverb/index.html'])
  expect(assets[0].source).toBe('User-agent: *\nAllow: /\nSitemap: https://community.example.test/api/forum/sitemap.xml\n')
  expect(assets[1].source).toBe(assets[2].source)
  expect(warnings).toEqual([])

  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connect ECONNREFUSED') }))
  expect(await fetchForumThreads(api, message => warnings.push(message))).toEqual([])
  expect(warnings).toEqual(['Forum thread pages were skipped: connect ECONNREFUSED'])
  const offline = []
  await forumPages(undefined).generateBundle.call({ emitFile(asset) { offline.push(asset) }, warn() {} }, {}, { 'index.html': { type: 'asset', source: html } })
  expect(offline.map(asset => asset.fileName)).toEqual(['robots.txt'])
  expect(offline[0].source).toBe('User-agent: *\nAllow: /\n')
})
