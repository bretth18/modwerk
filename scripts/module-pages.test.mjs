import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import sharp from 'sharp'
import { MODULES } from '../src/catalog/modules.ts'
import { modulePageHtml, modulePages, moduleThumbnail, notFoundPageHtml } from './module-pages.ts'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace('%BASE_URL%', './')
const stylesheet = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const analog = MODULES.find(module => module.id === 'analog-bassdrum')

it('provides module-specific cards to crawlers without executing JavaScript', () => {
  const page = modulePageHtml(html, analog, 'module-thumbnails/analog-bassdrum-hash.jpg', './')
  expect(page).toContain('<base href="../../" />')
  expect(page).toContain('<meta property="og:title" content="Analog BD — Modwerk" />')
  expect(page).toContain('<meta property="og:url" content="https://modwerk.app/module/analog-bassdrum/" />')
  expect(page).toContain('<link rel="canonical" href="https://modwerk.app/module/analog-bassdrum/" />')
  expect(page).toContain('<meta property="og:image" content="https://modwerk.app/module-thumbnails/analog-bassdrum-hash.jpg" />')
  expect(page).toContain('<meta name="twitter:image" content="https://modwerk.app/module-thumbnails/analog-bassdrum-hash.jpg" />')
  expect(page).not.toContain('modwerk-social-preview-v2.jpg')
  expect(page.match(/property="og:image"/g)).toHaveLength(1)
  expect(page).toContain('<div id="root"></div>')
})

it('keeps canonical URLs, thumbnails and app assets under a Pages project base', () => {
  const page = modulePageHtml(html, analog, 'module-thumbnails/analog.jpg', '/octamod/')
  expect(page).toContain('<base href="/octamod/" />')
  expect(page).toContain('content="https://modwerk.app/octamod/module/analog-bassdrum/"')
  expect(page).toContain('content="https://modwerk.app/octamod/module-thumbnails/analog.jpg"')
})

it('builds the FM Synth canonical page and keeps the old URL loadable', async () => {
  const plugin = modulePages()
  plugin.configResolved({ root: new URL('../', import.meta.url).pathname, base: './' })
  const assets = []
  await plugin.generateBundle.call({ emitFile(asset) { assets.push(asset) } }, {}, { 'index.html': { type: 'asset', source: html } })
  const canonical = assets.find(asset => asset.fileName === 'module/fm-synth/index.html')
  const legacy = assets.find(asset => asset.fileName === 'module/synth/index.html')
  expect(assets.find(asset => asset.fileName === '404.html').source).toContain('<base href="https://modwerk.app/" />')
  expect(canonical.source).toContain('<title>FM Synth — Modwerk</title>')
  expect(canonical.source).toContain('<link rel="canonical" href="https://modwerk.app/module/fm-synth/" />')
  expect(canonical.source).toContain('<meta property="og:url" content="https://modwerk.app/module/fm-synth/" />')
  expect(legacy.source).toBe(canonical.source)
})

it('boots the app from an absolute base for paths without a page, and keeps crawlers off that copy', () => {
  const page = notFoundPageHtml(html, './')
  expect(page).toContain('<base href="https://modwerk.app/" />')
  expect(page).toContain('<meta name="robots" content="noindex" />')
  expect(page).toContain('<div id="root"></div>')
  expect(page).toContain('<meta property="og:url" content="https://modwerk.app/" />')
  expect(page).not.toContain('<link rel="canonical"')
  expect(notFoundPageHtml(html, '/octamod/')).toContain('<base href="/octamod/" />')
})

it('escapes catalog text in metadata and titles', () => {
  const page = modulePageHtml(html, { ...analog, name: 'A & B <C>', description: 'A "quoted" <description>' }, 'module-thumbnails/analog.jpg', './')
  expect(page).toContain('<title>A &amp; B &lt;C&gt; — Modwerk</title>')
  expect(page).toContain('content="A &quot;quoted&quot; &lt;description&gt;"')
  expect(page).not.toContain('<description>')
})

it.each(MODULES)('renders a usable JPEG of $name from the library thumbnail', async module => {
  const image = await moduleThumbnail(module.id, stylesheet)
  const metadata = await sharp(image).metadata()
  expect(metadata).toMatchObject({ format: 'jpeg', width: 1200, height: 630 })
  expect(image.length).toBeGreaterThan(10000)
  const statistics = await sharp(image).stats()
  expect(statistics.channels.some(channel => channel.stdev > 10)).toBe(true)
})

it('uses different module artwork and responds to thumbnail palette changes', async () => {
  const image = await moduleThumbnail('analog-bassdrum', stylesheet)
  expect(image.equals(await moduleThumbnail('tapeecho', stylesheet))).toBe(false)
  expect(image.equals(await moduleThumbnail('analog-bassdrum', stylesheet.replaceAll('#e9ab83', '#83c7bc')))).toBe(false)
})
