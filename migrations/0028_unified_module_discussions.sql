-- Module-page comments become replies in the existing module forum thread.
-- The old table remains a read-only archive; all active reads and writes use forum_posts.
INSERT OR IGNORE INTO forum_threads(id,user_id,title,category,module_id,created_at,updated_at)
SELECT 'module-' || c.module_id,'modwerk',COALESCE(s.title,c.module_id) || ' discussion','modules',c.module_id,
 MIN(c.created_at),MAX(c.created_at)
FROM comments c LEFT JOIN module_publications m ON m.module_id=c.module_id
 LEFT JOIN submissions s ON s.id=m.submission_id GROUP BY c.module_id;

-- Keep the opening post before historical replies, including matching timestamps.
INSERT OR IGNORE INTO forum_posts(id,thread_id,user_id,body,created_at)
SELECT t.id,t.id,'modwerk','Share settings, questions, ideas and feedback about this module here.',
 MIN(t.created_at,COALESCE((SELECT MIN(c.created_at) FROM comments c WHERE c.module_id=t.module_id),t.created_at))
FROM forum_threads t WHERE t.id='module-' || t.module_id AND t.user_id='modwerk';
UPDATE forum_posts SET created_at=MIN(created_at,COALESCE((SELECT MIN(c.created_at) FROM comments c
 WHERE 'module-' || c.module_id=forum_posts.thread_id),created_at))
WHERE id=thread_id AND user_id='modwerk';
INSERT OR IGNORE INTO forum_posts(id,thread_id,user_id,body,created_at)
SELECT 'comment-' || id,'module-' || module_id,user_id,body,created_at FROM comments ORDER BY created_at,id;
UPDATE forum_threads SET created_at=MIN(created_at,COALESCE((SELECT MIN(c.created_at) FROM comments c
 WHERE 'module-' || c.module_id=forum_threads.id),created_at)),
 updated_at=MAX(updated_at,COALESCE((SELECT MAX(c.created_at) FROM comments c
 WHERE 'module-' || c.module_id=forum_threads.id),updated_at)) WHERE user_id='modwerk';
INSERT OR IGNORE INTO forum_follows(thread_id,user_id)
SELECT 'module-' || c.module_id,c.user_id FROM comments c JOIN users u ON u.id=c.user_id
WHERE u.email_verified=1 AND u.suspended=0;

-- Preserve notification state; forum visibility and links now govern these entries.
UPDATE notifications SET kind='reply',thread_id='module-' || module_id,
 post_id='comment-' || comment_id,comment_id=NULL
WHERE kind='module_comment' AND EXISTS(SELECT 1 FROM comments c WHERE c.id=notifications.comment_id);
