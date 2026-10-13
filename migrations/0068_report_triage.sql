-- Existing reports start untriaged. Closed history has no inferred outcome or confirmation.
ALTER TABLE issues ADD COLUMN triage_state TEXT NOT NULL DEFAULT 'untriaged'
  CHECK(triage_state IN ('untriaged','needs_info','investigating','confirmed','awaiting_verification'));
ALTER TABLE issues ADD COLUMN report_kind TEXT NOT NULL DEFAULT 'bug' CHECK(report_kind IN ('bug','question','feature'));
ALTER TABLE issues ADD COLUMN closure_reason TEXT
  CHECK(closure_reason IN ('fixed','configuration','duplicate','not_reproducible','insufficient_information','withdrawn'));
ALTER TABLE issues ADD COLUMN triage_note TEXT NOT NULL DEFAULT '';
ALTER TABLE issues ADD COLUMN closure_note TEXT NOT NULL DEFAULT '';
-- NULL means applicability is unknown, not that the current release is unaffected.
ALTER TABLE issues ADD COLUMN affected_version TEXT;
ALTER TABLE issues ADD COLUMN confirmed_at TEXT;
ALTER TABLE issues ADD COLUMN triaged_at TEXT;
CREATE TABLE issue_triage_events (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  github_login TEXT,
  triage_state TEXT NOT NULL,
  report_kind TEXT NOT NULL,
  affected_version TEXT,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX issue_triage_history ON issue_triage_events(issue_id,created_at);
