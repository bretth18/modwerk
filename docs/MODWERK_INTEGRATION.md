# Combined Modwerk release

The dedicated `codex/modwerk-release` branch consolidates 24 Modwerk launch PRs (#64 and #68–#90) into [release PR #91](https://github.com/repeat98/octamod/pull/91) against `main`. It builds on `codex/modwerk-integration` and includes every source PR head in its ancestry, preserving authorship and the existing account reconciliation. The source PRs are superseded by the combined release PR; owner approval, production setup and release gates still apply.

Per the owner's instruction on 4 October 2026, all further Modwerk release fixes and validation must be committed to `codex/modwerk-release` and PR #91 until the release is ready. Do not open separate PRs for that release work. The earlier integration branch is historical review context.

## Integrated pull requests

| PR | Branch | Included commit | Work |
| --- | --- | --- | --- |
| [#64](https://github.com/repeat98/octamod/pull/64) | `codex/forum-accounts` | `11c175df00b1` | Add forum draft with verified email accounts |
| [#68](https://github.com/repeat98/octamod/pull/68) | `modwerk/sdk-standard` | `7f4e378f7acf` | Modwerk 1/4: one SDK standard for every Elektron machine |
| [#69](https://github.com/repeat98/octamod/pull/69) | `modwerk/import-digi-mods` | `bba6ff232f7c` | Modwerk 2/4: import the existing Digitakt and Digitone mods |
| [#70](https://github.com/repeat98/octamod/pull/70) | `modwerk/machines-ui` | `f3e96c2c68ad` | Modwerk 3/4: every Elektron machine in the app |
| [#71](https://github.com/repeat98/octamod/pull/71) | `modwerk/forum-machines` | `4cf209c272e9` | Modwerk 4/4: machine sections in the forum |
| [#72](https://github.com/repeat98/octamod/pull/72) | `modwerk/elemod-engine` | `503c7db2fb73` | Modwerk: local Digitakt and Digitone build engine |
| [#73](https://github.com/repeat98/octamod/pull/73) | `codex/modwerk-social-preview` | `4278600506fc` | Add custom Three.js Modwerk sharing artwork |
| [#74](https://github.com/repeat98/octamod/pull/74) | `codex/modwerk-source-builds` | `a2b2e05e9734` | Modwerk: isolated source compilation and local module recipes |
| [#75](https://github.com/repeat98/octamod/pull/75) | `codex/modwerk-core-foundation` | `150fa7d40cdb` | Modwerk: original boot copier and core ABI foundation |
| [#76](https://github.com/repeat98/octamod/pull/76) | `claude/elektron-thumbnail-redesign-btzzfu` | `0dad6c08a09e` | Add Modwerk mark and four-feature link preview |
| [#77](https://github.com/repeat98/octamod/pull/77) | `codex/modwerk-digi-firmware-import` | `4f18e7ab2640` | Modwerk: verified local Digitakt and Digitone firmware import |
| [#78](https://github.com/repeat98/octamod/pull/78) | `codex/modwerk-core-ui-hooks` | `414acbf4dafb` | Modwerk: original core UI event adapters and development probes |
| [#79](https://github.com/repeat98/octamod/pull/79) | `modwerk/domain-mail` | `3cdaa07b1ceb` | Prepare the modwerk.app domain and account mail |
| [#80](https://github.com/repeat98/octamod/pull/80) | `codex/mobile-machine-menu` | `842bb9805c49` | Combine mobile machine selection with aligned library tabs |
| [#81](https://github.com/repeat98/octamod/pull/81) | `codex/modwerk-faq-submission` | `7633815f9ff8` | Update FAQ and module submissions for Modwerk |
| [#82](https://github.com/repeat98/octamod/pull/82) | `codex/modwerk-forum-developers` | `791336a01714` | Modwerk: machine-aware forum and GitHub developer workspace |
| [#83](https://github.com/repeat98/octamod/pull/83) | `codex/modwerk-core-settings-render` | `ca24e4d1304e` | Modwerk: original SETTINGS/render core adapters (frozen) |
| [#84](https://github.com/repeat98/octamod/pull/84) | `codex/all-machines-library-parity` | `f137471d02be` | Restore All machines controls and activate Modwerk branding |
| [#85](https://github.com/repeat98/octamod/pull/85) | `codex/modwerk-vendor-elekloader` | `4e782ebd473a` | Modwerk: build Digitakt/Digitone firmware with the vendored elekloader builder |
| [#87](https://github.com/repeat98/octamod/pull/87) | `codex/german-data-compliance` | `2f9394f2e9b1` | German/EU privacy safeguards, optional counts and account rights |
| [#88](https://github.com/repeat98/octamod/pull/88) | `codex/modwerk-sso` | `63768d57bcce` | Social sign-in, profile controls and member-only builds |
| [#89](https://github.com/repeat98/octamod/pull/89) | `codex/verified-developer-workspace` | `85503ed17490` | Server-verified developer eligibility and the improved account layout |
| [#90](https://github.com/repeat98/octamod/pull/90) | `codex/bug-reports-forum` | `a29b4540832f` | Public bug-report threads, private report details and developer notifications |

PR [#86](https://github.com/repeat98/octamod/pull/86), `codex/verified-community-accounts` at `c721426294cc`, was based on the older account-free Octamod product. Its code-only authentication and migration 0011 conflict with the existing Better Auth/forum stack in #64. The integration retains Modwerk's password/email and forum account system and ports #86's unchecked optional news preference into that system, with authenticated preference changes, private consent records and no campaign delivery. Its branch is recorded with an explicit reconciliation merge, not used to replace the newer account implementation. Profile/deletion/SSO changes belong to the completed local Modwerk account snapshot described below.

## Account and migration reconciliation

The combined release includes the final published heads of #87, #88 and #89. The account page uses the improved community/developer layout while retaining Google/GitHub/Discord sign-in, email authentication, rules agreement, unchecked optional news consent, profile editing, account export and confirmed deletion. The SSO callback remains mounted during session refresh. Developer verification and administrator authorization remain separate from visitor sign-in.

The privacy migration was renumbered from `0015_account_policy.sql` to `0018_account_policy.sql` to preserve existing forum migration 0015. The combined sequence is 0017 social accounts, 0018 policy acceptance and 0019 optional news preferences. Migration 0020 links explicitly submitted public bug reports to forum threads; historical reports and full configuration/log details stay private. Apply migrations 0011–0020 in order before the matching frontend rollout. Integration checks enforce the same privacy/rules gate for email and social signup, preserve optional consent, and support confirmed data export/removal requests for social-only accounts.

The unrelated IronOxide5, Inflator, Fattener and Stang 2 module drafts are outside this integration request. No draft was promoted into the approved module catalog or qualification baseline.

## Local preview

Use Node.js 24. Install the lockfile dependencies with `npm ci` in this checkout if they are not present. All local configuration and database files below are ignored by Git.

1. Create `.env.local`:

   ```dotenv
   VITE_COMMUNITY_API_URL=http://127.0.0.1:8988/api
   VITE_REPOSITORY_URL=https://github.com/repeat98/octamod
   ```

2. Create `.dev.vars` with `APP_URL=http://127.0.0.1:5198`, `SESSION_TRANSPORT=bearer`, `REGISTRATION_OPEN=false`, `PRIVACY_READY=false` and an independently generated random `AUTH_SECRET` (at least 32 bytes). Never reuse production credentials. Account delivery and social sign-in remain unavailable until their real provider credentials and callbacks are configured; keep them closed until then. Administrator access stays separately authorized and closed without its own key.
3. Run `node scripts/forum-preview-seed.mjs`. It applies migrations and creates fictional discussions and verified demo accounts only in this checkout’s `.wrangler/forum-preview` database. It has a fixed local target and accepts no arguments. For an empty preview database instead, use `npm run db:local` and omit `--persist-to` in the next command.
4. Run `npx --no-install wrangler dev --config wrangler.worker.jsonc --local --port 8988 --ip 127.0.0.1 --inspector-port 9298 --persist-to .wrangler/forum-preview`.
5. Run `npm run dev -- --port 5198`, then open [the combined app](http://127.0.0.1:5198/#all). Both processes must remain running.

For the production artifact, run `npm run build` and `npm run preview -- --port 5198` instead of the dev server. The build uses the local API URL above only for local review. Remove the local environment override before any separately authorized public build.

Existing configurations and firmware remain bound to their original browser origin. This preview creates its own local workspace. Export/import configuration JSON if needed; firmware must remain on the device and be independently selected and revalidated. Nothing uploads or copies stored firmware to a server.

## Validation and release boundaries

Run `npm run check` for the integrated app's lint, domain/SDK source-data checks, type checking, tests and static production build. No firmware, DSP, emulator or real-hardware suites are part of this integration task. Browser review covers machine navigation, library filtering/sorting/comparison, selection conflicts, configuration/build UI, public forum reading, developer authorization and mobile layout.

Downloads retain their existing qualification/owner approval gates. Modwerk's original Digitakt/Digitone core remains frozen; #85 uses the pinned, attributed elekloader builder locally in a browser worker. No owner firmware, native image, secrets or local database enters this branch or the Pages artifact.


On 4 October 2026 the combined application passed `npm run check`: 560 tests across 91 files, lint, type checking, 31 firmware-free SDK source/data checks and the static production build. Google rejection coverage includes invalid nonce/signature/issuer/audience/expiry; privacy integration covers social signup rules and consent, fresh-session export/removal and deletion of private consent records.

The running local preview uses the fictional seed above. Sign in with `demo@example.test` and `Octamod local preview 2026!` to inspect the complete account/forum UI. These are public local fixture credentials, not a production account. Email delivery and administrator access remain unconfigured in that fictional preview. The later authorized real-provider checks use separate local databases, as recorded below.

The release roster contains 24 PRs: #64 and #68–#90. All recorded PR heads are ancestors of the combined release branch. The source branches remain available for provenance and recovery after their PRs close. PR #89 enforces author/maintainer eligibility on the backend, and #90 adds developer notifications and public reproduction threads with private report details.

On 4 October 2026, consolidation validation passed with Node.js 24: `npm run check` (569 application tests across 91 files, 31 firmware-free SDK source/data checks, lint, type checking, licence/catalog/vendor checks and the production build). A signup rendering regression verifies all three SSO providers, required rules agreement, unchecked optional news consent, return navigation and hidden unverified workspace access in the improved account layout. The isolated local D1 database applied migrations through 0020 successfully. Desktop and 390-pixel browser review verified the merged sign-in/signup layout; provider credentials remain unconfigured in that preview, so this does not establish live-provider sign-in. No firmware/DSP/hardware suites or production changes were performed during consolidation.

## Authorized SSO setup and form follow-up — 4 October 2026

Google, GitHub and Discord app credentials/callbacks were configured with the owner’s explicit approval. All three real local signup and returning-login journeys passed; provider email stays private, the chosen username stays public and news consent stays unchecked. The six community SSO secrets are in a staged, undeployed Worker version; Google remains in Testing. See [SINGLE_SIGN_ON.md](SINGLE_SIGN_ON.md) for the exact staging boundary and remaining public-provider gates. Email delivery, developer OAuth and production rollout remain separate.

The account page now uses official provider artwork in full-width native buttons. The rules/news labels wrap beside their checkboxes instead of stacking their text and links into a blank-looking column. Desktop and 375-pixel local browser review found no horizontal page overflow; the mobile rules label stays on one line and the optional-news label wraps normally. Node 24 `npm run check` passed all 569 application tests across 91 files, 31 firmware-free SDK checks, lint, types, licence/catalog/vendor checks and the production build after these form changes. No firmware, DSP, emulator or hardware suite ran.


The owner subsequently approved release once the Digi builder matched elekloader, including the `modwerk.app` domain switch and the `octamod.app` redirect. The pinned builder and existing native parity evidence satisfy that condition; downloads are enabled with the OT-style configuration layout and local JSON backups. Branded Modwerk verification/recovery both reached the approved inbox with owner-confirmed SPF/DKIM/DMARC PASS, and the complete local account journey passed. Final ordinary checks passed 579 application tests and 31 synthetic SDK checks; no firmware/DSP suite ran. See the dated follow-up in [VERIFICATION.md](VERIFICATION.md). Production cutover, runtime capacity and public Google publishing still require their recorded checks before completion.
