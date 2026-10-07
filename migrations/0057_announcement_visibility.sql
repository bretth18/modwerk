-- Preserve the audience of existing operator announcements until an admin changes it.
ALTER TABLE announcements ADD COLUMN visibility TEXT NOT NULL DEFAULT 'signed-in'
 CHECK(visibility IN ('public','signed-in'));

-- Automatic module releases contain public catalog information and are useful to visitors too.
UPDATE announcements SET visibility='public' WHERE slug LIKE 'module-release-%';
