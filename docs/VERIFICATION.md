# Verification record

**Owner-approved logger release (3 October 2026):** the owner explicitly lifted the logger addition’s qualification restrictions, authorized local firmware/DSP checks, approved the current module versions and logger for release, and waived hardware testing. Downloads are enabled with the logger included. This exception does not claim measured chip timing, complete stress qualification or new hardware evidence. Existing firmware isolation, original-source provenance, compatibility checks, stock fingerprint guards and packaging integrity remain in force. MIDI Scenes keeps its pinned standalone code and 12-page reservation; the logger occupies the top 16 pages of the arena, and a one-page guard separates it from the sample arena; guarded arena updates reserve all 29 pages. Mixed MIDI Scenes configurations remain incompatible. The earlier full-image proofs below predate logger integration; local verification of this change is recorded separately. See [logger evidence and limitations](../sdk/runtime/logging/TESTING.md).

## MIDI Scenes logger boundary fix — 3 October 2026

The logger-enabled image from the download restoration below passed byte parity but failed project loading in the emulator: its first four logger code bytes at `0x4600dde0` became zero, and execution stopped at `0x4600dde4`. The author image loaded the same project successfully. This failure reproduced with both the pinned prebuilt emulator and a CLI freshly linked from the reviewed native inputs.

Reserve one extra 6,144-byte guard page below the logger, keeping the author’s bottom 12 pages, its base operands and the logger’s top 16 pages intact. The sample arena now ends at `0x4600c5e0`; its trailing free-list word lands in the guard instead of logger code. Total reserved sample/recorder memory is 178,176 bytes (29 pages), an additional 6 KB. The build rejects a plan without this protected gap. All original FX1 and FX2 effects remain available for standalone MIDI Scenes; mixed selections still refuse.

Independent native reconstruction of the complete MAIN image matched the browser composer. GNU logger bytes and symbols, populated configuration/replay, the complete native bootstrap append, native ELEK/ELUP packaging and round-trip checks passed. The actual browser worker passed both stock-menu settings, all thirteen companion refusals, altered/truncated input rejection, stale-base clearing and input preservation. The updated private worker check is `scripts/verify-midi-scenes-worker.html`.

| Fixed MIDI Scenes identity | Value |
| --- | --- |
| Module version | `0.2.4-experimental` |
| MAIN SHA-256 | `a5af848dfcb3d4b9e060e8385666330cb2f1e5b0dcbb0531e555b6417b7e7805` |
| ELEK SHA-256 | `7e2a6d15fcbd821d21fb6213b1d496bd5ecdafe2bf5de7ad577dc75a7656dcc7` |
| ELUP SHA-256 | `62da520eb0a22f8b3bf8edcdf97cc99c0647566d59df0dc53dc44fbeee17e002` |
| Update bytes | 454,808 |
| Logger runtime bytes | 60,572 |

The exact fixed MAIN image passed the reviewed `scripts/midi-scenes-emulator/panel.py` eight-track scenario with a fresh fixture: 795 commands, project load, eight active FLEX tracks, 24 audio LFOs, four dense/lock patterns, crossfader and MIDI input, 401,316 captured frames, nonzero stems on all eight tracks, zero dropped capture frames and 103 MIDI UART output bytes. The sample/card fixture and native inputs match the existing reviewed runner pins. Both audio FX slots were NONE; this is not maximum stock FX load. `npm run check` passed 347 application/domain tests, 31 SDK tests, lint, types and the production build; module checks against main passed. Hardware tests were waived by the owner. Firmware, cards, raw captures and stock-derived intermediates remained private and temporary; only identities and aggregate observations are recorded here.

## Logger download restoration — 3 October 2026

The production browser worker was exercised locally with the owner's verified 1.40C file. Each of the eleven visible modules passed validation, composition, full-file packaging and an independent SHA-256 check as a standalone selection: MiniVerb, Tape Echo, Euclid, Repitch, Tapehead, Analog BD, MIDI Scenes, USB Audio, Scale Quantizer, Preview Volume and CC Map. Incompatible MIDI Scenes/Repitch and Analog BD/Tapehead selections were refused. An altered original was refused, invalid inspection cleared the prior usable base, and the original input remained unchanged.

The actual configurator built MIDI Scenes with its logger, offered `Download .bin`, and saved a 454,808-byte file. The downloaded file's SHA-256 matched the worker result: `bef108339c186dbb7b8298a523a1ae40598383cc0ad8310d4199be22e8879c0e`. Its total arena reservation is 172,032 bytes (12 author pages plus 16 logger pages).

Native GNU linking matched the browser linker for twelve logger runtime inventories; this checks linking and symbols, not every public composition. The relocated MIDI Scenes logger separately matched GNU bytes/symbols, and its complete packed loader append matched independent native packing and GNU assembly. Existing logger host tests passed. `npm run check` passed 347 application/domain tests, 31 SDK tests, lint, types, licence/module integrity and the production build. No physical-hardware test or new timing measurement was performed, as explicitly waived by the owner. All stock-derived outputs stayed local and outside the repository.

## Browser firmware flow — 1 October 2026

Verified in the actual local frontend using the browser worker and a locally saved original OS 1.40C file. Stock and output bytes stayed local; this record contains identities only.

| Configuration | Stock FX2 | Download bytes | SHA-256 |
| --- | --- | ---: | --- |
| Mini Verb, Tape Echo, Euclid, Repitch | retained | 582260 | `91331100c6035b9961fa55c9757b6132eebb0c5b773c1d918052f08b558a78b0` |
| Spectrum, Modulation, Character, Mini Verb, Tape Echo, Euclid, Repitch | compact | 590072 | `1f5050c1ef1f0bc632bd354410be18d151828312f0d80cdafe2a21c4a02feb0d` |

Both identities equal the unchanged native builder plus the same-input native ELEK/ELUP packaging oracle at source revision `b8deefc88b2c3e5f3c6158e364eb741df1924e1d`. See `src/engine/assets/composition-proofs.json`; eight native profiles have OS, container and full-file fingerprints. All seven modules with all stock FX2 effects are rejected for formatter-cave overflow by both composers. The browser reports how to reduce that selection and offers no download.

Risk acknowledgement gates the build. Changing chooser settings invalidates the completed result and acknowledgement. Canceling a real compact build returns to the valid selection; the next build completes with the native identity above. The enabled Download .bin control was clicked in the actual browser. The downloaded file was independently read from the host Downloads folder: 590072 bytes with SHA-256 `1f5050c1ef1f0bc632bd354410be18d151828312f0d80cdafe2a21c4a02feb0d`, matching both the browser result and native oracle. Changing chooser settings afterwards removed the old download and acknowledgement; the overflowing selection remained blocked. Restoring the workspace reverifies the locally saved base. No native emulator, stress or audio-render checks were run for this verification.

Local parity and container round-trip checks do **not** qualify this catalog on hardware. Current module-specific limitations remain visible. Download is enabled for the supported fixed catalog and chooser profiles; arbitrary custom choosers and unapproved third-party packages remain unsupported.

## Application checks

`npm run check` passed lint, 113 tests in 26 files, TypeScript app/server checks and the static production build on 1 October 2026, before the SDK import. Further changes require a new check.

### Check performance — 2 October 2026

In a clean checkout of main at `b324b50`, the original full `npm run check` passed in 16.68 seconds on Node 24.21.0. The updated check passed in 5.91 seconds with empty ESLint/TypeScript caches and 3.74 seconds warm. These are local measurements, not CI timing guarantees. All 274 original Vitest tests retained the same passing results; five additional runner tests brought the total to 279. The four separate licence-notice tests and 18 synthetic SDK tests still run. Lint, all three TypeScript projects and the static production build passed. `npm run modules:check -- --base origin/main` and standalone `npm run build` also passed.

Runner fixtures prove licence/catalog freshness failures prevent generation, all independent checks remain mandatory, failures reach the command exit status, and type errors prevent bundling. Cached lint rejected a new error despite unchanged file size and timestamp; incremental TypeScript rejected a new server type error. Both temporary probes were removed and type checking passed again. No firmware, native DSP, emulator or hardware tests ran.

After rebasing onto main at `979842c`, the full check passed again in 5.55 seconds with 285 Vitest tests, including six additional tests from main.

## Still required before completion

first-time base selection and rejection in the browser; project-path frontend and separate-origin guest API and administrator access verification; responsive and keyboard coverage across routes; a clean SDK developer setup; approved source-to-package publication; actual licensed screenshots/audio where available; production service configuration. No public deployment has occurred.


## Source-folder catalog and versions — 1 October 2026

The frontend now reads strict versioned manifests beside the seven imported source modules. `npm run check` passed 115 tests in 27 files, lint, TypeScript and static build after version pins were added. An independent disposable Git fixture proved that a README update without a version increase is rejected, and a greater semantic version plus exact catalog pin is accepted. The SDK scaffolder successfully created a disposable DSP module; the source skeleton is explicitly untested. Local community migrations 0004–0006 applied successfully. Source-to-package release automation and portable developer setup remain incomplete; the platform migration now has the separate parity evidence below.

Guest comment posting and the ownership-only Remove control were exercised in the actual browser against the local bearer-session Worker; the verification comment was removed afterwards. Existing guest rating/like state was retained. Worker dry-run bundling passed (77.69 KiB, 19.19 KiB gzip) without deployment.

## Trimmed SDK composition — 1 October 2026

The public SDK registry contains exactly the seven frontend modules. Two stock-loader declarations are isolated under `sdk/octabam/platform/`, with their controller dependencies outside the catalog. The stock null routine is absent from the source tree: the assembler reserves its nine-word tail and fills it from locally fingerprinted original firmware, with the loop end relocated. Stock detour/DSP-hook expectations likewise use guarded local reads.

In a disposable SDK copy using the same patched assembler/linker, Mini Verb + Tape Echo + Euclid + Repitch with stock FX2 produced 1,245,104 bytes, SHA-256 `1dbef0e5646ae3814224b88ca6ebda7fb911840a8ca2aa2af810ed5ef5e0cdac`. All seven modules with the compact FX2 chooser produced 1,250,126 bytes, SHA-256 `5162680d8bc342deb623cef00307f2a343f539a90f0bfcef59b59ceb4c60bb83`. Both complete native-image identities equal the unchanged upstream-source oracle. All seven with stock FX2 rejected with the same `wide dial hook (116 B) does not fit` error. Raw composed image sizes differ from the compressed downloadable upgrade sizes recorded above.

Temporary stock-containing inputs and outputs were removed. No emulator, stress or render checks ran. Reproduce with `scripts/verify-sdk-native.py`; hashes and scope are recorded in `sdk/verification.json`. Native setup portability, remaining source/provenance audit and reviewed source-to-package release automation remain required.

The full lightweight application check passed 116 tests in 28 files, lint, TypeScript and static build. Three additional synthetic SDK tests passed missing/altered-input rejection, bounds/fingerprint validation and native DSP record recovery without proprietary fixtures. Both DSP and ColdFire scaffolds were created and checked; they retain author attribution and a deliberate failing qualification gate until actual behavior checks are implemented.

## Guest-only community and separate administration — 1 October 2026

Website GitHub sign-in was removed: no OAuth routes, grants, callback cookies, GitHub identity in the session contract, or frontend sign-in code remain. Former `/api/auth/github`, `/callback` and `/complete` return 410 without redirects or cookies. Account-bound cloud configuration copies are retired (410); configurations stay on the device and move by export. Migration 0007 drops the one-use grant table and adds administrator sessions.

Administration is separate from guest identity. The backend owner configures `ADMIN_KEY_SHA256`; the administrator exchanges the key for an eight-hour, tab-scoped session sent in `X-Octamod-Admin`. Every `/api/admin/` route checks it on the server. Without a valid configured digest, access fails closed. Key attempts are throttled, sign-out revokes the session and rotating the key revokes all sessions. Comment moderation, history and the issue inbox (log downloads, GitHub retries) are only under `/api/admin/`; reporters see their own reports through `/api/issues/mine`. Issue reports are mirrored to public GitHub issues when `GITHUB_TOKEN` is configured. The status webhook accepts only HMAC-signed deliveries for the configured repository (`src/community/service.test.ts`).

`npm run check` passed 125 tests in 30 files (including the four owner-merge approval tests and new administrator/guest isolation tests), the four synthetic SDK tests, lint, app/server TypeScript and the static build. Against the actual local Worker runtime (workerd) the retired routes returned 410, admin routes 403 and an unconfigured key 503. A disposable second Worker with its own D1 state and a temporary key accepted the correct key, refused a wrong one, kept a guest out of the admin inbox, showed the reporter only their own report and refused the revoked session. The temporary key and state were deleted. The new pages were not yet exercised in a browser.

## Source-built packages v4 — 1 October 2026

Native parity found a regression in the v3 source build. v3 bound the receiver's static null dispatch entries to its local stub copy (`dlstubinit`) instead of stock's null stub (`P:0x7c8` A / `P:0x588` B), so the patched OS extent no longer matched the native oracle. The SDK's dynamic-load notes state that static placement keeps the stock entries and only the running receiver redirects ids. A controlled A/B run showed v2 assets and v3 with only those two values restored both pass full parity.

The compiler now takes the static entries from the declared stock-copy source address, and `--verify-existing` compares the complete receiver record (placement, frame, dispatch bindings, stock-copy record and code), not only code bytes. The importer independently refuses receivers that rebind static null entries. v4 was compiled stock-free with the read-only native toolchain against the parity-proven v2 baseline. Its resident receiver file is byte-identical to v2; the ROM file differs from v2 only in the shared-dial guard source fingerprint. Source tree `d7a156941589e867236a470adc5fccb6c03a513d98bd7ae092ea3df17097c213`, compiler `36265406504e8e1d4bcaac1534ff5ecf3f639a6f854cebbfc044a167f1785bf5`, development build (no source commit or approval).

The import rejection proof accepted v4 and refused corrupt, stale-version, stale-source, incomplete-inventory, stock-read, non-zero stock-tail and null-rebinding artifacts without changing frontend assets; v3 is now refused because its compiler differs. After importing v4, `scripts/verify-composition-native.mjs` with the user's own original 1.40C matched all eight native OS, container and update identities, including 590072 B (all seven, compact) and 582260 B (four modules, stock FX2), plus the crowded-selection, wrong-slot, unsupported-chooser and modified-firmware rejections. No firmware was written. No emulator, stress or render checks ran.

## Release pipeline review — 1 October 2026

The repository is now public at `repeat98/octamod`. The first push ran `pages.yml` and failed closed at the owner-merge step because `MODULE_APPROVER_GITHUB_ID` is not configured; nothing was built or deployed and Pages is not enabled. That run also showed the release scripts load their TypeScript helpers on the runner's Node 24 before `npm ci`. GitHub's REST API lists `2026-03-10` as a supported version, so the approval client's version header is valid.

Changes from the review: the six workflow actions are pinned to the commit SHAs of their current releases (checkout 7.0.1, setup-node 7.0.0, upload-artifact 7.0.1, download-artifact 8.0.1, upload-pages-artifact 5.0.0, deploy-pages 5.0.1; all Node 24 or composite, with the inputs used verified at those commits). Runners are pinned to `ubuntu-24.04`, and the toolchain image to the `ubuntu:24.04` index digest. The ineffective second `.dockerignore` was removed; `Dockerfile.dockerignore` is the one Docker applies. Release-mode import now also requires the CI build to reproduce the committed, locally parity-verified packages, with the commit stamp as the only permitted difference. Before this, CI-compiled bytes replaced the committed ones without any parity evidence.

A disposable clone with these changes committed exercised the real `build-modules-isolated.sh` with a stand-in for `docker run` (no daemon was available). It refused a mutable image tag, an existing output directory and a dirty checkout. The staged mount contained exactly the commit's tracked tree, one commit object and no history. Planted ignored files (`firmware/fake.bin`, `.dev.vars`) were absent. The compiler's release-mode Git checks passed on the read-only staged copy. With GitHub's API mocked, the production importer refused a merge by another account, a non-matching merge commit and a committed package that the build did not reproduce. It accepted the owner-merged, reproducible build and recorded the PR approval. The eight published packages differ from the committed v4 packages only in `sourceCommit`.

Still unverified: the Docker image build and real container isolation (network, capabilities, read-only root); whether the container's Ubuntu `binutils-m68k-linux-gnu` and its dsp56300 build reproduce the local packages (the reproduction gate fails closed if not); and a real owner-merged PR run on GitHub with Pages enabled.

The first owner-merged PR (#1, merge commit `3f68473`) showed that GitHub omits `merge_commit_sha` from the single-PR endpoint for read-only tokens. The release check therefore refused a genuine owner merge, twice, and published nothing. Approval now requires GitHub's own `merged` issue event to name this exact commit and the owner as the merging account, keeps every other PR check, and still compares `merge_commit_sha` whenever GitHub returns it. Because a push can start the check seconds before GitHub links the merge commit to its PR, the lookup retries for about 90 seconds. Against the live API without a token, the check approved `3f68473` as PR #1 merged by the owner and refused the PR's head commit.

The first release run past the approval check (merge of #2) built the image and compiled the DSP packages, then failed on ColdFire assembly. Ubuntu 24.04's `binutils-m68k-linux-gnu` is older than the local GNU binutils 2.47 (`m68k-elf`) that produced the committed packages and lacks the `.base64` directive. Nothing was published. The image now builds binutils 2.47 for `m68k-elf` from `binutils-2.47.tar.xz`, pinned by SHA-256 `154ab23b60070e8f27013c22977f1129425d67d1e8acd6e13010e617811e4cff`. The tarball was verified locally as signed by the chief binutils maintainer's key in GNU's official keyring.

With Docker running locally (linux/arm64; GitHub's runners are x86-64), the image built and the real `build-modules-isolated.sh` compiled a clean clone of main (`83c2ee9`) in the container. All eight packages are identical to the committed, parity-verified packages apart from `sourceCommit`. The production importer, with GitHub's API mocked and `merge_commit_sha` withheld, accepted them. With the script's flags, the container had no network route, a read-only root filesystem, a non-root user and only `/tmp` writable.

## Production deployment — 1 October 2026

The merge of #3 ran the complete release workflow: owner merge verified, isolated container compile, reproduction gate, app check and Pages deployment. https://octamod.app serves the site over HTTPS with a GitHub-issued certificate. `www.octamod.app` and `repeat98.github.io/octamod` redirect to it. The live firmware worker carries the approval record for PR #3 (commit `c2f5c5b`, merged by the owner) with the qualification note "assembly and relocation only".

The community Worker runs at `https://octamod-community.octamod.workers.dev` with a new D1 database (Western Europe) and migrations 0001–0007. It has no R2 binding. Against the live API: the session route answered for `https://octamod.app`, another origin was refused (403), the preflight from `https://octamod.app` was allowed, module data was readable, admin routes were refused (403), admin login reported "not configured" (503) before the key was set, and the retired sign-in routes returned 410.

## Firmware downloads paused — 1 October 2026

After the site went live, the owner loaded a downloaded image (Mini Verb, Tape Echo, Euclid and Repitch) in octemu, and selecting an FX showed "DSP LOAD FAILED". With stock FX2 kept, that selection is a native parity profile: the browser output is byte-identical to native octabam at the pinned revision `b8deefc`. Upstream recorded the same message on 30 September, after that revision, as an open failure on branch `build/abd-packages` (commit `7b055186`). On a tester's real unit, an image with the dynamic DSP loader, Tape Echo, Mini Verb and Euclid showed DSP LOAD FAILED on every FX, played no audio and stayed on step 1; the same image without the loader played. Upstream's conclusion is that the loader must not ship in a flashable image until its transport is proven on a chip. Every image Octamod composes contains that loader, so downloads are paused: building still checks a configuration, but no file is offered. Re-enable only after a fix is verified on hardware and brought in through a new pinned revision with renewed parity proofs.

## Frontend-only releases — 1 October 2026

The release workflow now rebuilds module packages only when module source, the compiler, the release scripts or the committed packages changed since the last successful release. It compares against the last success, not the previous commit, so a failed module build cannot be skipped by a later merge. Otherwise `scripts/stamp-module-build.mjs` checks the committed packages against their record, the module source fingerprint and the compiler hash, then records the owner-merge approval for the commit. Under bash, the change check chose a full rebuild for this change (it touches the release scripts) and the fast path for `main`. In a fresh clone, with GitHub mocked, the stamp refused changed module source, a changed package and a changed compiler, and accepted the unchanged tree.

This exposed that local builds counted macOS `.DS_Store` files as module source, so the committed record's fingerprint did not match the Git tree. The compiler and the shared inventory now ignore them. The rebuilt packages (v5) are byte-identical to v4, so native parity is unchanged, and the committed fingerprint `994e2a69…` now equals the one the CI build recorded on the live site.


## Loader-free composition and browser verification — 1 October 2026

The active browser engine now uses native static-stock placement with `DSP_LOADER = false`. The dynamic-loader implementation remains available to developers but is excluded from visitor builds. With stock FX2 retained, only Repitch fits. With stock FX2 off, original FX1 effects remain available and selected DSP modules use the three omitted reverb regions (2,724 words per core). Overruns are refused. Tape Echo and Euclid alone require the appended ColdFire runtime and its sample-memory reservation; configurations containing neither leave sample memory unchanged.

The unmodified native builder at `b8deefc88b2c3e5f3c6158e364eb741df1924e1d` exported every subset of the seven pinned modules with both stock-FX2 settings. The JavaScript composer matched all 74 successful complete OS images and all 182 refusals, with zero mismatches across 256 profiles. The exporter also captured native ELEK container and ELUP upgrade identities for all 74 accepted profiles from the same original card file. No composition identities changed when packaging facts were added.

The representative JavaScript packaging pass matched native container and full upgrade lengths and hashes, and round-tripped back to the composed OS for four profiles: Repitch with stock FX2; Mini Verb with stock FX2 off; Character + Mini Verb + Tape Echo with stock FX2 off; and Mini Verb + Tape Echo + Euclid + Repitch with stock FX2 off. The complete original file and decoded OS remained unchanged. Modified-OS, wrong-slot and unsupported-chooser refusals passed. `scripts/verify-static-composition-native.mjs` fails closed on absent, duplicate or missing profiles and absent packaging identities. Its default checks full packaging for all 74 accepted cases; `--packing=representative` checks the four profiles while still checking all 256 OS/refusal cases. The exhaustive JavaScript packing mode was not run in this session.

Two actual production-bundle browser-worker builds matched the same-input native full-file identities:

| Configuration | Stock FX2 | Finished bytes | SHA-256 |
| --- | --- | ---: | --- |
| Mini Verb | off | 445580 | `612b4e6c441e787421d69f42d7da65927dd5d2485396f40923a35d0c6bdb00e1` |
| Mini Verb, Tape Echo, Euclid, Repitch | off | 560904 | `7fe1016a56cbb853c44c947d08b857fe31e8e3bcd614cad0266a08846b0f7dc5` |

The browser rejected a wrong-size base before accepting the owner's original 1.40C locally. Keeping stock FX2 blocked the four-module selection and explained the effect trade; turning it off enabled validation. Adding Spectrum and Modulation refused the overrun and disabled Build. Acknowledgement was required before building. Cancel/rebuild recovered the worker and completed with the native identity. Changing stock-FX2 settings removed the finished identity and reset acknowledgement. Reload restored and reverified the saved base. A 390-pixel mobile viewport showed no horizontal overflow, including the full fingerprint. Downloads stayed disabled, so clicking and independently hashing a downloaded loader-free file remain required after owner approval.

`npm run check` passed 143 tests in 32 files, four synthetic SDK guard tests, lint, app/server TypeScript and the static production build with Node 24. Synthetic static-placement tests cover both core regions, native stable priority order, split-run first fit, overrun/no-space refusals, overwritten donor entries, NONE and omitted custom module IDs while preserving listed stock dispatch entries. The historical dynamic-loader verifier now explicitly opts into that path; renewed loader-mode parity remains required before ever re-enabling it.

Stock input and generated firmware stayed local; only hashes, layout facts and authored module code are tracked. No firmware, emulator, stress or audio-render suite ran. These checks did not establish hardware qualification; see the later approval and integration records for release status.

## Combined site release — 1 October 2026

Combined the loader-free engine with the parallel changes: four attributed source imports (Analog BD, MIDI Scenes, USB Audio tracks + MAIN/CUE and Scale Quantizer), their exact upstream dependencies, public author names, social preview and compact responsive layout. Spectrum, Modulation and Character are temporarily hidden from the library and refused by the browser session; saved configurations keep their entries. The eight visible modules include four imports whose firmware build status remains pending. Their pages and configurations are available, but mixed or single pending selections are refused before composition.

The isolated stock-free compiler rebuilt the original seven modules at their current versions from source commit `98190bbe4f514899c9f7b2ad49ca5cb1df9f85b2`. All eight compiled packages have identical code and composition facts to the previously parity-verified packages; only version/source metadata changed. The record binds the full SDK inventory, including pending sources, to fingerprint `435b0363eb3f3869a6352f48ffdce2dd8c2ac5518290b1b95146f84ea250eff1`. Pending Python declarations are excluded from the disposable compilation tree and never evaluated. Import and frontend-only stamping independently require the same verified seven-module scope and exact pins.

After integration, native comparison again passed all 256 profiles: 74 byte-identical OS images, 182 matching refusals and zero mismatches. Four representative configurations also matched the native complete container/upgrade and round-tripped. Modified firmware, unsupported chooser and wrong-slot rejections passed. Stock input remained unchanged and no firmware was written. In the combined production bundle's actual browser worker, Mini Verb `0.1.1-experimental` with stock FX2 off again produced 445580 bytes with SHA-256 `612b4e6c441e787421d69f42d7da65927dd5d2485396f40923a35d0c6bdb00e1`.

Browser checks confirmed the new Analog BD detail page and attribution, refusal of a pending Analog BD + Mini Verb selection after local base verification, explicit adoption of updated versions for an older saved configuration, and successful loader-free composition afterwards. The sidebar stayed at viewport height on long module and configuration pages. At 390 pixels the finished identity had no horizontal overflow. The disposable local origin's saved base was removed after checking. Downloads and the dynamic DSP loader remain disabled.

The final Node 24 `npm run check` passed lint, 153 tests in 35 files, seven synthetic SDK guard/import tests, app/server TypeScript and the static production build. Release automation must reproduce these committed packages from the exact owner-merged commit before publishing. This record documents pre-release checks; it does not claim hardware qualification or a completed deployment.

## Owner-approved loader-free downloads — 1 October 2026

The owner explicitly approved enabling downloads for verified loader-free selections after reviewing the parity results. `DOWNLOADS_ENABLED` is enabled; `DSP_LOADER` remains false. Pending imports and the three temporarily paused modules retain their existing build refusals. This supersedes the earlier download-pause records without claiming hardware qualification.

The approved production bundle was exercised in the actual browser with Mini Verb `0.1.1-experimental`, stock FX2 off and the locally verified original 1.40C. The Download .bin control saved a complete 445580-byte upgrade. Independently reading that new host download produced SHA-256 `612b4e6c441e787421d69f42d7da65927dd5d2485396f40923a35d0c6bdb00e1`, identical to the browser and native oracle. The installation guide correctly said this configuration leaves sample memory unchanged. Changing the chooser removed the completed download and reset the risk acknowledgement. The new test download and the disposable origin's saved base were removed; the original input and prior downloads were left untouched. Node 24 `npm run check` again passed 153 tests in 35 files, seven SDK tests, lint, TypeScript and production build.

The preceding combined site release passed the complete owner-merge, isolated compilation, reproducibility, frontend and Pages workflow for PR #7, merge commit `d1136ce4c65ea7e1a00c4516cd4aa41c4b0c0d56`. The actual HTTPS site showed all eight intended modules, their public author credits and the new social-preview metadata. Download enablement is published through a separate checked owner-merged PR.

## Owner-requested local hardware test images — 1 October 2026

The native remixer built two private images from the exact SDK sources in application commit `119fb2c0aecb67be87281038235d36bf2968cfe4`, using the owner's original OS 1.40C locally. Neither image nor any firmware-derived output is committed or published.

| Native status tag | Modules | Update bytes | Update SHA-256 |
| --- | --- | --- | --- |
| OCTABAM80 (container OCTAMOD80) | Mini Verb, Tape Echo, Repitch, MIDI Scenes, USB Audio tracks + MAIN/CUE, Scale Quantizer | 566156 | `04e4d8f6201a5e1c5d17d0d996ddbd061721b808342eb1dee442297a0d5fdd6d` |
| OCTABAM81 (container OCTAMOD81) | Analog BD, Repitch, MIDI Scenes, USB Audio tracks + MAIN/CUE, Scale Quantizer | 576756 | `37f7c56c50c6614e25bce2b1fbef894a75ed38c8b39643183c395dca245a6e9c` |

Source versions: Mini Verb, Tape Echo and Repitch `0.1.1-experimental`; the four requested imports `0.1.0-experimental`. A network-disabled local container ran native resource/patch guards, assembly and disassembly checks, runtime linking and packaging. Native ELUP round trips passed. The independent TypeScript decoder also verified each full composed OS byte-for-byte against the native output, the original container tail and seed, and the final version. No firmware, DSP, audio-render, stress or emulator test suites ran.

The owner reported “The test firmwares worked” for both files. This is owner-reported hardware smoke evidence for these exact combinations; the model, detailed feature coverage and long-duration audio behavior were not reported. The new imports remain pending in the browser engine until its composition passes native byte parity and rejection checks.

All eight modules are refused by the native Analog BD admission rule: Analog BD currently composes with stock DSP effects only, excluding Mini Verb, Tape Echo and Euclid. The seven-module profile without Analog BD also failed menu placement at Euclid slot 10 (254 bytes required). Removing Euclid produced the six-module image above. The frontend presents these known conflicts before base firmware is selected and offers explicit compatible choices. While dynamic DSP loading is disabled, it hides the stock FX2 checkbox and builds/exports with stock FX2 disabled, including configurations saved with the older option; original FX1 remains available. The saved preference is retained for a future verified dynamic-loader release.

## Requested modules: native and actual-browser parity — 1 October 2026

Analog BD, MIDI Scenes, USB Audio tracks + MAIN/CUE and Scale Quantizer are now `0.1.1-experimental` with source pins and original authorship retained. Their loader-free browser recipes assemble authored ColdFire/DSP packages; inherited USB descriptor spans are zero placeholders, and shared stock DSP helpers and table entries are recovered only from the fingerprinted local original 1.40C. The isolated source compiler cannot read firmware. Download enablement follows the owner's existing approval and the completed native and actual-browser checks below.

The pinned native SDK declarations (`b8deefc` baseline plus the reviewed `363861e` imports) exported all 256 subsets of the eight visible modules with stock FX2 off, plus all 32 subsets of Repitch and the four imports with stock FX2 retained. `scripts/verify-requested-native.mjs` requires every unique profile and matched 156 complete OS byte identities and 132 refusals with zero mismatches. Fifty-six incompatible Analog BD profiles were refused by the exact native admission predicate; the remaining native profiles ran composition, placement and linking. A private compression cache reused the unchanged native packer only for identical payload input and parameters. The four altered-original-OS rejections passed and the original remained unchanged. These checks perform composition and packaging only, never DSP execution or a stress/emulator suite.

Fifteen stock-free GNU ColdFire link fixtures cover every nonempty subset of the four requested runtime groups, including internal USB MIDI where needed. Browser linking matched every byte length, SHA-256 and authored global export. Additional tests reject absent or changed local inherited USB spans and verify that all four bundled spans contain zeros. The original seven-module matrix retained 74 byte identities, 182 refusals and four representative native-complete container/update identities.

The actual production-bundle browser worker built these configurations through the normal UI using the owner's locally selected original file. Full update SHA-256 identities matched native ELEK/ELUP packaging with `OCTAMOD79`:

| Configuration | Update bytes | SHA-256 |
| --- | ---: | --- |
| Mini Verb, Tape Echo, Repitch, MIDI Scenes, USB Audio, Scale Quantizer | 566156 | `2dcf0af580f6db05a26f501dc4d4c58730efeba20e4bc39734113a91a0d600d8` |
| Analog BD, Repitch, MIDI Scenes, USB Audio, Scale Quantizer | 576756 | `961f82df19aa3b29f14dcba3e2184161dff59a340185013d6166206263f5f9d9` |

The browser refused an altered same-size original before validation, disabled Build, removed the completed identity and reset acknowledgement. Adding Analog BD to the six-module selection showed the explicit conflict card; choosing to keep Analog BD removed only Mini Verb and Tape Echo, retained all five compatible modules and passed placement. Downloads were held off during these checks and restored only after both full-file matches and the browser rejection passed. Public proof files contain identities and refusal/layout facts; all input, composed firmware and extracted content remained private and local.

The selection matrix also found the minimal menu conflict: Mini Verb + Tape Echo + Euclid + Repitch + Scale Quantizer. MIDI Scenes and USB Audio do not affect that collision. The UI now explains this five-module conflict and offers removing Euclid, retaining the most modules. The native Analog BD admission rule remains enforced, and the dynamic DSP loader remains disabled. Configurations start empty and the stock-FX2 checkbox remains hidden until a verified dynamic-loader release.

The owner's two earlier combined native test images were reported working. This is limited hardware smoke evidence for those combinations, not complete feature coverage, device-model qualification or sustained eight-voice audio qualification. Historical upstream hardware limits remain visible. Publishing still requires an owner-merged PR and source-package reproduction in release automation.

Final release checks passed with Node 24: 175 tests in 37 files, seven synthetic SDK guard/import tests, lint, app/server TypeScript and production build. The final isolated compiler reproduced all nine source-package artifacts and the importer checked the full source inventory, current module pins and all-zero inherited USB placeholders. Clicking the enabled browser Download control saved the Analog BD five-module update; an independent host read confirmed 576756 bytes and SHA-256 `961f82df19aa3b29f14dcba3e2184161dff59a340185013d6166206263f5f9d9`, identical to native. No firmware was committed or uploaded.

## Recovery wording and component notices — 1 October 2026

The SDK flashing guide no longer promises successful recovery, safe retries or preservation of project data. The README and app visibly identify Octamod as independent and unofficial, with no Elektron affiliation, endorsement or support. Configuration, module and installation notices now include possible warranty and future-update effects, unsuccessful recovery and the prohibition on sharing firmware images.

Full component copyright notices and terms were checked against pinned upstream notice files. Modulation declares `MIT AND ISC AND BSD-3-Clause`; Spectrum and Character retain MIT with the additional authors' full notices. Their documentation/licence versions are now `0.1.1-experimental`. The notice-source pins identify the files used for licence verification and do not change the original module source provenance or historical test evidence. A generated notice bundle is retained in the SDK and public assets; compilation includes it with a fingerprinted artifact record, and the importer rejects missing, corrupt or stale notices. A network-disabled, isolated source-only compiler regenerated all nine package artifacts from the reviewed source with the new version pins. Independent comparison confirmed that executable payloads and composition facts are unchanged; only version metadata differs. The accompanying source artifact records `stockRead: false` and the full notice bundle, and the development import passed its provenance and notice checks. These local artifacts do not constitute release approval; publication still requires an owner-merged PR and reproducible source compilation.

Node 24 checks passed: 82 catalog/community/configuration/release/hosting tests, four notice rejection/HTML-escaping tests, seven synthetic SDK guard/import tests, lint, module/version validation, TypeScript and the production build. Source, public, built and compiled-artifact plain-text notices were byte-identical; the HTML viewer matched its generated source. The actual browser displayed the independence notice and expanded flashing warning, opened the licence viewer and retained keyboard access at a 390-pixel mobile viewport without horizontal overflow. No firmware composition, DSP, emulator, stress or hardware checks ran for this update. The current loader-free release keeps `DSP_LOADER = false` and the owner-approved `DOWNLOADS_ENABLED = true`; the older dynamic-loader failure does not disable this static build.

The focused release branch was rebased onto `3207fe39be49628f889938a44f82ea0410c6431b`, preserving the merged privacy page, private usage statistics, compact mobile header and module popularity/download tracking. Its diff leaves the statistics services, backend, database, workspace hooks and download/loader flags unchanged. The frontend release job now installs dependencies before artifact import so licence validation can verify the installed React runtime terms on a clean runner.

## Actual OT UI screenshots and publication requirements — 1 October 2026

Twenty-one actual headless-emulator LCD images document Mini Verb, Tape Echo,
Euclid, Repitch, Analog BD, MIDI Scenes and Scale Quantizer. They show selection
and enable locations, effect controls, the Analog BD 808/909 pages, MIDI CC
setup/scene editing, all three quantizer rows, and both Repitch access routes.
Each module has exact access steps, captions, rights declarations, image/build
hashes and reproducible panel plans. USB Audio documents the narrow no-OT-UI
exception. Suspended Spectrum, Modulation and Character have no successful
retained captures; failed-load screens were discarded.

Captures used local 1.40C and a stopped MKII headless panel. The three source
imports were compiled for UI capture under explicit owner authorization in a
restricted temporary macOS sandbox. No audio/stress/hardware/firmware-parity
qualification gates ran. Temporary firmware, LCD/RAM planes, sample/card
fixtures and private logs were removed.

For publication on current main, documentation/media revisions advance to
0.1.2-experimental and MIDI Scenes to 0.2.1-experimental. Every native module
source file is byte-identical to its captured source; records preserve the
original captured draft versions and bind those pixels to the updated metadata.
The MIDI capture shows the existing 8.2-derived native UI, not standalone
MIDISC2.0 qualification; MIDI Scenes remains pending. Other support and hardware
statuses retain current main's decisions.

The manifest and PR checks require version-matched location/control captures
and access instructions for new/changed module folders and new catalog entries.
Unchanged legacy versions remain readable. Source-import fingerprints preserve
original upstream identities alongside updated local README hashes.

The final publication uses main's pending-module release fix merged in PR #22
at `f5cd9386c92475b2259eb7529f92049e86493454`; the screenshot PR does not change
that compiler. Its ten-module release scope excludes pending MIDI Scenes source
from discovery/compilation and retains the previous inactive objects verbatim.
The captured native source fingerprints were independently compared with main
and remain identical. Both pending build guards and prior object metadata are
preserved. A network-disabled, read-only source container regenerates only
stock-free packages at the new publication versions. Every executable byte,
source fingerprint, relocation proof and composition recipe matches main; only
publication versions and build provenance differ.

The browser loaded all three Repitch PNGs at their original 768×384 dimensions
and displayed both access routes in the existing How to use it disclosure.
No firmware, raw LCD/RAM dumps, cards or local audio fixtures entered this PR,
and no firmware/DSP/stress/audio qualification tests ran.

Final Node 24 checks on this base passed: 223 tests in 43 files, seven synthetic
SDK checks, four licence checks, lint, app/server TypeScript and production
build. Exact-base publication validation passed. All 21 PNG SHA-256 values and
their complete native-source capture bindings were rechecked. The final isolated
compilation and development import passed with main's unchanged release compiler.

## Module qualification and documentation gates — 2 October 2026

New modules and updates now require current source/version/build identities,
worst-case cycle counts under modulation and maximum load, exact memory totals,
and passed real-hardware stress-project records. Release validation also requires
complete README sections, a synchronized short tutorial, real access captures
and black-and-white PNG documentation screenshots. The frozen folder baseline
retains all eleven existing modules without changing their sources, versions,
media or recorded test/availability statuses.

Node 24 validation passed: 234 tests in 45 files, four licence checks, seven
synthetic SDK checks, lint, app/server TypeScript and the production build.
Exact-base module validation passed against main. Synthetic rejection fixtures
cover missing evidence, budget overruns, inconsistent memory, incomplete/failed
hardware records, stale source hashes, altered legacy folders, missing README
sections/tutorial steps and colored or malformed screenshots. No submitted
native source was executed.

The local browser confirmed that “Are the mods stable?” appears in FAQ search
and explains the gates without guaranteeing stability. It explicitly asks users
to test their own configuration before relying on it. No firmware, DSP,
emulator, audio or physical hardware qualification tests ran for this policy PR;
it adds enforcement and documentation, rather than new module qualification
claims. No firmware, project/card dumps or raw captures were added.

## Only the needed stock FX2 effects — 2 October 2026

Loader-free builds no longer drop every stock FX2 effect. A visitor build keeps all fourteen and omits only the FX2-only reverbs whose code the selected modules take (Spring first, then Plate, then Dark; the fewest that fit). Repitch, USB Audio, Scale Quantizer and other selections without module DSP code keep every stock FX2 effect. Analog BD omits only SPRING REV. Tape Echo, Mini Verb or Euclid alone omit SPRING REV; Mini Verb + Tape Echo + Euclid (+ Repitch) omit DARK REV. FX1 is unchanged. If the longer FX2 list leaves the module menus too little room, the build uses the compact FX2 menu, as before. Composing all 1,040 subsets of the eleven modules (except Analog BD with custom DSP effects) both ways locally, this happened only for Modulation + Euclid + Repitch + Scale Quantizer (with or without USB Audio); Modulation is currently hidden. No other selection changed between building and refusing.

Two stock reverbs call routines inside another reverb's code: DARK REV calls 35 words at SPRING REV+820, and PLATE REV calls 93 words at DARK REV+974 (both cores). This was found from the native relocation recipes and confirmed by an independent scan of every absolute and relative jump in the user's original DSP payloads. No other effect calls into another. The native placer does not check this, so the site only gives up a reverb alone when the placed code stops before a routine that a kept reverb calls. `composeStaticDsp` refuses any profile that would overwrite one.

The unmodified native builder at `b8deefc` re-exported all 256 seven-module profiles with the site's own menus. All 128 compact-menu proofs reproduced the previous identities exactly; chooser metadata was unchanged. Stock-retaining profiles now build 72 selections (previously 2), the same set the compact menu accepts. `scripts/verify-static-composition-native.mjs` matched all 144 OS images and 112 refusals with zero mismatches. Its representative packaging pass now also covers Tape Echo and Mini Verb + Tape Echo + Euclid + Repitch with the stock-retaining menus, and all six complete ELEK containers and ELUP updates were identical. A full `--packing=all` pass then matched the complete container and update of all 144 accepted profiles. The 32 stock-retaining requested-module profiles were re-exported locally with the same toolchain: the 16 without Analog BD reproduced their previous identities, and the 16 with Analog BD, previously refused because SPRING REV was listed, now build. `scripts/verify-requested-native.mjs` matched 86 builds and 58 refusals with zero mismatches; it now skips the 144 profiles containing the build-pending MIDI Scenes, which the browser refuses before composing.

The browser worker's engine session built flashable updates for Tape Echo; Mini Verb + Tape Echo + Euclid + Repitch; Repitch; Analog BD; and USB Audio + Scale Quantizer. The first three updates equal native's complete ELEK/ELUP identities, and all five decoded OS images equal native's OS identities. Each decoded OS booted in the headless `ot_emu` (MKII, DSP running, emulator `93484e4b…`). The actual LCD showed the expected FX2 chooser (only the omitted reverbs missing). Every kept reverb, Tape Echo, Mini Verb, Euclid, Analog BD, Repitch's SRC SETUP and Scale Quantizer's SCALE setting loaded with their own controls and no error popup. A DSP render gate adapted from octabam's `verify_analog_bd_reverbs.py` rendered every kept reverb in five images on both cores, with fixed and moving controls. Every one is bit-identical to stock. A negative control that zeroes DARK REV's routine inside SPRING REV changed DARK REV's output.

Firmware, decoded OS images, DSP memory dumps and LCD captures stayed local and temporary and were deleted. Only hashes and this record were kept. This is emulator and render evidence, not hardware qualification.


## CC Map and Preview Vol frontend release — 2 October 2026

Both utilities are visible, selectable and buildable at `0.1.2-experimental`.
Their complete tutorials, original thumbnails and thirteen reviewed monochrome
MKII LCD screenshots retain original capture versions/builds and bind the
unchanged native source to this release. Attribution and import provenance are
preserved. The owner's explicit two-version waiver records physical hardware
stress as untested and real-chip worst-case cycles as unmeasured. It does not
expand the frozen eleven-module baseline or relax future submission gates.

The native oracle ran in a network-disabled, read-only source-tools container
with no credentials, dropped capabilities, an unprivileged UID/GID and bounded
resources. Across every subset of the nine currently buildable frontend modules,
with compact and current stock-retaining FX2 menus, all 1,024 profiles agree:
522 complete MAIN OS identities and 502 compatibility/space refusals. Eight
complete native ELEK containers and ELUP upgrades match byte for byte. These
cover each utility, both together and both with Repitch, USB Audio/MIDI and Scale
Quantizer, under each menu profile. Changed/truncated base and unknown-module
rejections pass; original inputs remain unchanged. Only hash proofs are retained.
The explicit private verifier is `scripts/verify-utility-native.mjs`; it is
never part of application checks or visitor builds.

The actual browser worker built both utilities under both menu profiles. Its
compact upgrade hash was `9919f5fee7160ce0d77696ffba3f8e1de19f7749b439d0741a9828a08afd7ee7`;
its stock-retaining upgrade hash was `5800f3c4e1b20e748d84db604ba192a5c659db28dce0fd4e681541311259e285`.
Both match native output. Saved selections and base restore/revalidation passed.
Cards and tutorials fit a 390px viewport without horizontal overflow, all
thirteen LCD images load, and keyboard disclosure toggling works. Firmware,
private cards, samples and LCD/RAM dumps stay local; no hardware/audio/stress
qualification is claimed.

Final Node 24 validation passed: 269 domain tests in 50 files, 18 synthetic SDK
checks, four licence checks, lint, application/server type checks and the static
production build. Exact-base module validation and `git diff --check` pass.
A clean-commit source-only container build reproduces all ten parity-verified
authored package artifacts; only source-commit provenance differs.


## TapeHead release integration — 2 October 2026

TapeHead 0.1.1-experimental moves from PR #42's draft into native discovery,
the approved-source compiler and the visible, buildable catalog. JClones' MIT
TapeHead JSFX (the contributor-identified VladG clone) is pinned at
88a1503d668c378ced4c166e772378272f3b72ea; the original MIT/NOTICE, devilfish707's
port credit and Sam Banks' SDK credit are preserved. The corrected DSP and
manifest are unchanged from c53daa9. Three fresh actual monochrome MKII LCD
captures show FX2 assignment, defaults and COLOR MED, with a full tutorial.
The premature chooser capture was rejected because it still showed DELAY.

The isolated reference render passes (maximum float-reference error 4.68e-4),
stereo isolation, silence, COLOR and signed-multiply checks. A full 2,048-block
both-core benchmark covers moving parameters, extremes and all sixteen trigger
splits, including stock Spring Reverb comparison. The static code-cycle model
charges 6,000 per instance per block, 48,000 at eight inserts per core against a
49,920 usable-work budget; this is not hardware wall-clock timing. The exact
logical allocation is 2,972 shared bytes plus 93 per instance, 4,460 at sixteen
inserts, with no additional X-slot reservation or Y/buffer/heap allocation.
Source/code-cycle and memory reports describe bounds, overhead and limitations.

The owner removed the mandatory 60-minute/eight-track hardware stress test and
accepted the supplied author report: working audio and parameter locks without
reported overloads, with perceived CPU similar to Spring Reverb. Hardware status
is `reported`; model, duration and tested maximum load remain unknown. The
locally reproduced test MAIN OS identity is bb700652540fc42068d1f92791960fb3c86b672932d113f538776c2b1441a0f7.
The frozen eleven-module baseline and exact utility waivers are unchanged.

All 512 original-module/TapeHead profiles match the native oracle: 264 complete
MAIN OS images and 248 placement refusals; nine representative native containers
and upgrades match. The 224 TapeHead/Analog BD/USB/Quantizer profiles match: 80
complete images, 144 refusals, 22 complete native packages. TapeHead + Analog BD
is rejected with an explanation because Analog BD requires stock DSP effects.
All 48 TapeHead/approved-utility images match native, with six complete
packages identical. Native export preserves canonical catalog order for ROM
placement; an initial fixture using a different order was corrected and rerun. The original seven-module proof set is unchanged. The
source-only compiler preserves all existing authored runtime/ROM/USB/utility
code byte for byte; 4,096 new TapeHead declaration combinations are recorded.

The real browser worker builds and verifies TapeHead, with complete upgrade
SHA-256 247ec72998252f364908c2be7a2702425d83e8f8f1c2cd75963a29428056bdc3
(445,548 bytes), identical to native. The desktop page shows the original
creator, source licences, three actual LCD screenshots, controls and tutorial.
No firmware download was saved; the disposable local browser's stored base was
removed using its Remove from device control. Firmware, private cards, raw
LCD/DSP/RAM dumps and composed images remain private and temporary.

Reproduce using `scripts/export-composition-menus.mjs`, the reviewed vendored-SDK
mode in `scripts/export-composition-proofs.py`, and the explicit private
`verify-static-composition-native.mjs` / `verify-tapehead-native.mjs` commands.
The native toolchain runs in a network-disabled container; developer verifiers
read firmware only in memory. These checks never run in ordinary app tests,
source-build CI or visitor flows.

Final Node 24 validation passed 280 domain tests in 52 files, licence/SDK
checks, lint, app/server type checks and the production build. Exact-base
module validation and `git diff origin/main --check` pass. The source-only
compiler's `--verify-existing` pass reproduces every authored package and
receiver against the locally parity-verified baseline. No firmware is involved.
