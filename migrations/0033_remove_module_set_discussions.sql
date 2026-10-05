-- Module sets are configurations, not separate modules. Retain history privately.
INSERT OR IGNORE INTO forum_moderation(id,actor_id,target,action,reason)
SELECT 'remove-set-discussion-' || id,'administrator',id,'hidden:1','Owner requested removal of automatic module set discussions.'
FROM forum_threads
WHERE user_id='modwerk' AND id='module-' || module_id AND module_id GLOB 'remix-*' AND hidden=0;
UPDATE forum_threads SET hidden=1,locked=1
WHERE user_id='modwerk' AND id='module-' || module_id AND module_id GLOB 'remix-*';
