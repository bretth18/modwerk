-- Occasional news mail to members who opted in. One campaign row holds the subject and markdown body the
-- operator wrote; email addresses and rendered messages are never stored.
CREATE TABLE news_campaigns (
 id TEXT PRIMARY KEY,
 subject TEXT NOT NULL CHECK(length(subject) BETWEEN 3 AND 150),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 20000),
 template_version TEXT NOT NULL,
 created_by TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 -- When the operator queued it; the hourly sender works through the queue within NEWS_MAIL_DAILY_LIMIT.
 scheduled_at TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sending','sent','cancelled')),
 recipient_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX news_campaigns_recent ON news_campaigns(created_at);
-- One row per campaign and member, created when the campaign is queued from the members whose consent is
-- current at that moment, so a campaign reaches a member at most once. Consent, verification and suspension
-- are checked again at send time; a member who withdrew in between is skipped.
CREATE TABLE news_deliveries (
 campaign_id TEXT NOT NULL REFERENCES news_campaigns(id) ON DELETE CASCADE,
 member_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed','skipped')),
 attempted_at INTEGER,
 attempts INTEGER NOT NULL DEFAULT 0,
 -- The provider key for this campaign and member: a retried request cannot deliver the message twice.
 idempotency_key TEXT NOT NULL UNIQUE,
 PRIMARY KEY(campaign_id,member_id)
);
CREATE INDEX news_deliveries_queue ON news_deliveries(status,campaign_id,attempted_at);
-- News sends are counted beside account and activity mail, as totals per day only.
CREATE TABLE account_mail_daily_v4 (
 day TEXT NOT NULL, purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset','activity','welcome','news')),
 accepted INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, limited INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day,purpose)
);
INSERT INTO account_mail_daily_v4 SELECT day,purpose,accepted,failed,limited FROM account_mail_daily;
DROP TABLE account_mail_daily;
ALTER TABLE account_mail_daily_v4 RENAME TO account_mail_daily;
