-- Verified visitor accounts replace guest participation. Historical attribution remains.
CREATE TABLE accounts (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 verified_at INTEGER NOT NULL,
 newsletter INTEGER NOT NULL DEFAULT 0 CHECK(newsletter IN (0,1)),
 newsletter_changed_at INTEGER NOT NULL
);
CREATE TABLE auth_challenges (
 id TEXT PRIMARY KEY, email TEXT NOT NULL, code_hash TEXT NOT NULL,
 purpose TEXT NOT NULL CHECK(purpose IN ('signup','signin','delete')),
 display_name TEXT NOT NULL DEFAULT '', newsletter INTEGER NOT NULL DEFAULT 0 CHECK(newsletter IN (0,1)),
 user_id TEXT, expires INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX auth_challenges_expiry ON auth_challenges(expires);
-- A guest token must never authenticate a verified account or claim its history.
DELETE FROM sessions;
