-- Failed local builds, counted like successful ones.
ALTER TABLE usage_daily ADD COLUMN builds_failed INTEGER NOT NULL DEFAULT 0;
-- Builds, failed builds and firmware download requests per machine and UTC day. Totals only: no visitor,
-- configuration or module is stored with them. Kept for 90 days like the other daily totals.
CREATE TABLE usage_device_daily (
  day TEXT NOT NULL,
  device TEXT NOT NULL CHECK(device IN ('octatrack','digitakt','digitone')),
  builds INTEGER NOT NULL DEFAULT 0,
  builds_failed INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,device)
);
-- Module download requests per UTC day for weekly trends; lifetime totals stay in module_downloads. Kept for 90 days.
CREATE TABLE module_downloads_daily (day TEXT NOT NULL, module_id TEXT NOT NULL, downloads INTEGER NOT NULL DEFAULT 0 CHECK(downloads>=0), PRIMARY KEY(day,module_id));
-- The first count after deployment records when these breakdowns began (usage_meta 'breakdowns_started',
-- module_download_meta 'daily_started'): earlier days have no failed builds, machines or daily module counts.
