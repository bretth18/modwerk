import { post } from './api'
export function accountHref(mode: 'login' | 'register', next = 'forum') { return '#account/' + mode + '?next=' + encodeURIComponent(safeNext(next)) }
export function safeNext(value: string | null) { return value && value.length <= 500 && /^[a-z][a-z0-9_/?=&%-]*$/i.test(value) && !value.startsWith('account') && !value.startsWith('admin') ? value : 'forum' }
const nextKey = 'modwerk.account.next'
/** Registration remembers where it started, so the emailed verification link can return there once the member is signed in. */
export function rememberNext(next: string) { try { if (safeNext(next) === 'forum') localStorage.removeItem(nextKey); else localStorage.setItem(nextKey, safeNext(next)) } catch { /* The forum is the fallback. */ } }
export function takeNext(value: string | null) {
  let saved = ''
  try { saved = localStorage.getItem(nextKey) ?? ''; localStorage.removeItem(nextKey) } catch { /* The forum is the fallback. */ }
  return safeNext(value && safeNext(value) !== 'forum' ? value : saved)
}
/** Where a freshly verified member lands: the forum greets them, any other route opens as it is. */
export function welcomeHref(next: string) { const route = safeNext(next); return '#' + route + (route.startsWith('forum') ? (route.includes('?') ? '&' : '?') + 'welcome=1' : '') }
/** Authorize immediately before local composition; no firmware is transmitted. */
export async function requireBuildAccount() { await post('/auth/build-access', {}) }
