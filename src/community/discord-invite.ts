import { post } from './api'

type Invitation = { show: boolean }
export const VISITOR_DISCORD_INVITE_KEY = 'modwerk.discord-invite.visitor'
const memberClaims = new Map<string, Promise<Invitation>>()
let visitorClaim: Promise<Invitation> | null = null
let browserHandled = false
function wasHandledHere() {
  if (browserHandled) return true
  try { return localStorage.getItem(VISITOR_DISCORD_INVITE_KEY) === '1' } catch { return false }
}
function rememberHandledHere() {
  browserHandled = true
  try { localStorage.setItem(VISITOR_DISCORD_INVITE_KEY, '1') } catch { /* Keep this visit quiet when storage is unavailable. */ }
}

/** Share in-flight results across React's effect replay. The server atomically decides which device shows it. */
export function claimDiscordInvite(memberId: string | null): Promise<Invitation> {
  if (memberId) {
    const pending = memberClaims.get(memberId)
    if (pending) return pending
    const request = post<Invitation>('/auth/discord-invite', { alreadyShown: wasHandledHere() }).then(result => { rememberHandledHere(); return result }).catch(error => {
      memberClaims.delete(memberId)
      throw error
    })
    memberClaims.set(memberId, request)
    return request
  }
  if (!visitorClaim) {
    const show = !wasHandledHere()
    rememberHandledHere()
    visitorClaim = Promise.resolve({ show })
  }
  return visitorClaim
}
