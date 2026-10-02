# Module folder and website contract

A module is a folder under `sdk/octabam/modules/<id>/` containing native source, `manifest.py`, `octamod.module.json`, README, TESTING, licence and real OT UI screenshots (audio is optional). Start with `npm run module:new`. See [SDK setup](../sdk/README.md) and [contribution rules](../CONTRIBUTING.md). Submissions and all updates use PRs; merging the PR is owner approval. No direct module upload or separate website approval remains.

## Schema version 2

[The downloadable template](../public/module-repository.example.json) and `src/catalog/module-contract.ts` define the strict contract. Unknown fields, missing sections, invalid versions, unsafe paths, impossible control defaults, mismatched label counts and invalid media declarations are rejected. Source is never executed by metadata validation.

| Field | Required content |
| --- | --- |
| id, key, name, version, category | Stable folder/build identity, readable name, semantic module version and category |
| author | GitHub author login, optional display `name`, and complete credits; names never replace GitHub links or issue-routing logins |
| source (optional) | Exact per-module HTTPS GitHub repository, 40-character commit and source directory; required for pending imports |
| build (optional) | `status: pending` and a user-facing reason; source import does not imply browser/native qualification |
| nativeManifest | `manifest.py` beside this file |
| presentation | Library summary, page overview, family/label, highlights and practical usage |
| access | OT location, prerequisites, exact button/menu steps and declared screenshot paths; narrow no-UI declaration for automatic USB modules |
| controls | Every active control: name, default, count, description, labels or null |
| compatibility | Original OS 1.40C, location, conflicts and explicit limitations |
| resources | Storage/processing label, display, optional numeric value, unit, evidence method, exact conditions/source; unknown numbers are null |
| tests | TESTING path, honest result summary, hardware status, exact evidence commit and declared gates |
| tests.qualification | Mandatory for new modules/updates: this version/source/image identity, worst-case cycles under modulation, exact memory regions/totals, attributed owner-reviewed hardware evidence, complete README/tutorial and real black-and-white documentation screenshots; see [qualification gates](MODULE_QUALIFICATION.md) |
| license | SPDX expression, local licence file and accurate source/media declaration |
| media | Relative path, hardware/emulator/audio type, caption, alt text, credit, licence and original/source provenance; `otUi` page, version, local build hash and setup for OT captures |

A display string may report a range or several quantities while its scalar value stays null. `method: unmeasured` forbids a numeric claim. Static prices and emulator instruction counts are not hardware percentages. Historical hardware results do not qualify a later revision.

These display fields retain existing-module evidence and may describe an incomplete draft. They cannot substitute for `tests.qualification` on a new submission or update. The [qualification template](../public/module-qualification.example.json) starts incomplete and deliberately fails validation until populated with actual results. Required counts are integers; memory words/bytes and allocation totals must agree; maximum cycle load must fit the declared budget; hardware must have owner-reviewed test evidence, labelled with actual coverage and limitations; a 60-minute eight-track stress run is no longer mandatory. The tested-source hash is recomputed without executing source, and text reports must exist and contain evidence. The owner verifies the actual test results before merge.

## Build and version checks

`npm run modules:generate` validates source folders and writes `src/catalog/module-documents.json`. The module library, pages, controls and resource explanations consume that generated content. `sdk/catalog.json` lists the seven initial modules plus the four explicitly requested additions, each at an exact version. Its `sourceRevision` remains the existing native composition pin; newer per-module `source` pins identify imports separately. New source folders do not silently enter the configurator.

OctaKit, requested on 2 October 2026, is staged under `sdk/drafts/octakit/` with the same strict document schema, licences, source pins, README and TESTING contract. It is outside native registry discovery and the public catalog while qualification and browser/native integration remain pending; its thumbnail, documentation/tutorial and actual MKII OT UI captures are supplied. Promotion to `sdk/octabam/modules/octakit/` requires the full new-module gates and owner-reviewed PR; never add a draft to the frozen baseline or treat historical upstream proof as current qualification. See [the draft](../sdk/drafts/octakit/README.md).

[CC Map](../sdk/octabam/modules/cc-map/README.md) and [Preview Vol](../sdk/octabam/modules/previewvol/README.md) are released under the owner’s exact-version software-verification waiver. They live in `sdk/octabam/modules/`, native discovery, source-only compilation and the public catalog, with full tutorials and real monochrome LCD captures. Hardware stress remains untested; chip worst-case cycles remain unmeasured. The two-entry waiver is independent of the unchanged eleven-module baseline. Future folder/version changes and ordinary public submissions require full qualification. `npm run sdk:check` preserves import/source/stock-guard identities without evaluating submitted Python; domain tests reject self-approved, expanded and stale waivers.

`npm run modules:check` rejects stale generated content and missing local documentation/media. `--base origin/main` also requires a strictly greater semantic version whenever any file in an existing module folder changes. PR CI runs it against the exact base SHA. New or changed module folders and modules newly added to the catalog also require version-matched real OT UI location/control captures and access instructions; unchanged legacy publications remain readable. See [the capture workflow](MODULE_UI_CAPTURES.md). Sources, docs and media are reviewed together. No `.bin` or `.syx` file belongs in the source or media folder. No symlink may escape the folder.

Qualification is enforced even without `--base`, during generation and release validation. [The frozen 2 October 2026 baseline](../sdk/module-qualification-baseline.json) preserves the eleven existing modules only while their version and complete folder fingerprint match. Any file change loses that exemption; a new ID cannot inherit it. PR checks prohibit rewriting or expanding the baseline once it exists on the base branch. Pending imports, suspensions and download restrictions remain independent of this grandfathering policy.

## Temporary frontend availability

As of 1 October 2026, Spectrum, Modulation and Character are temporarily hidden because of reported audio crackling. `src/catalog/availability.ts` controls this suspension. The original seven modules, source provenance and saved configuration pins remain intact. Suspended modules cannot be added or validated for a build through the frontend; older configurations remain readable and identify the modules that must be removed. Reinstatement requires a verified fix and owner approval.

## Publication

The owner merging a PR is the approval for the update. The subsequent release must compile original/licensed code in isolation, record the merged commit, module versions and checksums, and preserve the previous release if a build fails. Release packages must reproduce the locally verified source packages; generating web content alone does not install arbitrary third-party code. Stock firmware must never reach automation or the community API.

## Verified requested modules

Analog BD, MIDI Scenes, USB Audio (tracks + MAIN/CUE) and Scale Quantizer are verified loader-free imports at `0.1.1-experimental`. Their pending build markers were removed only after native composition/rejection and actual-browser full-file parity passed. Existing saved configurations automatically use current catalog versions; a pending update remains blocked by its build-verification gate. Historical upstream and owner-reported hardware evidence remains separate from composition support.

USB MIDI is required internal source under `sdk/octabam/platform/usb-midi/`. Author repository subsets are plain files with exact pins, licences and checksums in [the import record](../sdk/imports/octabam-363861e.json). No Git submodule checkout, firmware, extracted output or media was imported. `npm run sdk:check` inspects syntax and source fingerprints without evaluating these modules. The release compiler supports these eleven reviewed modules and refuses any other module scope. The importer requires all nine source packages to reproduce the locally verified baseline.
