-- Images and sound clips attached to forum posts. Files live in the MEDIA bucket under object_key.
-- An upload has no post until the thread or reply that uses it is published; unused uploads and
-- removed files (by their author, an administrator or account deletion) are purged from the bucket
-- and this table by the hourly job.
CREATE TABLE forum_media (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 post_id TEXT REFERENCES forum_posts(id),
 kind TEXT NOT NULL CHECK(kind IN ('image','audio')),
 mime TEXT NOT NULL,
 bytes INTEGER NOT NULL,
 caption TEXT NOT NULL DEFAULT '',
 object_key TEXT NOT NULL UNIQUE,
 position INTEGER NOT NULL DEFAULT 0,
 removed INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX forum_media_post ON forum_media(post_id,position) WHERE post_id IS NOT NULL;
CREATE INDEX forum_media_user ON forum_media(user_id,created_at);
CREATE INDEX forum_media_cleanup ON forum_media(removed,post_id,created_at);
