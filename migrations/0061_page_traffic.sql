-- Aggregate page counts only: no visitor, account, route, query or browsing history.
-- Pages are validated against a fixed catalog by both collectors; retained for 90 UTC days.
CREATE TABLE usage_page_daily (
  day TEXT NOT NULL,
  page TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, page)
);
