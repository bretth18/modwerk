import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import type { Plugin, ResolvedConfig } from 'vite'
import { MODULES } from '../src/catalog/modules.ts'
import type { FirmwareModule } from '../src/catalog/modules.ts'
import { DETAILS } from '../src/catalog/details.ts'
import { ModulePreview } from '../src/components/ModulePreview.tsx'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

/** Rasterize the same artwork and CSS used by the module cards, without browser or firmware input. */
export async function moduleThumbnail(id: string, stylesheet: string): Promise<Buffer> {
  const markup = renderToStaticMarkup(createElement(ModulePreview, { id }))
  const artwork = markup.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/)?.[0]
  if (!artwork) throw new Error('Missing module thumbnail artwork: ' + id)
  const rules = Array.from(stylesheet.matchAll(/([^{}]+)\{([^{}]+)\}/g), match => ({ selector: match[1].trim(), declarations: match[2] }))
  const palette = rules.find(rule => rule.selector === `.module-preview[data-module="${id}"]`) ?? rules.find(rule => rule.selector === '.module-preview')
  const color = palette?.declarations.match(/--signal:\s*([^;]+)/)?.[1]
  const rgb = palette?.declarations.match(/--signal-rgb:\s*([^;]+)/)?.[1]
  if (!color || !rgb) throw new Error('Missing module thumbnail palette: ' + id)
  const styles = rules.filter(rule => /^(?:\.signal-[\w-]+(?:, \.rhythm-on)?|\.rhythm-off|\.reel-[\w-]+|\.signal-art (?:text|\.rhythm-count))$/.test(rule.selector)).map(rule => {
    const declarations = rule.declarations.split(';').filter(declaration => /^\s*(?:stroke[\w-]*|fill|opacity|font[\w-]*|letter-spacing)\s*:/.test(declaration)).join(';')
    return `${rule.selector}{${declarations}}`
  }).join('\n').replaceAll('var(--signal)', color).replaceAll('var(--signal-rgb)', rgb).replaceAll('var(--mono)', 'monospace')
  const detail = DETAILS[id]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <style>${styles}</style>
    <defs><radialGradient id="glow" cx="60%" cy="100%" r="75%"><stop stop-color="${color}" stop-opacity=".075"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>
    <rect width="1200" height="630" fill="#1c1c22"/><rect width="1200" height="630" fill="url(#glow)"/>
    <text x="55" y="58" fill="${color}" opacity=".85" font-family="monospace" font-size="24" letter-spacing="2">${escapeHtml(detail.label)}</text>
    <circle cx="1140" cy="48" r="7" fill="${color}" opacity=".6"/>
    ${artwork.replace('<svg ', '<svg x="60" y="70" width="1080" height="490" ')}
    ${detail.controls.slice(0, 3).map((control, index) => `<text x="${[55, 600, 1145][index]}" y="595" text-anchor="${['start', 'middle', 'end'][index]}" fill="${color}" opacity=".75" font-family="monospace" font-size="22" letter-spacing="1">${escapeHtml(control)}</text>`).join('')}
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer()
}

export function modulePageHtml(html: string, module: FirmwareModule, imagePath: string, base: string): string {
  const home = html.match(/<meta property="og:url" content="([^"]+)"/)?.[1]
  if (!home) throw new Error('Missing public site URL for module previews.')
  const appUrl = new URL(base.startsWith('/') ? base : '.', home)
  const pageUrl = new URL('module/' + module.id + '/', appUrl).href
  const imageUrl = new URL(imagePath, appUrl).href
  const siteName = html.match(/<meta property="og:site_name" content="([^"]+)"/)?.[1] ?? 'Modwerk'
  const title = module.name + ' — ' + siteName
  const alt = module.name + ' module thumbnail'
  const values: Record<string, string> = {
    description: module.description,
    'og:title': title, 'og:description': module.description, 'og:url': pageUrl,
    'og:image': imageUrl, 'og:image:alt': alt,
    'twitter:title': title, 'twitter:description': module.description,
    'twitter:image': imageUrl, 'twitter:image:alt': alt,
  }
  return html
    .replace(/<base href="[^"]*"\s*\/>/, `<base href="${escapeHtml(base === './' || base === '' ? '../../' : base)}" />`)
    .replace(/(<meta (?:property|name)="([^"]+)" content=")[^"]*("\s*\/>)/g, (tag, start, key: string, end) => key in values ? start + escapeHtml(values[key]) + end : tag)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>\n    <link rel="canonical" href="${escapeHtml(pageUrl)}" />`)
}

export function modulePages(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'octamod-module-pages',
    apply: 'build',
    enforce: 'post',
    configResolved(resolved) { config = resolved },
    async generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset') throw new Error('Missing built app HTML for module previews.')
      const html = String(index.source)
      const stylesheet = readFileSync(resolve(config.root, 'src/styles.css'), 'utf8')
      for (const module of MODULES) {
        const thumbnail = await moduleThumbnail(module.id, stylesheet)
        const hash = createHash('sha256').update(thumbnail).digest('hex').slice(0, 12)
        const imagePath = `module-thumbnails/${module.id}-${hash}.jpg`
        this.emitFile({ type: 'asset', fileName: imagePath, source: thumbnail })
        this.emitFile({ type: 'asset', fileName: `module/${module.id}/index.html`, source: modulePageHtml(html, module, imagePath, config.base) })
      }
    },
  }
}
