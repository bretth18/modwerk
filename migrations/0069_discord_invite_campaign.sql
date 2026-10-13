-- Keep existing claims and tolerate older Workers while the resend is deployed.
-- The current Worker upgrades a claim atomically only for its approved campaign.
ALTER TABLE member_discord_invites ADD COLUMN campaign TEXT NOT NULL
 DEFAULT 'development-discord-2026-10-07';
