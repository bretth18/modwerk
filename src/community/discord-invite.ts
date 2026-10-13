import { post } from './api'
import { DISCORD_INVITE_CAMPAIGN } from '../config/development-discord'

type Invitation = { show: boolean }
/** Old rounds remain stored; only this approved invitation round suppresses the resend. */
export const VISITOR_DISCORD_INVITE_KEY = 'modwerk.discord-invite.visitor:' + DISCORD_INVITE_CAMPAIGN
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
  const request = post<Invitation & { campaign: string }>('/auth/discord-invite', { campaign: DISCORD_INVITE_CAMPAIGN, alreadyShown: discordInviteHandledHere() }).then(result => {
    // A frontend deployed before its Worker must not consume the new browser marker.
    if (result.campaign !== DISCORD_INVITE_CAMPAIGN) throw new Error('The Discord invitation update is not available yet.')
    rememberDiscordInviteHere()
    return { show: result.show }
  }).catch(error => {
    memberClaims.delete(memberId)
    throw error
  })
  memberClaims.set(memberId, request)
  return request
}
