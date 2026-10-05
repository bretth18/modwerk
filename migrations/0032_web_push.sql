-- Device push is opt-in; signup events never enter the member bell.
CREATE TABLE push_subscriptions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 endpoint TEXT NOT NULL UNIQUE,
 p256dh TEXT NOT NULL,
 auth TEXT NOT NULL,
 vapid_key TEXT NOT NULL,
 activity INTEGER NOT NULL DEFAULT 0 CHECK(activity IN (0,1)),
 signups INTEGER NOT NULL DEFAULT 0 CHECK(signups IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX push_subscriptions_user ON push_subscriptions(user_id);
CREATE TABLE signup_events (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 username TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
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
CREATE INDEX push_deliveries_due ON push_deliveries(retry_at,locked_until);

-- Mark existing accepted accounts before installing fanout, so they never replay.
INSERT INTO signup_events(user_id,username) SELECT u.id,u.username FROM users u JOIN auth_users a ON a.id=u.id
WHERE u.username IS NOT NULL AND EXISTS(SELECT 1 FROM account_policy_acceptances p WHERE p.user_id=u.id);

-- Rules acceptance commits with account creation or completed social onboarding.
-- No historical accounts are replayed. The marker prevents repeat rule versions.
CREATE TRIGGER push_new_signup AFTER INSERT ON account_policy_acceptances
BEGIN
 INSERT OR IGNORE INTO signup_events(user_id,username)
 SELECT u.id,u.username FROM users u JOIN auth_users a ON a.id=u.id
 WHERE u.id=NEW.user_id AND u.username IS NOT NULL AND u.suspended=0;
END;
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
