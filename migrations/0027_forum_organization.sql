-- Keep the existing category CHECK and all thread foreign keys intact.
-- Additional sections use the legacy general category underneath.
ALTER TABLE forum_threads ADD COLUMN section TEXT
 CHECK(section IS NULL OR section IN ('introductions','showcase','requests','tutorials'));
CREATE INDEX forum_threads_section ON forum_threads(section,hidden,updated_at);
CREATE INDEX forum_posts_recent ON forum_posts(hidden,created_at);

CREATE TABLE forum_shouts (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 600),
 hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, edited_at TEXT
);
CREATE INDEX forum_shouts_recent ON forum_shouts(hidden,created_at);
CREATE INDEX forum_shouts_user ON forum_shouts(user_id);
CREATE TABLE forum_shout_reports (
 id TEXT PRIMARY KEY, shout_id TEXT NOT NULL REFERENCES forum_shouts(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id),
 reason TEXT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0 CHECK(resolved IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(shout_id,user_id)
);
