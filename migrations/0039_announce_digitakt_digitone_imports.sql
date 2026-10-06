-- One-off: announce the seven Digitakt and Digitone modules imported in #173. The hourly release check did not announce them.
-- Keys, titles, messages and links are exactly what that automatic announcement writes (server/announcements.ts), so it cannot announce them again.
-- A database with no members (the system accounts have no username) has nobody to tell, so it gets none; a member who joins later never sees announcements sent before they joined.
WITH imported(slug,title,body,url,module_id) AS (VALUES
 ('module-release-ab7261f131ef4ec95c542dc8e86ef3fb67db496454cc5e1a','digichain is now available','digichain 1.6.0-experimental is now available. Open the module to explore its features and add it to your configuration.','#digitakt/module/digichain','digitakt-digichain'),
 ('module-release-442d9b8687fd3a4641a0f0a5ca91d668d17e326457ed9271','Digi EQ is now available','Digi EQ 1.0.0-experimental is now available. Open the module to explore its features and add it to your configuration.','#digitakt/module/digieq','digitakt-digieq'),
 ('module-release-c3acd1b1e9364e913558c57cdf8f9403b87b089d96d97363','Digi Matrix is now available','Digi Matrix 1.0.0-experimental is now available. Open the module to explore its features and add it to your configuration.','#digitakt/module/digimatrix','digitakt-digimatrix'),
 ('module-release-da04aac05f1ee3b8dee808769f5b46f594c65cbe1820a252','Digi Mono is now available','Digi Mono 0.13.0-experimental is now available. Open the module to explore its features and add it to your configuration.','#digitakt/module/digimono','digitakt-digimono'),
 ('module-release-384e7747c34eafe365be030e2a958dbdf1bc2865edca2f48','Digi Poly is now available','Digi Poly 2.0.0-experimental is now available. Open the module to explore its features and add it to your configuration.','#digitakt/module/digipoly','digitakt-digipoly'),
 ('module-release-be318f4b1bb5635a1c5d1b3607b9f729c87e17e654d4be60','Digi utilities is now available','Digi utilities 1.9.0-experimental is now available. Open the module to explore its features and add it to your configuration.','#digitakt/module/digiutils','digitakt-digiutils'),
 ('module-release-1123dc48c91fcc061e3b6be027e9a2625fb0736a10c2f7c0','digitables is now available','digitables 1.3.0-experimental is now available. Open the module to explore its features and add it to your configuration.','#digitone/module/digitables','digitone-digitables')
)
INSERT INTO announcements(id,slug,title,body,url,module_id,created_by)
SELECT lower(hex(randomblob(16))),slug,title,body,url,module_id,'administrator' FROM imported WHERE EXISTS(SELECT 1 FROM users WHERE username IS NOT NULL)
ON CONFLICT(slug) DO NOTHING;
