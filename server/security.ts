import type { Env } from './platform'
export class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status } }
export function required(value: unknown, label: string, max = 2000): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new HttpError(400, label + ' is required (maximum ' + max + ' characters).')
  return value.trim()
}
/** Like `required`, but an absent or blank value is allowed and becomes ''. */
export function optional(value: unknown, label: string, max = 2000): string {
  return value === undefined || value === null || (typeof value === 'string' && !value.trim()) ? '' : required(value, label, max)
}
export function httpsUrl(value: unknown, label: string, githubOnly = false) {
  const text = required(value, label, 1000)
  let url: URL
  try { url = new URL(text) } catch { throw new HttpError(400, label + ' must be a valid HTTPS URL.') }
  if (url.protocol !== 'https:' || url.username || url.password || (githubOnly && url.hostname !== 'github.com')) throw new HttpError(400, label + (githubOnly ? ' must be a GitHub HTTPS URL.' : ' must use HTTPS.'))
  return url.href
}
export function sessionValue(request: Request) {
  const authorization = request.headers.get('Authorization')
  return authorization === null ? getCookie(request, 'octamod_session') : authorization.match(/^Bearer ([a-f0-9]{64})$/)?.[1] ?? ''
}
export function appOrigin(env: Env) {
  if (!env.APP_URL) throw new HttpError(503, 'The community service is not configured yet.')
  return new URL(env.APP_URL).origin
}
export function checkOrigin(request: Request, env: Env) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.get('Origin') !== appOrigin(env)) throw new HttpError(403, 'This request did not originate from Octamod.')
}
export async function boundedBody(request: Request, limit: number): Promise<ArrayBuffer> {
  if (Number(request.headers.get('content-length') ?? 0) > limit) throw new HttpError(413, 'This file or request is too large.')
  const reader = request.body?.getReader()
  if (!reader) return new ArrayBuffer(0)
  const chunks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) { await reader.cancel(); throw new HttpError(413, 'This file or request is too large.') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const joined = new Uint8Array(size); let position = 0
  for (const chunk of chunks) { joined.set(chunk, position); position += chunk.length }
  return joined.buffer
}
export async function jsonBody(request: Request, limit = 32 * 1024): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Send JSON for this request.')
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(await boundedBody(request, limit)))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value as Record<string, unknown>
  } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'The request is not valid JSON.') }
}
export function detectMedia(bytes: ArrayBuffer, declared: string) {
  const data = new Uint8Array(bytes)
  const text = (start: number, end: number) => String.fromCharCode(...data.slice(start, end))
  let mime = ''
  if (data.length > 24 && data[0] === 137 && text(1,4) === 'PNG' && data[4] === 13 && data[5] === 10 && data[6] === 26 && data[7] === 10) mime = 'image/png'
  else if (data.length > 4 && data[0] === 255 && data[1] === 216 && data[2] === 255) mime = 'image/jpeg'
  else if (data.length > 16 && text(0,4) === 'RIFF' && text(8,12) === 'WEBP') mime = 'image/webp'
  else if (data.length > 44 && text(0,4) === 'RIFF' && text(8,12) === 'WAVE') mime = 'audio/wav'
  else if (data.length > 32 && text(0,4) === 'OggS') mime = 'audio/ogg'
  else if (data.length > 10 && (text(0,3) === 'ID3' || (data[0] === 255 && (data[1] & 224) === 224))) mime = 'audio/mpeg'
  if (!mime || (declared && declared !== mime && !(mime === 'audio/wav' && declared === 'audio/x-wav'))) throw new HttpError(415, 'Only PNG, JPEG, WebP, WAV, MP3 or Ogg previews are accepted. Firmware and executable uploads are not accepted.')
  return { mime, kind: mime.startsWith('image/') ? 'image' as const : 'audio' as const }
}
export function token() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2,'0')).join('') }
export async function digest(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2,'0')).join('') }
export function getCookie(request: Request, name: string) { return request.headers.get('Cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.slice(name.length + 1) ?? '' }
export function cookie(name: string, value: string, env: Env, seconds: number) { return name + '=' + value + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + seconds + (appOrigin(env).startsWith('https:') ? '; Secure' : '') }
export function response(value: unknown, status = 200) { return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }) }
