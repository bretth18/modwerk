-- One-off: tell every member about the optional Ko-fi support entry, with the same row the admin Announcements form writes (server/announcements.ts).
-- A database with no members has nobody to tell, so it gets none; a member who joins later never sees announcements sent before they joined.
INSERT INTO announcements(id,slug,title,body,url,module_id,created_by)
SELECT lower(hex(randomblob(16))),'support-kofi-2026-10-07','A little support for Modwerk 💛','Thank you for being part of Modwerk, it''s a lot of fun building this with you :)) It has real running costs now (hosting, storage, backend). I''m happy to keep covering them, but if you''d like to chip in, you''ll find "Support Modwerk" in the sidebar. Totally optional, everything stays free either way.',NULL,NULL,'administrator'
WHERE EXISTS(SELECT 1 FROM users WHERE username IS NOT NULL)
ON CONFLICT(slug) DO NOTHING;
