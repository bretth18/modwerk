import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

/** Title lines for a card: words kept whole, at most `lines` lines of about `width` characters, the last one ending in an ellipsis when the title is longer. */
export function wrapTitle(title: string, width = 26, lines = 3): string[] {
  const out: string[] = []
  let line = ''
  const words = title.split(/\s+/).filter(Boolean).flatMap(word => word.length > width ? word.match(new RegExp(`.{1,${width}}`, 'g'))! : [word])
  for (const [index, word] of words.entries()) {
    if (line && (line + ' ' + word).length > width) {
      out.push(line)
      line = ''
      if (out.length === lines) { out[lines - 1] = out[lines - 1].slice(0, width - 1).trimEnd() + '…'; return out }
    }
    line = line ? line + ' ' + word : word
    if (index === words.length - 1) out.push(line)
  }
  return out
}

export type SocialCard = { kicker: string; title: string; left?: string; right?: string }

/** A 1200 × 630 JPEG on the site's dark background with the Modwerk mark: a small heading, the title (up to three lines) and an optional line at each bottom corner. */
export async function socialCard(root: string, card: SocialCard): Promise<Buffer> {
  const mark = readFileSync(resolve(root, 'public/modwerk-mark.svg'), 'utf8').replace(/<svg\b[^>]*>/, '<svg x="1040" y="48" width="112" height="112" viewBox="1 1 58 58">')
  const lines = wrapTitle(card.title)
  const size = 76, top = 300 - ((lines.length - 1) * size) / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><radialGradient id="glow" cx="60%" cy="100%" r="75%"><stop stop-color="#8c9eff" stop-opacity=".12"/><stop offset="1" stop-color="#8c9eff" stop-opacity="0"/></radialGradient></defs>
    <rect width="1200" height="630" fill="#1c1c22"/><rect width="1200" height="630" fill="url(#glow)"/>
    ${mark}
    <text x="64" y="96" fill="#8c9eff" font-family="monospace" font-size="28" letter-spacing="2">${escapeHtml(card.kicker.toUpperCase())}</text>
    ${lines.map((line, index) => `<text x="64" y="${top + index * size}" fill="#ececf1" font-family="sans-serif" font-weight="700" font-size="${size - 12}">${escapeHtml(line)}</text>`).join('')}
    ${card.left ? `<text x="64" y="570" fill="#ffb784" font-family="monospace" font-size="28">${escapeHtml(card.left)}</text>` : ''}
    ${card.right ? `<text x="1136" y="570" text-anchor="end" fill="#ececf1" opacity=".7" font-family="monospace" font-size="28">${escapeHtml(card.right)}</text>` : ''}
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer()
}
