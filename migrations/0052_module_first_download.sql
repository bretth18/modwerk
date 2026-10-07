-- When a module was first downloaded. The library's stability grade counts time in real use from it, the same way
-- for every machine, since only the Octatrack catalog records when a module was added.
ALTER TABLE module_downloads ADD COLUMN first_download_at TEXT;
-- Earlier downloads: the first retained daily count, else the start of daily counts or of collection. Each is
-- on or after the true first download, so a module never looks longer in use than it has been.
UPDATE module_downloads SET first_download_at=COALESCE(
 (SELECT MIN(day) FROM module_downloads_daily d WHERE d.module_id=module_downloads.module_id),
 (SELECT substr(value,1,10) FROM module_download_meta WHERE key='daily_started'),
 (SELECT substr(value,1,10) FROM module_download_meta WHERE key='collection_started'));
