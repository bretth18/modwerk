import { post } from './api'

type Invitation = { show: boolean }
/** Set once this browser has shown a Discord invitation: the former visitor popup, a public Discord card or a member claim. */
export const VISITOR_DISCORD_INVITE_KEY = 'modwerk.discord-invite.visitor'
let visitorClaim: Promise<Invitation> | null = null
const memberClaims = new Map<string, Promise<Invitation>>()
let browserHandled = false
export function discordInviteHandledHere() {
  if (browserHandled) return true
  try { return localStorage.getItem(VISITOR_DISCORD_INVITE_KEY) === '1' } catch { return false }
}
export function rememberDiscordInviteHere() {
  browserHandled = true
  try { localStorage.setItem(VISITOR_DISCORD_INVITE_KEY, '1') } catch { /* Keep this visit quiet when storage is unavailable. */ }
}

/** Share in-flight results across React's effect replay. The server atomically decides which device shows it. */
export function claimDiscordInvite(memberId: string | null): Promise<Invitation> {
  if (!memberId) {
    if (!visitorClaim) {
      const show = !discordInviteHandledHere()
      rememberDiscordInviteHere()
      visitorClaim = Promise.resolve({ show })
    }
    return visitorClaim
  }
  const pending = memberClaims.get(memberId)
  if (pending) return pending
  const request = post<Invitation>('/auth/discord-invite', { alreadyShown: discordInviteHandledHere() }).then(result => { rememberDiscordInviteHere(); return result }).catch(error => {
    memberClaims.delete(memberId)
    throw error
  })
  memberClaims.set(memberId, request)
  return request
}
