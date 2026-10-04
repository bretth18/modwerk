-- Verified social identities remain private and inactive until signup is confirmed.
CREATE TABLE social_pending_accounts (
 user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
 expires INTEGER NOT NULL
);
CREATE INDEX social_pending_expiry ON social_pending_accounts(expires);
