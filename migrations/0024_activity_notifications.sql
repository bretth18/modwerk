-- One private notification store for the bell, the account and developer inboxes and activity email.
-- Rows point at public content; the recipient is the only member who can read them.
CREATE TABLE notifications (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 kind TEXT NOT NULL CHECK(kind IN ('reply','mention','bug_report','post_like','module_comment','module_rating','module_like')),
 actor_id TEXT REFERENCES users(id),
 thread_id TEXT REFERENCES forum_threads(id),
 post_id TEXT REFERENCES forum_posts(id),
 module_id TEXT,
 -- Module comments can be deleted; their notifications are removed with them.
 comment_id TEXT,
 seen INTEGER NOT NULL DEFAULT 0 CHECK(seen IN (0,1)),
 emailed INTEGER NOT NULL DEFAULT 0 CHECK(emailed IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX notifications_user ON notifications(user_id,seen,created_at);
CREATE INDEX notifications_mail ON notifications(user_id,created_at) WHERE emailed=0;
CREATE INDEX notifications_comment ON notifications(comment_id) WHERE comment_id IS NOT NULL;
-- Likes and ratings notify once per person and target, however often they are toggled.
CREATE UNIQUE INDEX notifications_once ON notifications(user_id,kind,actor_id,COALESCE(post_id,module_id)) WHERE kind IN ('post_like','module_rating','module_like');

-- Existing reply and bug notifications move over unchanged. They are marked emailed so the first digest
-- does not mail history.
INSERT INTO notifications(id,user_id,kind,actor_id,thread_id,post_id,module_id,seen,emailed,created_at)
SELECT n.id,n.user_id,
 CASE WHEN t.category='issues' AND p.id=(SELECT f.id FROM forum_posts f WHERE f.thread_id=n.thread_id ORDER BY f.created_at,f.rowid LIMIT 1) THEN 'bug_report' ELSE 'reply' END,
 p.user_id,n.thread_id,n.post_id,t.module_id,n.seen,1,n.created_at
FROM forum_notifications n JOIN forum_threads t ON t.id=n.thread_id JOIN forum_posts p ON p.id=n.post_id;
DROP TABLE forum_notifications;

-- Activity email is on by default; a missing row means the defaults below. Members can turn it off in
-- their account or with the unsubscribe link in every email.
CREATE TABLE notification_preferences (
 user_id TEXT PRIMARY KEY REFERENCES users(id),
 email_enabled INTEGER NOT NULL DEFAULT 1 CHECK(email_enabled IN (0,1)),
 frequency TEXT NOT NULL DEFAULT 'hours' CHECK(frequency IN ('hours','daily')),
 replies INTEGER NOT NULL DEFAULT 1 CHECK(replies IN (0,1)),
 likes INTEGER NOT NULL DEFAULT 1 CHECK(likes IN (0,1)),
 modules INTEGER NOT NULL DEFAULT 1 CHECK(modules IN (0,1)),
 bugs INTEGER NOT NULL DEFAULT 1 CHECK(bugs IN (0,1)),
 last_digest_at TEXT,
 changed_at TEXT
);

-- Activity digests are counted beside verification and recovery mail, without addresses or content.
CREATE TABLE account_mail_daily_v2 (
 day TEXT NOT NULL, purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset','activity')),
 accepted INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, limited INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day,purpose)
);
INSERT INTO account_mail_daily_v2 SELECT day,purpose,accepted,failed,limited FROM account_mail_daily;
DROP TABLE account_mail_daily;
ALTER TABLE account_mail_daily_v2 RENAME TO account_mail_daily;
