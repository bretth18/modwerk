import { post } from './api'
export function accountHref(mode: 'login' | 'register', next = 'forum') { return '#account/' + mode + '?next=' + encodeURIComponent(safeNext(next)) }
export function safeNext(value: string | null) { return value && value.length <= 500 && /^[a-z][a-z0-9_/?=&%-]*$/i.test(value) && !value.startsWith('account') && !value.startsWith('admin') ? value : 'forum' }
/** Authorize immediately before local composition; no firmware is transmitted. */
export async function requireBuildAccount() { await post('/auth/build-access', {}) }
