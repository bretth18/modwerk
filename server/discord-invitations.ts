import type { Database } from './platform'
import { DISCORD_INVITE_CAMPAIGN } from '../src/config/development-discord'

/** One atomic claim per account for the active round; signup reserves it for the inline welcome. */
export function discordInvitationClaim(db: Database, memberId: string) {
  return db.prepare(`INSERT INTO member_discord_invites(user_id,campaign) VALUES(?,?)
    ON CONFLICT(user_id) DO UPDATE SET campaign=excluded.campaign,shown_at=CURRENT_TIMESTAMP
    WHERE member_discord_invites.campaign<>excluded.campaign`).bind(memberId, DISCORD_INVITE_CAMPAIGN)
}
