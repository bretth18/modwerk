-- A member's role, shown on profiles and posts. 'developer' is granted by an administrator here and is also earned at
-- read time by a confirmed module maintainer claim; 'owner' is assigned only by this migration, never through the API.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','developer','owner'));
-- The site owner is GitHub account 67785539 (repeat98): its developer identity, the member signed in through it, or
-- the administrator named repeat98. Matching the username alone would let anyone who registered it claim the role.
UPDATE users SET role='owner' WHERE github_id='67785539'
  OR id IN (SELECT userId FROM auth_accounts WHERE providerId='github' AND accountId='67785539')
  OR (username='repeat98' AND is_admin=1);
