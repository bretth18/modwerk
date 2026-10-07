-- Follow-up to 0049: the support announcement went out without a link. Point it to Ko-fi (the admin form only accepts app links, so this is set here) and adjust the sentence that sent members to the sidebar.
-- Members who already read it keep it read; the bell opens https links in a new tab.
UPDATE announcements SET
 url='https://ko-fi.com/jannikassfalg',
 body='Thank you for being part of Modwerk, it''s a lot of fun building this with you :)) It has real running costs now (hosting, storage, backend). I''m happy to keep covering them, but if you''d like to chip in, there''s a Ko-fi. Totally optional, everything stays free either way.'
WHERE slug='support-kofi-2026-10-07';
