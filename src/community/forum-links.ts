/** Forum links are explicit web URLs; executable, local and credential-bearing URLs stay text. */
export function forumLink(value: string): string | undefined {
  if (Array.from(value).some(character=>character.charCodeAt(0)<=32||character.charCodeAt(0)===127)) return undefined
  try {
    const url = new URL(value)
    return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}

export type YouTubeVideo = { id: string; start: number }
const youTubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be'])
/** Start time in seconds from `t=90`, `t=1m30s` or `start=90`; anything else, or more than half a day, means the beginning. */
function startSeconds(value: string | null) {
  if (!value) return 0
  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
  const seconds = /^\d+$/.test(value) ? Number(value) : parts && (parts[1] || parts[2] || parts[3]) ? Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0) : 0
  return seconds < 43200 ? seconds : 0
}
/** The video behind a YouTube watch, share, Shorts, live or embed link. Playlists, channels and every other host stay ordinary links. */
export function youTubeVideo(value: string): YouTubeVideo | undefined {
  const href = forumLink(value.trim())
  if (!href) return undefined
  const url = new URL(href)
  if (!youTubeHosts.has(url.hostname) || url.port) return undefined
  const [first, second] = url.pathname.split('/').filter(Boolean)
  const id = url.hostname.endsWith('youtu.be') ? first : first === 'watch' ? url.searchParams.get('v') : ['shorts', 'embed', 'live', 'v'].includes(first) ? second : undefined
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? { id, start: startSeconds(url.searchParams.get('t') ?? url.searchParams.get('start')) } : undefined
}
/** The first YouTube link in plain text such as a chat message, ignoring punctuation that ends a sentence. */
export function firstYouTubeVideo(text: string) {
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    const video = youTubeVideo(match[0].replace(/[.,;:!?)\]]+$/, ''))
    if (video) return video
  }
  return undefined
}
