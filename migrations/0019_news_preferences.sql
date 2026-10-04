-- Optional news consent is private and independent of account access.
CREATE TABLE account_news_preferences (
 user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 consent_version TEXT,
 changed_at TEXT NOT NULL
);
