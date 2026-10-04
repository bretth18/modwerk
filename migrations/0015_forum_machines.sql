-- Threads can name the Elektron machine they are about; existing threads stay general (NULL).
ALTER TABLE forum_threads ADD COLUMN machine TEXT;
CREATE INDEX forum_threads_machine ON forum_threads(machine,hidden,updated_at);
