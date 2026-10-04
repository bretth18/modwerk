import { apiUrl } from '../hosting'
import { post } from './api'
import { safeNext } from './member-access'
export type SocialProvider = 'google' | 'github' | 'discord'
export const socialNames: Record<SocialProvider, string> = { google: 'Google', github: 'GitHub', discord: 'Discord' }
const storageKey = 'modwerk.social.pending'
async function hash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('') }
export async function startSocial(provider: SocialProvider, mode: 'login' | 'register', username: string, next: string) {
  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
  const pending = { verifier, next: safeNext(next), expires: Date.now() + 10 * 60 * 1000 }
  try { sessionStorage.setItem(storageKey, JSON.stringify(pending)) } catch { throw new Error('Enable browser storage to complete social sign-in.') }
  const result = await post<{url: string}>('/auth/sso', { provider, mode, username, challenge: await hash(verifier) })
  const url = new URL(result.url), apiOrigin = new URL(apiUrl('/auth/sso'), window.location.href).origin
  if (url.origin !== apiOrigin || !/^\/api\/auth\/sso\/start\/[a-f0-9]{64}$/.test(url.pathname)) throw new Error('The sign-in link was not accepted.')
  window.location.assign(url.href)
}
// Share one redemption across React StrictMode's repeated effect setup.
let redemption: {code: string; promise: Promise<string>} | undefined
export function finishSocial(code: string) {
  if (redemption?.code === code) return redemption.promise
  const promise = (async () => {
    let pending: {verifier: string; next: string; expires: number}
    try { pending = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') } catch { throw new Error('Start sign-in again in this browser tab.') }
    if (!pending || pending.expires < Date.now() || !/^[a-f0-9]{64}$/.test(pending.verifier)) throw new Error('This sign-in has expired. Start again in this browser tab.')
    await post('/auth/sso/exchange', { code, verifier: pending.verifier })
    sessionStorage.removeItem(storageKey)
    return safeNext(pending.next)
  })()
  redemption = { code, promise }
  return promise
}
