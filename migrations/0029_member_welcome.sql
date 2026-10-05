-- One welcome after membership is complete; email addresses and content are not stored here.
CREATE TABLE member_welcome_mail (
 user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','accepted','existing','review')),
 lease_until INTEGER NOT NULL DEFAULT 0,
 retry_at INTEGER NOT NULL DEFAULT 0,
 first_attempt_at INTEGER,
 accepted_at INTEGER,
 attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX member_welcome_mail_pending ON member_welcome_mail(state,retry_at);
-- Existing completed members are excluded, including recipients of the first news send.
-- Incomplete signups can still receive their welcome once verification/onboarding finishes.
INSERT INTO member_welcome_mail(user_id,state)
 SELECT a.id,'existing' FROM auth_users a JOIN users u ON u.id=a.id
 WHERE a.emailVerified=1 AND NOT EXISTS(SELECT 1 FROM social_pending_accounts p WHERE p.user_id=a.id);

CREATE TABLE account_mail_daily_v3 (
 day TEXT NOT NULL, purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset','activity','welcome')),
 accepted INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, limited INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day,purpose)
);
INSERT INTO account_mail_daily_v3 SELECT day,purpose,accepted,failed,limited FROM account_mail_daily;
DROP TABLE account_mail_daily;
ALTER TABLE account_mail_daily_v3 RENAME TO account_mail_daily;
