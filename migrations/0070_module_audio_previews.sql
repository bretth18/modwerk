CREATE TABLE module_audio_previews (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  module_version TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  credit TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  duration REAL NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  published INTEGER NOT NULL DEFAULT 0,
  removed INTEGER NOT NULL DEFAULT 0,
  permission_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX module_audio_previews_module ON module_audio_previews(module_id, published, removed, created_at);
CREATE INDEX module_audio_previews_owner ON module_audio_previews(user_id, created_at);
