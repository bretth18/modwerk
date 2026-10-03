-- Structured issue reports: configuration context, the on-device OCTAMOD.LOG and the mirrored GitHub issue.
ALTER TABLE issues ADD COLUMN context_json TEXT;
ALTER TABLE issues ADD COLUMN log_missing TEXT;
ALTER TABLE issues ADD COLUMN log_missing_note TEXT NOT NULL DEFAULT '';
-- none: mirroring off; pending: queued; syncing: a request holds the claim; synced; failed: retry from the admin inbox.
ALTER TABLE issues ADD COLUMN github_state TEXT NOT NULL DEFAULT 'none' CHECK(github_state IN ('none','pending','syncing','synced','failed'));
ALTER TABLE issues ADD COLUMN github_number INTEGER;
ALTER TABLE issues ADD COLUMN github_url TEXT;
ALTER TABLE issues ADD COLUMN github_error TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS issues_github ON issues(github_number) WHERE github_number IS NOT NULL;
-- Validated OCTAMOD.LOG text (printable ASCII, at most 64 KiB) and its parsed summary.
CREATE TABLE IF NOT EXISTS issue_logs (issue_id TEXT PRIMARY KEY REFERENCES issues(id) ON DELETE CASCADE, text TEXT NOT NULL, bytes INTEGER NOT NULL, summary_json TEXT NOT NULL);
