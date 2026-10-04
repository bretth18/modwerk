// Renders docs/social-preview/modwerk-v2.html into public/modwerk-social-preview-v2.jpg.
// Playwright and the fonts are not project dependencies; install them for one run without touching package.json:
//   npm install --no-save playwright@1.56.1 @fontsource-variable/archivo@5.3.0 @fontsource-variable/jetbrains-mono@5.3.0
//   npx playwright install chromium
//   node scripts/render-social-preview.mjs [--previews <dir>]
// The page names its fonts by pinned jsDelivr URL; this script serves them from those local packages.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = path.join(root, 'docs/social-preview/modwerk-v2.html')
const target = path.join(root, 'public/modwerk-social-preview-v2.jpg')
const previewsAt = process.argv.indexOf('--previews')
const previews = previewsAt > 0 ? process.argv[previewsAt + 1] : undefined

const install = 'npm install --no-save playwright@1.56.1 @fontsource-variable/archivo@5.3.0 @fontsource-variable/jetbrains-mono@5.3.0'
let chromium
try {
  ({ chromium } = await import('playwright'))
} catch {
  console.error(`Playwright is missing: ${install}`)
  process.exit(1)
}

// https://cdn.jsdelivr.net/npm/<package>@<version>/files/<file> -> node_modules/<package>/files/<file>, same version only.
function localFont(url) {
  const match = url.match(/^https:\/\/cdn\.jsdelivr\.net\/npm\/(@[^/]+\/[^@]+)@([^/]+)\/files\/([\w.-]+)$/)
  if (!match) return undefined
  const [, name, version, file] = match
  const dir = path.join(root, 'node_modules', name)
  if (!existsSync(path.join(dir, 'package.json'))) throw new Error(`Font package ${name} is missing: ${install}`)
  const installed = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).version
  if (installed !== version) throw new Error(`${name} ${installed} is installed; the artwork pins ${version}.`)
  return readFileSync(path.join(dir, 'files', file))
}

// Render at twice the size and downsample, so hairlines stay crisp in the 1200 × 630 export.
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 })
let routeError
await page.route(url => url.protocol !== 'file:', route => {
  try {
    const body = localFont(route.request().url())
    if (body) return route.fulfill({ body, contentType: 'font/woff2' })
  } catch (error) {
    routeError = error
  }
  return route.abort()
})
await page.goto('file://' + source)
// The page sets data-rendered to 'true' once its fonts and mark have loaded, otherwise to the error.
const rendered = 'document.documentElement.dataset.rendered'
await page.waitForFunction(rendered, null, { timeout: 30000 })
const state = await page.evaluate(rendered)
if (routeError || state !== 'true') {
  await browser.close()
  throw routeError ?? new Error(`Artwork did not render with its fonts and mark (${state}).`)
}
const capture = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } })
await browser.close()

const jpeg = await sharp(capture)
  .resize(1200, 630, { kernel: 'lanczos3' })
  .jpeg({ quality: 95, progressive: true, chromaSubsampling: '4:4:4', mozjpeg: true })
  .toBuffer()
writeFileSync(target, jpeg)
console.log(`${path.relative(root, target)}: ${jpeg.length} bytes, sha256 ${createHash('sha256').update(jpeg).digest('hex')}`)

if (previews) {
  // Link previews are often shown at 600 or 400 px wide; check those before publishing.
  mkdirSync(previews, { recursive: true })
  for (const width of [600, 400]) {
    const file = path.join(previews, `modwerk-v2-${width}.png`)
    await sharp(capture).resize(width, Math.round(width * 630 / 1200), { kernel: 'lanczos3' }).png().toFile(file)
    console.log(`${file}: ${readFileSync(file).length} bytes`)
  }
}
