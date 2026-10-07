import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { SITE_PAGES, sitePageHtml, sitePages } from './site-pages.ts'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace('%BASE_URL%', './')

it('gives the page its own title, description, canonical URL and card', () => {
  const page = sitePageHtml(html, SITE_PAGES[0], 'page-thumbnails/submit-abc.jpg', './')
  expect(page).toContain('<base href="../" />')
  expect(page).toContain('<title>Start developing — Modwerk</title>')
  expect(page).toContain('<link rel="canonical" href="https://modwerk.app/submit/" />')
  expect(page).toContain('<meta property="og:url" content="https://modwerk.app/submit/" />')
  expect(page).toContain('<meta property="og:image" content="https://modwerk.app/page-thumbnails/submit-abc.jpg" />')
  expect(page).toContain('<meta name="twitter:image" content="https://modwerk.app/page-thumbnails/submit-abc.jpg" />')
  expect(page).not.toContain('modwerk-social-preview-v2.jpg')
  expect(sitePageHtml(html, SITE_PAGES[0], 'x.jpg', '/octamod/')).toContain('<base href="/octamod/" />')
})

it('emits each page and its generated card', async () => {
  const plugin = sitePages()
  plugin.configResolved({ root: new URL('../', import.meta.url).pathname, base: './' })
  const assets = []
  await plugin.generateBundle.call({ emitFile(asset) { assets.push(asset) } }, {}, { 'index.html': { type: 'asset', source: html } })
  expect(assets.map(asset => asset.fileName)).toEqual([expect.stringMatching(/^page-thumbnails\/submit-[0-9a-f]{12}\.jpg$/), 'submit/index.html'])
  expect(assets[1].source).toContain(assets[0].fileName)
})
