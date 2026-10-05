-- Pin each queued welcome to its content so retries keep the same provider payload and key.
-- The previous Worker remains compatible while migrations run before deployment.
ALTER TABLE member_welcome_mail ADD COLUMN template_version TEXT NOT NULL DEFAULT 'modwerk-welcome-001';
