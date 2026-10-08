-- Totals for public announcement cards from every viewer, members and signed-out visitors alike.
-- Only the announcement and a running count are stored: no member, device, IP or time of the action.
-- Removing an announcement removes its totals.
CREATE TABLE announcement_counts (
 announcement_id TEXT PRIMARY KEY REFERENCES announcements(id) ON DELETE CASCADE,
 shown INTEGER NOT NULL DEFAULT 0 CHECK(shown>=0),
 opened INTEGER NOT NULL DEFAULT 0 CHECK(opened>=0),
 dismissed INTEGER NOT NULL DEFAULT 0 CHECK(dismissed>=0)
);

-- Announcements sent earlier have no totals before this point; the admin list says so.
INSERT INTO usage_meta(key,value) VALUES('announcement_counts_started',strftime('%Y-%m-%dT%H:%M:%SZ','now')) ON CONFLICT DO NOTHING;
