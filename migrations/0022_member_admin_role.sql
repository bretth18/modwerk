-- Administrator role for a verified member account; granted only by the backend owner directly in D1.
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
