-- Announcements from the operator, shown in every member's bell and never mailed.
-- One row per announcement, however many members there are; what each member has read is stored beside it.
-- A member sees announcements sent after their account was created.
CREATE TABLE announcements (
 id TEXT PRIMARY KEY,
 -- The operator's idempotency key: sending the same key twice is refused, so a double click cannot announce twice.
 slug TEXT NOT NULL UNIQUE CHECK(length(slug) BETWEEN 3 AND 64),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 3 AND 120),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 400),
 -- An app link (#module/...) or a modwerk.app address; the server accepts nothing else.
 url TEXT,
 module_id TEXT,
 created_by TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX announcements_recent ON announcements(created_at);

CREATE TABLE announcement_reads (
 user_id TEXT NOT NULL REFERENCES users(id),
 announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
 read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,announcement_id)
);
CREATE INDEX announcement_reads_announcement ON announcement_reads(announcement_id);
