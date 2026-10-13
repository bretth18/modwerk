-- A recent sign-out suppresses an older bell poll, avoiding member + guest double counting.
-- These links have the same short retention as the presence row; they are not activity history.
ALTER TABLE site_presence ADD COLUMN signed_out_user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE site_presence ADD COLUMN signed_out_at INTEGER;
CREATE INDEX site_presence_signed_out_user ON site_presence(signed_out_user_id);
