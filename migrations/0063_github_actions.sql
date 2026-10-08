-- Receipts contain identities and hashes, never report text, logs or credentials.
CREATE TABLE github_actions (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issues(id),
  actor TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  published_hash TEXT,
  lease_token TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
