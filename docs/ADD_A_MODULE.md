# Add or port a module

This page is for contributors and for the coding agents they point at this repository. Read it, then the section for your machine. The other module documents are field references; open one only when a step links to it.

## Choose your path

| You want to | Go to | Start with |
| --- | --- | --- |
| Port an octabam module | [Octatrack](#octatrack) | the module's folder in octabam at an exact commit |
| Write a new Octatrack module | [Octatrack](#octatrack) | `npm run module:new -- my-filter --kind dsp --author <github-login>` (`--kind coldfire` for a CPU module) |
| Bring an elekloader mod to Digitakt or Digitone | [Digitakt and Digitone](#digitakt-and-digitone) | the author's released `.elemod` files |
| Write a new Digitakt or Digitone mod | [Digitakt and Digitone](#digitakt-and-digitone) | `npm run module:new -- my-mod --machine digitakt --author <github-login>` |

## Rules that always apply

- Never commit firmware, extracted stock code or tables, memory dumps, emulator cards or built images. Firmware stays on your computer. Stock code is referenced by address, length and SHA-256 and copied from each user's own OS file when they build.
- Keep every author's credit and full licence text. Pin ported source to an exact commit.
- Any change inside a module folder needs a higher semantic `version` in its manifest, and the same version in `sdk/catalog.json` once the module is listed there.
- One module per pull request. The owner merging it approves that version.

## Setup

- Node 24 (see `.nvmrc`), then `npm ci`. This is all you need for documentation, metadata and the website.
- Octatrack native work also needs Python 3.10+, Docker and your own Octatrack OS 1.40C update file, kept outside the repository. Build the pinned toolchain image once: `docker build --file sdk/build/Dockerfile --tag modwerk-source-tools .`

## The fast loop

Run this after every edit. It takes about 15 seconds, never reads firmware and never runs module code.

```sh
npm run modules:generate                      # regenerate the catalog from the module folders
npm run check                                 # lint, tests, types and the production build, as in CI
npm run modules:check -- --base origin/main   # version and publication rules for the folders you changed
```

## What a finished module contains

Its folder, `sdk/<platform>/modules/<id>/`, holds:

- the source and its native declaration: `manifest.py` on the Octatrack, `build.json` on Digitakt and Digitone;
- the manifest, `octamod.module.json` on the Octatrack or `modwerk.module.json` on Digitakt and Digitone. It lists every control, how to reach the module on the unit, compatibility and conflicts, resource gauges, test evidence, licence and media;
- `README.md` with the sections Overview, Controls, Usage, Compatibility and limitations, Tests and measurements, Authorship and licences, and Screens and audio. It also has a tutorial of at least three steps (set it up and select it, use one control, hear the result and stop or bypass it), which must match the manifest;
- `TESTING.md` with the commands, the exact source revision and every result;
- `LICENSE` with every author's terms;
- `media/` with real black-and-white screenshots of where the module is selected and of its control pages, their provenance in `capture.json`, and an original SVG thumbnail.

The checks reject missing sections, coloured screenshots and a version that did not increase. They cannot tell whether the documentation is true; the owner reviews that.

## Octatrack

1. **Create the folder.**
   - *Porting:* copy the module's folder from octabam at an exact commit into `sdk/octabam/modules/<id>/`, and put the author's original files it depends on under `upstream/`. Record every copied file with its source path and SHA-256 in `sdk/imports/<id>-<short-commit>.json`; `sidechain-compressor-f80ecfe.json` is an example. Add the licence to `sdk/octabam/licenses/manifest.json`, then run `npm run licenses:generate`.
   - *New:* `npm run module:new` creates the folder. Pick a free effect ID, and replace `verify.py`, which fails on purpose until you do.
   - Either way, read the traps in [octabam's AGENTS.md](../sdk/octabam/AGENTS.md) before writing DSP or ColdFire code. The DSP assembler silently mis-encodes some instructions, and several of these traps assemble cleanly into the wrong machine code.
2. **Fill in the manifest** from [the template](../public/module-repository.example.json): every control, the access steps, compatibility and conflicts. Add the resource gauges (`resources.impact`, see [gauges](MODULE_RESOURCE_GAUGES.md)) and the qualification record (`tests.qualification`, see [fields](MODULE_QUALIFICATION.md)).
3. **Measure and test.**
   - Record the worst-case cycles for each processor and the exact memory regions and totals.
   - Add a hardware report from a real unit, stating its model, how long it ran, what was tested and the limitations. There is no minimum duration or track count.
   - If you could not test on hardware, say so in the pull request. Only the owner can waive this, for one exact version.
   - Hardware tests are planned to run automatically over USB with a customised test firmware ([decision](DECISIONS.md#5-october-2026--a-faster-module-workflow)).
4. **List it and compile the packages without firmware.** The build compiles every module in `sdk/catalog.json`, so add your module's id and version there first. From then on, `modules:check` also requires the complete qualification record, documentation and screenshots. Commit, then run this from the clean checkout. The output folder must not exist yet.
   ```sh
   image=$(docker image inspect modwerk-source-tools --format '{{.Id}}')
   bash scripts/build-modules-isolated.sh . ../module-packages "$image"
   npm run modules:import -- ../module-packages/packages --development
   ```
   Commit what the import changes. CI compiles the same packages again and fails if they differ.
5. **Compare with native octabam** on your own 1.40C. Modwerk's browser builder must refuse every selection that native octabam refuses, and reproduce every selection that it builds. Run this on the selections that contain your module. [Sidechain Compressor's TESTING.md](../sdk/octabam/modules/sidechain-compressor/TESTING.md) and `scripts/verify-sidechain-native.mjs` are the current worked example. A module with a shape no earlier module had, such as one that replaces a stock effect or claims new memory, needs changes in both `src/engine/` and `sdk/octabam/tools/build/build_bus.py`.
6. **Capture the screenshots** in the headless emulator with `scripts/capture-module-ui.py` ([how](MODULE_UI_CAPTURES.md)). Open every image before keeping it.
7. **Show it on the site.** This step is still manual:
   - `src/catalog/availability.ts`: add the id to `AVAILABLE_MODULE_IDS`. Otherwise the library and configurator hide the module.
   - `src/catalog/module-additions.ts`: add the date the module was added.
   - `src/components/ModulePreview.tsx`: wire in the thumbnail.
   - `src/catalog/selection-conflicts.ts` and `src/engine/analog-bd.ts`: list the module if it is a custom DSP effect, since Analog BD refuses those.
   - Tests that count catalog modules: `npm test` names the ones that need updating.
   - `docs/VERIFICATION.md`: add a short entry with what you compared and the result.
8. **Open the pull request.** Say what you tested, what you did not test and why.

## Digitakt and Digitone

Firmware for these machines is built by elekloader's builder, vendored unchanged and run in the browser ([vendor/elekloader](../vendor/elekloader/README.md)). It decides which mods combine, so there is no comparison with a native builder to run.

**Porting an elekloader mod:**

1. Download the author's released `.elemod` for each OS release. Check each SHA-256 against elekloader's `web/catalog.json` at the pinned commit. Add the files to `vendor/elekloader/shop/`, with one entry per file in `vendor/elekloader/UPSTREAM.json` and `module` set to the Modwerk id.
2. Create `sdk/<machine>/modules/<id>/` with the same layout as [digihealth](../sdk/digitakt/modules/digihealth/):
   - `modwerk.module.json`, with `source` pinned to the author's commit;
   - the author's source under `src/`, and `build.json`;
   - README, TESTING, and LICENSE with the author's own licence text;
   - `upstream/` for the author's own README;
   - `media/`.
3. Record the import in `sdk/imports/`, as in `elemod-2026-10-04.json`.
4. Build it in `npm run dev` with your own stock OS file, flash it and test it. Then set `evidence.tier` to what you actually did ([tiers](SDK.md#evidence-tiers)).

**Writing a new mod:** `npm run module:new -- my-mod --machine digitakt --author <github-login>` creates the folder (`--machine digitone` for Digitone).
- Write `src/`, and subscribe to core events in `build.json` ([events and budgets](../sdk/machines/digitakt/README.md)).
- Modwerk compiles the source in its pinned toolchain ([source builds](ELEMOD_SOURCE_BUILDS.md)).
- The browser builds only from pinned `.elemod` files, so to appear in the configurator a new mod needs an `.elemod` release, pinned as above.

## Reference

| Topic | Document |
| --- | --- |
| Octatrack manifest fields | [MODULE_REPOSITORIES.md](MODULE_REPOSITORIES.md) |
| Qualification record: cycles, memory, hardware, exceptions | [MODULE_QUALIFICATION.md](MODULE_QUALIFICATION.md) |
| Screenshots and the capture tool | [MODULE_UI_CAPTURES.md](MODULE_UI_CAPTURES.md) |
| Resource gauges | [MODULE_RESOURCE_GAUGES.md](MODULE_RESOURCE_GAUGES.md) |
| Contract v3 and evidence tiers | [SDK.md](SDK.md) |
| Writing native Octatrack code | [MODULES.md](../sdk/octabam/docs/remixer/MODULES.md) and [PLACEMENT.md](../sdk/octabam/docs/remixer/PLACEMENT.md) |
| Assembler and hardware traps that already cost real work | [octabam's AGENTS.md](../sdk/octabam/AGENTS.md) |
| What has been verified, and how | [VERIFICATION.md](VERIFICATION.md) |
