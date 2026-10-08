import { SUPPORT_URL } from '../config/support'

/** The owner asked to link his existing Ko-fi on every reviewed module he authored. */
export function defaultCreatorSupport(author?: string): string {
  return author?.toLowerCase() === 'repeat98' ? SUPPORT_URL : ''
}

export type CreatorSupportData = { koFiUrl: string; canEdit: boolean }

/** Keep support links on Ko-fi; an empty value removes the module's link. */
export function koFiUrl(value: unknown): string {
  const message = 'Enter a Ko-fi page URL like https://ko-fi.com/yourname.'
  if (typeof value !== 'string') throw new Error(message)
  const text = value.trim()
  if (!text) return ''
  if (text.length > 1000 || /[\\\s]/.test(text) || [...text].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new Error(message)
  let url: URL
  try { url = new URL(text) } catch { throw new Error(message) }
  if (url.protocol !== 'https:' || !['ko-fi.com', 'www.ko-fi.com'].includes(url.hostname) || url.port || url.username || url.password || !/^\/[a-z0-9_-]+\/?$/i.test(url.pathname)) throw new Error(message)
  url.hostname = 'ko-fi.com'
  return url.href
}

/** Use the same panel URL as Ko-fi's official widget, without profile query or fragment overrides. */
export function koFiEmbedUrl(value: string): string {
  const href = koFiUrl(value)
  if (!href) return ''
  const url = new URL(href)
  url.pathname = url.pathname.replace(/\/?$/, '/')
  url.search = 'hidefeed=true&widget=true&embed=true'
  url.hash = ''
  return url.href
}
