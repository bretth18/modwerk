import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import sharp from 'sharp'
import { MODULES } from '../src/catalog/modules.ts'
import { modulePageHtml, moduleThumbnail } from './module-pages.ts'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace('%BASE_URL%', './')
const stylesheet = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const analog = MODULES.find(module => module.id === 'analog-bassdrum')

it('provides module-specific cards to crawlers without executing JavaScript', () => {
  const page = modulePageHtml(html, analog, 'module-thumbnails/analog-bassdrum-hash.jpg', './')
  expect(page).toContain('<base href="../../" />')
  expect(page).toContain('<meta property="og:title" content="Analog BD — Octamod" />')
  expect(page).toContain('<meta property="og:url" content="https://octamod.app/module/analog-bassdrum/" />')
  expect(page).toContain('<link rel="canonical" href="https://octamod.app/module/analog-bassdrum/" />')
  expect(page).toContain('<meta property="og:image" content="https://octamod.app/module-thumbnails/analog-bassdrum-hash.jpg" />')
  expect(page).toContain('<meta name="twitter:image" content="https://octamod.app/module-thumbnails/analog-bassdrum-hash.jpg" />')
  expect(page).not.toContain('social-preview.jpg')
  expect(page.match(/property="og:image"/g)).toHaveLength(1)
  expect(page).toContain('<div id="root"></div>')
})

it('keeps canonical URLs, thumbnails and app assets under a Pages project base', () => {
  const page = modulePageHtml(html, analog, 'module-thumbnails/analog.jpg', '/octamod/')
  expect(page).toContain('<base href="/octamod/" />')
  expect(page).toContain('content="https://octamod.app/octamod/module/analog-bassdrum/"')
  expect(page).toContain('content="https://octamod.app/octamod/module-thumbnails/analog.jpg"')
})

it('escapes catalog text in metadata and titles', () => {
  const page = modulePageHtml(html, { ...analog, name: 'A & B <C>', description: 'A "quoted" <description>' }, 'module-thumbnails/analog.jpg', './')
  expect(page).toContain('<title>A &amp; B &lt;C&gt; — Octamod</title>')
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
