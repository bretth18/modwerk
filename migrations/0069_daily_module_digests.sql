-- Module releases have their own daily batching window, independent of replies and messages.
ALTER TABLE notification_preferences ADD COLUMN last_module_digest_at TEXT;
-- Existing recipients wait a day after their last activity email during rollout.
UPDATE notification_preferences SET last_module_digest_at=last_digest_at;
