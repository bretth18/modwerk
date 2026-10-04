-- Claims require a GitHub-authenticated identity declared by the reviewed module metadata.
CREATE TABLE module_maintainers (
 module_id TEXT NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id),
 github_login TEXT NOT NULL,
 revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(module_id,user_id),
 UNIQUE(module_id,github_login COLLATE NOCASE)
);
CREATE TABLE developer_events (
 id TEXT PRIMARY KEY,
 actor_id TEXT NOT NULL REFERENCES users(id),
 module_id TEXT NOT NULL,
 issue_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
 action TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Old private reports never gain maintainer access through this migration.
ALTER TABLE issues ADD COLUMN maintainer_sharing INTEGER NOT NULL DEFAULT 0 CHECK(maintainer_sharing IN (0,1));
CREATE INDEX issues_maintainer_inbox ON issues(module_id,maintainer_sharing,status,created_at);
CREATE TABLE issue_replies (
 id TEXT PRIMARY KEY,
 issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id),
 body TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX issue_replies_thread ON issue_replies(issue_id,created_at);
CREATE TABLE developer_oauth_states (
 state_hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, browser_challenge TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE TABLE developer_auth_codes (
 code_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 browser_challenge TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE TABLE developer_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_hash TEXT NOT NULL, expires INTEGER NOT NULL
);
