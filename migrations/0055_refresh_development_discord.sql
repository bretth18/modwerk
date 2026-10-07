-- Refresh the existing bell item without announcing again or resetting read state.
UPDATE announcements SET url='https://discord.gg/fe7Kjz5ZSd'
 WHERE slug='development-discord-2026-10-07';

-- Only messages that have never been attempted can change payload and retry key.
UPDATE member_welcome_mail SET template_version='modwerk-welcome-007'
 WHERE template_version='modwerk-welcome-006' AND state='pending'
 AND attempts=0 AND first_attempt_at IS NULL;
