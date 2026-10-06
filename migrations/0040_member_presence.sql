-- When a signed-in member's visible tab last polled the bell. One overwritten time per member, never a history;
-- the hourly cleanup removes it 31 days after the last visit, and account deletion removes it at once.
CREATE TABLE member_presence (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, seen_at INTEGER NOT NULL);
CREATE INDEX member_presence_seen ON member_presence(seen_at);
-- How many distinct members were seen on each UTC day. Counts only; no member is named. The deployment day is
-- seeded so the statistics know when counting began: earlier days are unknown, later quiet days are zero.
CREATE TABLE member_activity_daily (day TEXT PRIMARY KEY, members INTEGER NOT NULL DEFAULT 0);
INSERT INTO member_activity_daily(day,members) VALUES(date('now'),0);
