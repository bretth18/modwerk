-- Current site presence, separate from historical member activity. No raw connection data is stored.
CREATE TABLE site_presence (
  visitor_hash TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  seen_at INTEGER NOT NULL
);
CREATE INDEX site_presence_seen ON site_presence(seen_at);
CREATE INDEX site_presence_user ON site_presence(user_id);
