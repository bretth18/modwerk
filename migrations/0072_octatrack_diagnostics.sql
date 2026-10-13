-- Private opt-in beta diagnostics. Account removal deletes both consent and events.
CREATE TABLE octatrack_diagnostic_consent (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  version TEXT NOT NULL,
  changed_at TEXT NOT NULL
);
CREATE TABLE octatrack_diagnostic_events (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,event_id)
);
CREATE INDEX octatrack_diagnostic_expiry ON octatrack_diagnostic_events(created_at);
-- Fixed action totals carry no account, device, module, session or event identifier.
CREATE TABLE octatrack_beta_daily (
  day TEXT NOT NULL,
  event TEXT NOT NULL CHECK(event IN ('usb_sync_started','usb_sync_kept','usb_sync_undone','usb_sync_failed')),
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,event)
);
