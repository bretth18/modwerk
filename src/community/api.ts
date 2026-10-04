import { apiUrl, communityBase } from '../hosting'
const sessionKey = () => 'octamod.community.session:' + communityBase()
const adminKey = () => 'octamod.community.admin:' + communityBase()
let memorySession: { key: string; value: string } | null = null
function savedSession() { if (memorySession?.key === sessionKey()) return memorySession.value; try { return localStorage.getItem(sessionKey()) ?? '' } catch { return '' } }
function savedAdmin() { try { return sessionStorage.getItem(adminKey()) ?? '' } catch { return '' } }
/** Administrator sessions are separate from visitor identity and last only for this tab. */
export function setAdminSession(value: string) { try { if (value) sessionStorage.setItem(adminKey(), value); else sessionStorage.removeItem(adminKey()) } catch { throw new Error('Your browser could not keep the administrator session for this tab.') } }
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers), session = savedSession()
  if (/^[a-f0-9]{64}$/.test(session)) headers.set('Authorization', 'Bearer ' + session)
  const admin = savedAdmin()
  if (/^[a-f0-9]{64}$/.test(admin)) headers.set('X-Octamod-Admin', admin)
  let result: Response
  try { result = await fetch(apiUrl(path), { ...options, headers, credentials: 'same-origin', redirect: 'error' }) }
  catch { throw new Error('Community services are not connected yet. Your local workspace still works.') }
  const next = result.headers.get('X-Octamod-Session')
  if (result.ok && next !== null && (next === '' || /^[a-f0-9]{64}$/.test(next))) {
    memorySession = { key: sessionKey(), value: /^[a-f0-9]{64}$/.test(next) ? next : '' }
    try { if (/^[a-f0-9]{64}$/.test(next)) localStorage.setItem(sessionKey(), next); else if (next === '') localStorage.removeItem(sessionKey()); memorySession = null }
    catch { /* Keep this verified session in memory when site storage is unavailable. */ }
  }
  if (result.status === 401) { if (savedSession() === session) { memorySession = { key: sessionKey(), value: '' }; try { localStorage.removeItem(sessionKey()); memorySession = null } catch { /* Storage is optional. */ } } window.dispatchEvent(new Event('octamod-session-expired')) }
  return result
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const result = await apiFetch(path, options)
  let body: T & { error?: string }
  try { body = await result.json() as T & { error?: string } }
  catch { throw new Error('Community services are not connected yet. Your local workspace still works.') }
  if (!result.ok) throw new Error(body.error ?? 'The request could not be completed.')
  return body
}
export function post<T>(path: string, body: unknown, method = 'POST') { return api<T>(path, { method, headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) }) }
export type CommunityUser = { id: string; displayName: string; email: string; newsletter: boolean }
export type Session = { available: boolean; emailAvailable: boolean; admin: boolean; user: CommunityUser | null }
export type PublicMedia = { id: string; kind: 'image' | 'audio'; caption: string; capture_type: string }
export type PublishedModule = { module_id: string; title: string; repository_url: string; description: string; usage: string; resource_notes: string; test_report_url: string; reviewed_at: string; added_at?: string | null; author: string }
