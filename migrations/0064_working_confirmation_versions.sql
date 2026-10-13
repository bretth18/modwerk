-- The catalog version remembers a quick button press without claiming that the
-- member tested that firmware version. Known downloaded versions remain separate.
ALTER TABLE module_working_reports ADD COLUMN catalog_version TEXT;

-- Recover existing quick confirmations from the deployed release history at the
-- time they were saved. Do not attach old confirmations to a later update.
UPDATE module_working_reports
 SET catalog_version=(SELECT version FROM module_releases
   WHERE module_id=module_working_reports.module_id
   AND detected_at<=module_working_reports.created_at
   ORDER BY detected_at DESC,rowid DESC LIMIT 1)
 WHERE module_version IS NULL AND source_post_id IS NULL;
UPDATE module_working_reports SET context_key='unknown:'||catalog_version
 WHERE context_key='unknown' AND catalog_version IS NOT NULL;
