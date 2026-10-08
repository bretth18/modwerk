-- Working confirmations are per tested module. Companion modules are context only.
CREATE TABLE module_working_reports (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 module_id TEXT NOT NULL,
 context_key TEXT NOT NULL,
 machine TEXT,
 os TEXT,
 module_version TEXT,
 build_json TEXT CHECK(build_json IS NULL OR json_valid(build_json)),
 source_post_id TEXT UNIQUE REFERENCES forum_posts(id) ON DELETE CASCADE,
 context_pending INTEGER NOT NULL DEFAULT 0 CHECK(context_pending IN(0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,module_id,context_key)
);
CREATE INDEX module_working_reports_module ON module_working_reports(module_id,user_id);
CREATE INDEX module_working_reports_pending ON module_working_reports(context_pending) WHERE context_pending=1;

-- Preserve existing reports, including their original dates. Their saved Markdown
-- remains the source for machine/OS/build metadata, normalized in bounded batches.
INSERT INTO module_working_reports(id,user_id,module_id,context_key,source_post_id,context_pending,created_at)
 SELECT 'forum-'||p.id,p.user_id,t.module_id,'forum-'||p.id,p.id,1,p.created_at
 FROM forum_posts p JOIN forum_threads t ON t.id=p.thread_id
 WHERE t.id='module-'||t.module_id AND p.id<>t.id AND p.hidden<2
 AND p.body GLOB '[*][*]Works on my ?*[*][*]*';

-- Manual forum reports still count. Editing or deleting their source invalidates
-- its saved metadata; hiding a report keeps the record but excludes its count.
CREATE TRIGGER working_report_post_insert AFTER INSERT ON forum_posts
 WHEN NEW.hidden<2 AND NEW.body GLOB '[*][*]Works on my ?*[*][*]*'
 BEGIN
 INSERT INTO module_working_reports(id,user_id,module_id,context_key,source_post_id,context_pending,created_at)
 SELECT 'forum-'||NEW.id,NEW.user_id,t.module_id,'forum-'||NEW.id,NEW.id,1,NEW.created_at
 FROM forum_threads t WHERE t.id=NEW.thread_id AND t.id='module-'||t.module_id AND NEW.id<>t.id;
 END;
CREATE TRIGGER working_report_post_edit AFTER UPDATE OF body ON forum_posts
 BEGIN
 DELETE FROM module_working_reports WHERE source_post_id=NEW.id;
 INSERT INTO module_working_reports(id,user_id,module_id,context_key,source_post_id,context_pending,created_at)
 SELECT 'forum-'||NEW.id,NEW.user_id,t.module_id,'forum-'||NEW.id,NEW.id,1,NEW.created_at
 FROM forum_threads t WHERE t.id=NEW.thread_id AND t.id='module-'||t.module_id AND NEW.id<>t.id
 AND NEW.hidden<2 AND NEW.body GLOB '[*][*]Works on my ?*[*][*]*';
 END;
CREATE TRIGGER working_report_post_delete AFTER UPDATE OF hidden ON forum_posts
 WHEN NEW.hidden=2
 BEGIN DELETE FROM module_working_reports WHERE source_post_id=NEW.id; END;
