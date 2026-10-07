-- Members can hide their name from the public "members online" list; the count still includes them.
ALTER TABLE users ADD COLUMN show_online INTEGER NOT NULL DEFAULT 1 CHECK(show_online IN (0,1));
-- Profile counts and the newest-members highlight read by author and by sign-up time.
CREATE INDEX forum_threads_author ON forum_threads(user_id,hidden,created_at);
CREATE INDEX users_created ON users(created_at);
