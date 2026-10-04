-- Browser-bound, single-use OAuth handoffs; never store a usable session in a URL.
CREATE TABLE social_flows (
 token_hash TEXT PRIMARY KEY, challenge_hash TEXT NOT NULL,
 provider TEXT NOT NULL CHECK(provider IN ('google','github','discord')),
 mode TEXT NOT NULL CHECK(mode IN ('login','register')),
 username TEXT, rules_version TEXT, newsletter INTEGER NOT NULL DEFAULT 0 CHECK(newsletter IN (0,1)), stage TEXT NOT NULL CHECK(stage IN ('pending','started','complete')),
 payload TEXT, expires INTEGER NOT NULL
);
CREATE INDEX social_flows_expiry ON social_flows(expires);
ALTER TABLE users ADD COLUMN profile_bio TEXT NOT NULL DEFAULT '';
