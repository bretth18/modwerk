-- Keep the deployed version's changelog for digests delayed by member preferences or mail quotas.
-- Nullable so releases recorded before changelogs were published remain readable.
ALTER TABLE module_releases ADD COLUMN notes TEXT;
