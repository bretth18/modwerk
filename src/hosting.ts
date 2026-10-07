/** Public files follow the Pages project path; community API is a separate origin. */
export function assetUrl(path: string) { return (import.meta.env?.BASE_URL ?? '/') + path.replace(/^\//, '') }
export function communityBase(configured = import.meta.env.VITE_COMMUNITY_API_URL ?? '') {
  if (!configured) return '/api'
  const url = new URL(configured)
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/api' || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Community API must be an HTTPS URL ending in /api.')
  return url.href
}
export function apiUrl(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid community route.')
  return communityBase() + path
}

export function sourceRepository(configured = import.meta.env.VITE_REPOSITORY_URL ?? '') {
  if (!configured) return ''
  const url = new URL(configured)
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password || url.search || url.hash || !/^\/[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+\/?$/.test(url.pathname)) throw new Error('Configure the Octamod GitHub repository URL.')
  return url.href.replace(/\/$/, '')
}
