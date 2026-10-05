-- Every catalog module gets one forum thread, created by the server. Its author is this fixed system row,
-- which has no username, no sign-in and cannot be suspended.
INSERT OR IGNORE INTO users(id,display_name) VALUES('modwerk','Modwerk');
