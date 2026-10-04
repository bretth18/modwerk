-- Agreement to community rules is separate from optional usage consent.
-- Existing members are not retroactively recorded as having accepted new rules.
CREATE TABLE account_policy_acceptances (
 user_id TEXT NOT NULL REFERENCES users(id), version TEXT NOT NULL,
 accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,version)
);
