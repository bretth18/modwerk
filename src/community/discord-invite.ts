import { post } from './api'

type Invitation = { show: boolean }
export const VISITOR_DISCORD_INVITE_KEY = 'modwerk.discord-invite.visitor'
const memberClaims = new Map<string, Promise<Invitation>>()
let visitorClaim: Promise<Invitation> | null = null

/** Share in-flight results across React's effect replay. The server atomically decides which device shows it. */
export function claimDiscordInvite(memberId: string | null): Promise<Invitation> {
  if (memberId) {
    const pending = memberClaims.get(memberId)
    if (pending) return pending
    const request = post<Invitation>('/auth/discord-invite', {}).catch(error => {
      memberClaims.delete(memberId)
      throw error
    })
    memberClaims.set(memberId, request)
    return request
  }
  if (!visitorClaim) {
    let show = true
    try {
      show = localStorage.getItem(VISITOR_DISCORD_INVITE_KEY) !== '1'
      if (show) localStorage.setItem(VISITOR_DISCORD_INVITE_KEY, '1')
    } catch { /* Without browser storage, the shared promise still limits it to this visit. */ }
    visitorClaim = Promise.resolve({ show })
  }
  return visitorClaim
}
