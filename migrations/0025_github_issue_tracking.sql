-- GitHub is the one tracker for public bug reports. The site keeps the report's private details and mirrors
-- only what the reporter agreed to make public: device, module version, steps, expected and actual result.
ALTER TABLE issues ADD COLUMN public_json TEXT;
-- Earlier public forum reports already published exactly these details.
UPDATE issues SET public_json=(SELECT t.issue_json FROM forum_threads t WHERE t.id=issues.forum_thread_id) WHERE forum_thread_id IS NOT NULL;
CREATE INDEX issues_github_open ON issues(module_id,status) WHERE github_url IS NOT NULL;

-- GitHub activity on a mirrored report reaches its reporter through the bell and activity email.
-- SQLite cannot widen a CHECK constraint, so the table is rebuilt with the new kinds and columns.
CREATE TABLE notifications_v2 (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 kind TEXT NOT NULL CHECK(kind IN ('reply','mention','bug_report','post_like','module_comment','module_rating','module_like','issue_comment','issue_resolved','issue_closed','issue_reopened')),
 actor_id TEXT REFERENCES users(id),
 thread_id TEXT REFERENCES forum_threads(id),
 post_id TEXT REFERENCES forum_posts(id),
 module_id TEXT,
 comment_id TEXT,
 -- The mirrored report, the GitHub login that acted, a public comment excerpt and the webhook delivery,
 -- which makes redelivered events harmless.
 issue_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
 github_actor TEXT,
 excerpt TEXT,
 delivery_id TEXT,
 seen INTEGER NOT NULL DEFAULT 0 CHECK(seen IN (0,1)),
 emailed INTEGER NOT NULL DEFAULT 0 CHECK(emailed IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO notifications_v2(id,user_id,kind,actor_id,thread_id,post_id,module_id,comment_id,seen,emailed,created_at)
SELECT id,user_id,kind,actor_id,thread_id,post_id,module_id,comment_id,seen,emailed,created_at FROM notifications ORDER BY rowid;
DROP TABLE notifications;
ALTER TABLE notifications_v2 RENAME TO notifications;
CREATE INDEX notifications_user ON notifications(user_id,seen,created_at);
CREATE INDEX notifications_mail ON notifications(user_id,created_at) WHERE emailed=0;
CREATE INDEX notifications_comment ON notifications(comment_id) WHERE comment_id IS NOT NULL;
CREATE UNIQUE INDEX notifications_once ON notifications(user_id,kind,actor_id,COALESCE(post_id,module_id)) WHERE kind IN ('post_like','module_rating','module_like');
CREATE UNIQUE INDEX notifications_delivery ON notifications(user_id,delivery_id) WHERE delivery_id IS NOT NULL;
CREATE INDEX notifications_issue ON notifications(issue_id) WHERE issue_id IS NOT NULL;
