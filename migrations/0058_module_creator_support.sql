CREATE TABLE module_creator_support (
 module_id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 ko_fi_url TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX module_creator_support_owner ON module_creator_support(user_id);
