-- Support dialog opens and Ko-fi link clicks, counted like the other daily totals (no visitor or link is stored with them).
ALTER TABLE usage_daily ADD COLUMN support_opens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_daily ADD COLUMN support_clicks INTEGER NOT NULL DEFAULT 0;
-- The same totals per UTC hour ('YYYY-MM-DDTHH'), so the dashboard can show the hours of a week. Visitors here are
-- daily visitors counted in the hour of their first event that day, so an hour's visitors add up to the day's.
-- Totals only, kept for 14 days. The first count after deployment records usage_meta 'hourly_started'.
CREATE TABLE usage_hourly (
  hour TEXT PRIMARY KEY,
  visitors INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  configurations INTEGER NOT NULL DEFAULT 0,
  builds INTEGER NOT NULL DEFAULT 0,
  builds_failed INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  exports INTEGER NOT NULL DEFAULT 0,
  support_opens INTEGER NOT NULL DEFAULT 0,
  support_clicks INTEGER NOT NULL DEFAULT 0
);
