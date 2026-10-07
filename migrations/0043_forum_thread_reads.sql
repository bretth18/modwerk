-- The newest post a member has seen in each thread, written once per thread page view and never moved backwards.
-- Threads a member has not opened count as unread only for posts after they joined (or after "Mark all as read").
-- Account deletion removes the rows at once.
CREATE TABLE forum_thread_reads (
 member_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, thread_id TEXT NOT NULL REFERENCES forum_threads(id),
 last_read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_read_post_id TEXT REFERENCES forum_posts(id),
 PRIMARY KEY(member_id,thread_id)
);
-- Unread checks look a member's marker up by thread; the primary key serves that and the "all read markers of a
-- member" sweep. The post lookup behind each marker is by post ID.
CREATE INDEX forum_thread_reads_post ON forum_thread_reads(last_read_post_id) WHERE last_read_post_id IS NOT NULL;
-- One row per member for the forum home: when the forum was last opened (seen_at, rewritten at most every two
-- minutes), when the visit before that ended (last_visit_at, the "since your last visit" point) and the
-- "Mark all as read" watermark (all_read_at), before which no post counts as unread.
CREATE TABLE forum_visits (
 member_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 seen_at TEXT NOT NULL, last_visit_at TEXT, all_read_at TEXT
);
-- "New threads since your last visit" and the followed-thread counts scan by creation time and by follower.
CREATE INDEX IF NOT EXISTS forum_threads_created ON forum_threads(hidden,created_at);
CREATE INDEX IF NOT EXISTS forum_follows_user ON forum_follows(user_id);
