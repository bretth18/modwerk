import type { Plugin, ResolvedConfig } from 'vite'
import { threadPath } from '../src/community/forum-links.ts'
import { FORUM_CATEGORIES } from '../src/community/forum-contract.ts'
import { siteUrls } from './module-pages.ts'

/** One row of the Worker's `GET /api/forum/pages.json`: public threads only. */
export type ForumPageThread = { id: string; title: string; category: string; machine: string | null; username: string; created_at: string; updated_at: string; replies: number; excerpt: string; image: string | null }

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

/** The built app page with the thread's title, description and preview card, loading its assets relative to its own depth like the module pages. */
export function forumThreadPageHtml(html: string, thread: ForumPageThread, base: string): string {
  const { appUrl, siteName } = siteUrls(html, base)
  const path = threadPath(thread.id, thread.title), pageUrl = new URL(path, appUrl).href
  const topic = (FORUM_CATEGORIES as Record<string, string>)[thread.category] ?? thread.category
  const title = thread.title + ' — ' + siteName + ' forum'
  const description = thread.excerpt || `A ${topic} discussion started by @${thread.username} on the ${siteName} forum.`
  const values: Record<string, string> = {
    description, 'og:type': 'article', 'og:title': title, 'og:description': description, 'og:url': pageUrl,
    'twitter:title': title, 'twitter:description': description,
    ...(thread.image ? { 'og:image': thread.image, 'og:image:alt': 'Image from the discussion', 'twitter:image': thread.image, 'twitter:image:alt': 'Image from the discussion' } : {}),
  }
  const page = html
    .replace(/<base href="[^"]*"\s*\/>/, `<base href="${escapeHtml(base.startsWith('/') ? base : '../'.repeat(path.split('/').length - 1))}" />`)
    .replace(/(<meta (?:property|name)="([^"]+)" content=")[^"]*("\s*\/>)/g, (tag, start, key: string, end) => key in values ? start + escapeHtml(values[key]) + end : tag)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>\n    <link rel="canonical" href="${escapeHtml(pageUrl)}" />`)
  // The site card's size and type do not describe a member's picture.
  return thread.image ? page.replace(/\s*<meta property="og:image:(?:type|width|height)" content="[^"]*"\s*\/>/g, '') : page
}

function isThread(value: unknown): value is ForumPageThread {
  const thread = value as ForumPageThread | null
  return !!thread && typeof thread === 'object' && typeof thread.id === 'string' && /^[a-zA-Z0-9-]+$/.test(thread.id) && typeof thread.title === 'string' && typeof thread.category === 'string' && typeof thread.username === 'string' && typeof thread.excerpt === 'string'
    && (thread.image === null || (typeof thread.image === 'string' && /^https:\/\//.test(thread.image)))
}

/** The public thread list, or nothing when the API is unreachable: the site must still build without its community service. */
export async function fetchForumThreads(api: string, warn: (message: string) => void): Promise<ForumPageThread[]> {
  try {
    const response = await fetch(new URL('forum/pages.json', api.replace(/\/?$/, '/')), { signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    const body = (await response.json()) as { threads?: unknown }
    if (!Array.isArray(body.threads)) throw new Error('no thread list')
    return body.threads.filter(isThread)
  } catch (error) {
    warn(`Forum thread pages were skipped: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

/** Static pages for every public thread, plus robots.txt pointing crawlers at the Worker's sitemap. */
export function forumPages(api: string | undefined): Plugin {
  let config: ResolvedConfig
  return {
    name: 'modwerk-forum-pages',
    apply: 'build',
    enforce: 'post',
    configResolved(resolved) { config = resolved },
    async generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset') throw new Error('Missing built app HTML for forum pages.')
      const html = String(index.source)
      const sitemap = api ? new URL('forum/sitemap.xml', api.replace(/\/?$/, '/')).href : ''
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: 'User-agent: *\nAllow: /\n' + (sitemap ? 'Sitemap: ' + sitemap + '\n' : '') })
      if (!api) return
      for (const thread of await fetchForumThreads(api, message => this.warn(message))) {
        const page = forumThreadPageHtml(html, thread, config.base), canonical = threadPath(thread.id, thread.title), plain = threadPath(thread.id)
        this.emitFile({ type: 'asset', fileName: canonical + 'index.html', source: page })
        if (plain !== canonical) this.emitFile({ type: 'asset', fileName: plain + 'index.html', source: page })
      }
    },
  }
}
