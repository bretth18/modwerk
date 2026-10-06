-- Following a module is independent of following its discussion. Reporters follow
-- releases of their reported module; the module button can stop that subscription.
CREATE TABLE module_update_subscriptions (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 module_id TEXT NOT NULL,
 after_version TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,module_id)
);
CREATE INDEX module_update_followers ON module_update_subscriptions(module_id);
INSERT INTO module_update_subscriptions(user_id,module_id)
SELECT DISTINCT i.reporter_id,i.module_id FROM issues i JOIN users u ON u.id=i.reporter_id JOIN auth_users a ON a.id=u.id
WHERE u.email_verified=1 AND a.emailVerified=1 AND u.suspended=0 AND u.username IS NOT NULL;
CREATE TABLE module_release_state (module_id TEXT PRIMARY KEY,version TEXT NOT NULL);
CREATE TABLE module_releases (
 module_id TEXT NOT NULL,
 version TEXT NOT NULL,
 name TEXT NOT NULL,
 href TEXT NOT NULL,
 detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(module_id,version)
);
ALTER TABLE notification_preferences ADD COLUMN updates INTEGER NOT NULL DEFAULT 1 CHECK(updates IN (0,1));
-- Keep webhook echoes that caused no status transition too, so later redelivery
-- cannot undo a newer local status. The report owns these internal delivery keys.
CREATE TABLE github_webhook_deliveries (
 id TEXT PRIMARY KEY,
 issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE
);
CREATE INDEX github_webhook_deliveries_issue ON github_webhook_deliveries(issue_id);
INSERT INTO github_webhook_deliveries(id,issue_id)
SELECT delivery_id,issue_id FROM notifications WHERE delivery_id IS NOT NULL AND issue_id IS NOT NULL;

-- Widen the notification kind constraint without losing device-delivery claims.
-- The child table must be saved first: dropping notifications would cascade it.
CREATE TABLE saved_push_deliveries AS SELECT * FROM push_deliveries;
DROP TABLE push_deliveries;
DROP TRIGGER push_signup_fanout;
DROP TRIGGER push_activity_fanout;
CREATE TABLE notifications_v3 (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 kind TEXT NOT NULL CHECK(kind IN ('reply','mention','bug_report','post_like','module_comment','module_rating','module_like','issue_comment','issue_resolved','issue_closed','issue_reopened','module_update')),
 actor_id TEXT REFERENCES users(id),
 thread_id TEXT REFERENCES forum_threads(id),
 post_id TEXT REFERENCES forum_posts(id),
 module_id TEXT,
 comment_id TEXT,
 issue_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
 github_actor TEXT,
 excerpt TEXT,
 delivery_id TEXT,
 module_version TEXT,
 seen INTEGER NOT NULL DEFAULT 0 CHECK(seen IN (0,1)),
 emailed INTEGER NOT NULL DEFAULT 0 CHECK(emailed IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO notifications_v3(id,user_id,kind,actor_id,thread_id,post_id,module_id,comment_id,issue_id,github_actor,excerpt,delivery_id,seen,emailed,created_at)
SELECT id,user_id,kind,actor_id,thread_id,post_id,module_id,comment_id,issue_id,github_actor,excerpt,delivery_id,seen,emailed,created_at FROM notifications ORDER BY rowid;
DROP TABLE notifications;
ALTER TABLE notifications_v3 RENAME TO notifications;
CREATE INDEX notifications_user ON notifications(user_id,seen,created_at);
CREATE INDEX notifications_mail ON notifications(user_id,created_at) WHERE emailed=0;
CREATE INDEX notifications_comment ON notifications(comment_id) WHERE comment_id IS NOT NULL;
CREATE UNIQUE INDEX notifications_once ON notifications(user_id,kind,actor_id,COALESCE(post_id,module_id)) WHERE kind IN ('post_like','module_rating','module_like');
CREATE UNIQUE INDEX notifications_delivery ON notifications(user_id,delivery_id) WHERE delivery_id IS NOT NULL;
CREATE INDEX notifications_issue ON notifications(issue_id) WHERE issue_id IS NOT NULL;
CREATE TABLE push_deliveries (
 id INTEGER PRIMARY KEY,
 subscription_id TEXT NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
 notification_id TEXT REFERENCES notifications(id) ON DELETE CASCADE,
 signup_id TEXT REFERENCES signup_events(user_id) ON DELETE CASCADE,
 attempts INTEGER NOT NULL DEFAULT 0,
 retry_at INTEGER NOT NULL DEFAULT 0,
 locked_until INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK((notification_id IS NULL) <> (signup_id IS NULL)),
 UNIQUE(subscription_id,notification_id),
 UNIQUE(subscription_id,signup_id)
);
INSERT INTO push_deliveries SELECT * FROM saved_push_deliveries;
DROP TABLE saved_push_deliveries;
CREATE INDEX push_deliveries_due ON push_deliveries(retry_at,locked_until);
CREATE TRIGGER push_signup_fanout AFTER INSERT ON signup_events
BEGIN
 INSERT OR IGNORE INTO push_deliveries(subscription_id,signup_id)
 SELECT s.id,NEW.user_id FROM push_subscriptions s JOIN users u ON u.id=s.user_id
 WHERE s.signups=1 AND u.is_admin=1 AND u.email_verified=1 AND u.suspended=0;
END;
CREATE TRIGGER push_activity_fanout AFTER INSERT ON notifications
BEGIN
 INSERT OR IGNORE INTO push_deliveries(subscription_id,notification_id)
 SELECT s.id,NEW.id FROM push_subscriptions s JOIN users u ON u.id=s.user_id
 WHERE s.activity=1 AND u.email_verified=1 AND u.suspended=0 AND
 (s.user_id=NEW.user_id OR EXISTS(SELECT 1 FROM auth_accounts g JOIN users d ON d.github_id=g.accountId
 WHERE g.userId=s.user_id AND g.providerId='github' AND d.id=NEW.user_id));
END;
