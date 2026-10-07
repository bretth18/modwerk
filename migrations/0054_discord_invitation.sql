-- A single invitation per verified account, shared by every browser and device.
CREATE TABLE member_discord_invites (
 user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
 shown_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Additive counters tolerate older Workers while frontend and API deployments finish.
ALTER TABLE usage_daily ADD COLUMN discord_member_shown INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_daily ADD COLUMN discord_member_joins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_daily ADD COLUMN discord_member_dismissals INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_daily ADD COLUMN discord_visitor_shown INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_daily ADD COLUMN discord_visitor_signups INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_daily ADD COLUMN discord_visitor_joins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_daily ADD COLUMN discord_visitor_dismissals INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_hourly ADD COLUMN discord_member_shown INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_hourly ADD COLUMN discord_member_joins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_hourly ADD COLUMN discord_member_dismissals INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_hourly ADD COLUMN discord_visitor_shown INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_hourly ADD COLUMN discord_visitor_signups INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_hourly ADD COLUMN discord_visitor_joins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_hourly ADD COLUMN discord_visitor_dismissals INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_daily ADD COLUMN discord_welcome_joins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_hourly ADD COLUMN discord_welcome_joins INTEGER NOT NULL DEFAULT 0;
INSERT OR IGNORE INTO usage_meta(key,value) VALUES('discord_invites_started',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
