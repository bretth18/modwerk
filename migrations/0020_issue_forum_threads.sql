-- Only explicitly submitted public reports get a forum thread. Historical reports stay private.
ALTER TABLE issues ADD COLUMN forum_thread_id TEXT REFERENCES forum_threads(id);
CREATE UNIQUE INDEX issues_forum_thread ON issues(forum_thread_id) WHERE forum_thread_id IS NOT NULL;
