-- Track completion of the first inventory separately from individual module writes.
-- A partial first poll can retry without announcing the rest of the historical library.
CREATE TABLE module_release_inventory (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 initialized_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Existing deployments have already baselined their live inventory.
INSERT INTO module_release_inventory(singleton)
SELECT 1 WHERE EXISTS(SELECT 1 FROM module_release_state);
