/** Shared by the static page generators; all content is escaped before entering HTML. */
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

export function pageMetadataHtml(html: string, title: string, url: string, values: Record<string, string>) {
  return html
    .replace(/\s*<link rel="canonical" href="[^"]*"\s*\/>/g, '')
    .replace(/(<meta (?:property|name)="([^"]+)" content=")[^"]*("\s*\/>)/g, (tag, start, key: string, end) => key in values ? start + escapeHtml(values[key]) + end : tag)
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(title)}</title>\n    <link rel="canonical" href="${escapeHtml(url)}" />`)
}

/** Readable without the app; the blocking startup script hides it until createRoot replaces it. */
export function pageContentHtml(html: string, content: string) {
  return html.replace(/<div id="root">[\s\S]*?<\/div>/, () => `<div id="root"><main class="seo-content">${content}</main></div>`)
}

export const paragraph = (text: string) => `<p>${escapeHtml(text)}</p>`
export const list = (items: readonly string[], ordered = false) => items.length ? `<${ordered ? 'ol' : 'ul'}>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>` : ''
export const link = (href: string, label: string) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`
