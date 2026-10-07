-- Refresh the existing bell item without announcing again or resetting read state.
UPDATE announcements SET url='https://discord.gg/vzfAdMBtn5'
 WHERE slug='development-discord-2026-10-07';

-- Only never-attempted messages may receive a new payload and provider retry key.
UPDATE member_welcome_mail SET template_version='modwerk-welcome-008'
 WHERE template_version IN ('modwerk-welcome-001','modwerk-welcome-002','modwerk-welcome-003',
 'modwerk-welcome-004','modwerk-welcome-005','modwerk-welcome-006','modwerk-welcome-007')
 AND state='pending' AND attempts=0 AND first_attempt_at IS NULL;
