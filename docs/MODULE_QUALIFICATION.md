# Module qualification gates

**In short.** A new Octatrack module, or a change to how one runs, records the following in `tests.qualification`:

- the worst-case cycles for each processor it uses;
- its exact memory regions and totals;
- a hardware report: a functional report that gives the model, date, tester, summary and limitations is enough, with no minimum duration or track count;
- its tutorial and screenshot paths.

All of it is bound to the module version, its native-source SHA-256 and the SHA-256 of the local image it was tested with. A change to documentation or media alone uses `tests.retainedEvidence` instead. The steps are in [Add or port a module](ADD_A_MODULE.md). The rest of this page is the field reference and the record of owner exceptions.

From 2 October 2026, new modules and updates affecting runtime behavior, stability, cycles, memory or load must provide **worst-case cycle counts, exact memory accounting, attributed real-hardware test evidence and complete documentation**. These are publication requirements. Missing measurements, nominal/average CPU percentages, emulator-only evidence, historical evidence for another source and failed detailed hardware checks cannot qualify a submission. On 2 October 2026 the owner removed the mandatory 60-minute, eight-track stress run. A clearly labelled functional hardware report is accepted alongside the cycle, memory, source, UI and integration evidence below.

`npm run modules:check`, `npm run modules:generate`, PR CI and release validation enforce the record. PR CI also checks version increases against the exact base commit. Configure `module-contract` as a required status check on protected main. The owner verifies the actual reports and merges the PR to approve the version; there is no extra website approval. Metadata checks do not run submitted source or perform physical hardware tests. A contributor declaration cannot replace reviewer verification.

Every release also requires populated CPU, DSP core and memory gauges. These use [source-backed relative estimates](MODULE_RESOURCE_GAUGES.md), do not need exact whole-chip capacity percentages, and do not replace the qualification evidence below.

## Existing modules

The eleven module folders present when this policy was requested remain included at their current versions, with their existing measurements and historical/status labels intact. [The frozen baseline](../sdk/module-qualification-baseline.json) records each exact version and complete folder SHA-256. This preserves the owner's acceptance of the existing tests without inventing cycle counts or changing earlier qualification claims. Existing availability, build and download restrictions remain intact.

The original baseline exemption applies only while **every file in that module folder and its version are unchanged**. Runtime-impacting updates require a new qualification record. Editorial updates can retain the original evidence through the separate, checked path below; they still need a semantic version increase, complete documentation, actual UI/media provenance and owner PR approval. New IDs cannot inherit an exemption. PR checks reject changes to the baseline once it exists on the base branch. Do not add modules to it or regenerate it as a way of making a failed gate pass.

## Risk-based update checks — 3 October 2026

Do not repeat extensive native compatibility, cycle/memory or hardware qualification for a documentation/media/display-only update whose runtime inputs are unchanged. Local generation, PR checks and release validation verify that condition without running native source. New modules always need full qualification.

| Change | Required validation |
| --- | --- |
| README, documentation, tutorial, original/licensed media, attribution, presentation copy or control explanations | Schema, files, media signatures/monochrome pixels, complete documentation, version/catalog pins, approved-history and byte-identity checks; retain existing evidence |
| Executable source, native manifests, runtime data, control defaults/ranges/labels, IDs, compatibility, source pins, build support, resource/load claims, test results/reports, shared native runtime/build code or browser engine code/payloads | Full qualification and relevant native composition/parity/rejection/integration checks; measure worst-case cycles, memory and maximum load, and retain required real-hardware evidence |
| Unknown or mixed changes | Full qualification; no contributor-declared risk override |

For an editorial update, add `tests.retainedEvidence`:

```json
{
  "commit": "<full SHA of a commit already in approved main history>",
  "moduleVersion": "<the originally tested, published module version>",
  "documentation": {
    "tutorial": { "title": "Quick tutorial", "steps": ["Setup and select.", "Use the controls.", "Check and stop."] },
    "screenshots": ["media/ui.png"],
    "screenshotStyle": "black-and-white"
  }
}
```

Keep the original `tests.qualification` or `tests.releaseWaiver`, reports, hardware status, source/image hashes and tested version unchanged; do not relabel them as new measurements. Current tutorial text can be recorded in `retainedEvidence.documentation`. Existing real UI captures can keep their original version/build provenance when the checked runtime is identical. Changed/new images still require authenticity/rights review and media validation. Baseline resource gauges may retain their original version under this same checked path, with no change to the estimates or limits.

The validator reads the original module from the named approved Git commit, verifies that it was already in the catalog, revalidates its original qualification/baseline/owner exception, and compares protected inputs with the update. It also compares shared DSP/platform/build code and browser engine source/payloads. Rebuilt package commit/version labels and derived inventory hashes may change; code bytes, addresses, recipes, limits and test verdicts must remain identical. Refer directly to the original evidence commit rather than chaining retained-evidence updates. Any protected addition, deletion or byte change blocks reuse. The eleven-module baseline and exact owner exceptions are never expanded or rewritten; untested, historical, waived or suspended status stays honest.

PR validation anchors approval to the exact `--base` commit. Local generation/release validation uses `origin/main`; fetch full approved history before validation. Missing history or a commit only on a submitted branch fails closed. No firmware, emulator state or hardware result enters CI or this comparison.

## Complete documentation and screenshot style

Release validation also requires a complete README, TESTING report, licence/attribution, descriptions of every control, compatibility/limitations, a short practical tutorial and real documentation screenshots. Draft placeholders do not qualify; the owner verifies factual completeness and usability alongside the source. The release build runs the same gate as PR/local validation, including OT UI access/capture validation even without a Git base.

Record `documentation` inside `tests.qualification`: `tutorial.title`, at least three ordered `tutorial.steps`, nonempty `screenshots` paths and `screenshotStyle: "black-and-white"`. The tutorial covers setup and selection/enable, a useful control example, and the expected result plus stop/reset/bypass. Its heading and steps must appear in the same order in README. Module pages display these steps under the access instructions.

README must have populated Overview, Controls, Usage, Compatibility and limitations, Tests and measurements, Authorship and licences, and Screens and audio sections. Link or embed each declared documentation screenshot. Explain inactive controls and known limitations explicitly; cross-reference the measured costs and TESTING results. Synchronize the public manifest, README, tutorial, native controls, captions and version/build provenance. The owner verifies that the complete documentation covers the real behavior, including all relevant pages and controls.

Use the same **black-and-white/gray style as the online modules**, with readable integer scaling. Release validation decodes the actual PNG pixels and rejects yellow or colored captures; it accepts ordinary noninterlaced PNGs up to 2048×2048. Preserve real captured LCD content. Capture with a monochrome display/renderer rather than drawing replacement labels or substituting illustrations. Every referenced OT UI capture must still show the actual selection/enable location and relevant controls with exact button/menu steps and version/build/setup provenance. Screenshots must be declared hardware/emulator PNG media with captions, alt text, credits and rights.

An automatic USB module's reviewed `access.noUiReason` removes only the nonexistent OT LCD requirement. It still needs documentation screenshots of its actual host connection/routing controls and a short setup/use/verification tutorial. Existing exact baseline modules remain retained; future versions must meet all of these requirements.

## Record in the module manifest

Complete [the qualification template](../public/module-qualification.example.json) using actual results and place its object under `tests.qualification` in `octamod.module.json`. The downloadable file and scaffold copy are deliberately incomplete: null numbers, placeholder identities and pending/failed statuses fail validation. Leave a draft without `tests.qualification` while developing; it cannot pass submission/publication checks. Never replace unknown quantities with zero, averages or invented measurements.

Keep `tests.report`, `tests.evidenceRevision`, README, native declarations and the qualification reports synchronized. `tests.evidenceRevision` identifies the exact tested source commit; `qualification.moduleVersion` must match the submitted version. `qualification.sourceSha256` binds the evidence to the current native source inventory and `qualification.imageSha256` identifies the exact local image tested on hardware (a reviewer may reproduce it from the unchanged DSP source). Commit only the hashes, never the firmware bytes. Source changes invalidate the qualification hash.

Each qualification `report` must reference `TESTING.md` or a `.md`, `.json` or `.txt` report under `evidence/`. Reports must be regular, nonempty local files. The manifest and draft template are not evidence reports. Keep executable source and runtime inputs outside `evidence/`.

Compute the source identity from the repository root with Node 24, after source and local text report paths are final:

```sh
node --input-type=module - <<'JS'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseModuleDocument } from './src/catalog/module-contract.ts'
import { moduleNativeSourceSha256 } from './scripts/module-qualification.mjs'
const folder = resolve('sdk/octabam/modules/my-module')
const document = parseModuleDocument(JSON.parse(await readFile(resolve(folder, 'octamod.module.json'), 'utf8')))
console.log(await moduleNativeSourceSha256(folder, document))
JS
```

For this command, fill all fields with actual results first, including a valid temporary source hash, then replace that hash with the output. The fingerprint is SHA-256 of a sorted JSON object mapping relative source paths to file SHA-256 values. It excludes the website manifest, Markdown documentation, licence files, `media/`, the incomplete `qualification.example.json` template, declared text evidence reports and OS/Python cache files. All other regular files, including native manifests, native verification code and text runtime data, contribute. The complete-folder legacy fingerprint includes documentation, reports, metadata and media too. Symlinks and special files are rejected.

## Worst-case cycle counts

`cycles` has one record for **each processor used** (`dsp` and/or `coldfire`). Record integer `worstCase` cycles for one instance, `maxConfiguration` cycles at the supported maximum load, `maxInstances`, the available real-time `budget`, `unit`, `method`, `conditions` and a local text `report`. A maximum configuration exceeding its budget fails. Units are `cycles/sample`, `cycles/block` or `cycles/event`; the report must state sample rate, block size or event period/deadline so counts and budget have the same basis. Record each core's load and the worst core, and include stock processing, scheduling, transport overhead and headroom in the budget calculation. Shared work need not scale linearly with the instance count; show how the maximum configuration was priced.

The five required condition fields, separately for cycle measurements and hardware testing, describe:

- `parameterExtremes`: every parameter endpoint, branch boundary and expensive combination.
- `parameterModulation`: simultaneous LFO, p-lock, MIDI CC and scene modulation, including rapid changes and control-update paths.
- `modeSwitching`: repeated and interrupted mode, bypass, Part and algorithm changes, with initialization/reset spikes accounted for.
- `maxLoad`: maximum voices/instances and the most expensive supported per-core placement with streaming, both FX slots and applicable MIDI/USB activity.
- `inputConditions`: silence, full-scale signals, impulses, feedback and other input-dependent worst cases.

For inapplicable mechanisms, explain why they cannot affect this module and which equivalent control path was exercised. Blank strings fail. The reviewer checks substantive coverage: writing “N/A” or copying a stock benchmark is insufficient.

The local report must include commands/tool versions, the measured maximum and where it occurred, the parameter/mode matrix, branch coverage, sample/block/event basis, budget derivation and limitations. `static` counts need a defensible upper bound; emulator instruction counts without contention are not chip wall-clock cycles. State that limitation, account for contention/overhead and retain the actual hardware operation report. Average or nominal load does not meet this requirement.

## Exact memory

`memory.regions` inventories program/code, state, tables, buffers, stack, bounded heap, alignment/padding, temporary peaks and shared allocations. Each region records `name`, `space`, `words`, `wordBits`, exact `bytes` and `scope` (`instance` or `shared`). Supported spaces are `dsp-p`, `dsp-x`, `dsp-y`, `cpu-flash`, `cpu-ram` and `sdram`. Word widths are 8/16/24/32 bits, with `bytes = words × wordBits / 8`. Use 8-bit words for byte allocations and record padding/packing overhead explicitly. Distinguish DSP logical words from their actual storage representation.

The validator checks integer counts, duplicate regions, word/byte agreement and:

```text
perInstanceBytes = sum(instance regions)
sharedBytes      = sum(shared regions)
totalBytes       = perInstanceBytes × maxInstances + sharedBytes
```

The report must reconcile the inventory with native allocation/build maps, exact ranges and claims, build options, lifetime/peak overlap and supported instance limits. Explain zero or absent allocation classes and reused stock memory. Show stack/heap upper bounds and applicable memory-bound/guard evidence; state explicitly when hardware canaries were not measured. Estimates, an assembly-file length alone, unbounded dynamic allocation or a percentage of firmware size cannot substitute for exact memory. The owner checks for omitted allocations, unsafe overlaps and capacity overruns; a mathematically consistent table alone does not prove completeness.

## Hardware evidence

The owner explicitly removed the mandatory one-hour, eight-track stress test
on 2 October 2026 and accepted the TapeHead author's functional hardware report.
This changes the required hardware evidence, not the source, licence, actual UI,
worst-case code-cycle, exact memory or browser/native byte-parity gates. The
eleven-version frozen baseline remains unchanged.

Use either a detailed passed test record or the narrow functional report form:
`hardware.kind: "functional"`, `status: "reported"`, `model` (`MKI`, `MKII`, or
null when unreported), `testedOn`, credited `tester`, exact `sourceRevision`,
`imageSha256`, `summary`, nonempty `limitations`, and a local `report` path.
Set `tests.hardwareStatus: "reported"`. Source and image must agree with the
qualification identities; retain the actual contributor statement and how the
owner verified it. Describe unreported duration, track/instance counts, model
and untested cases explicitly. Do not fill them with guesses or upgrade an
author report to a measured stress pass. A reproduced image must match the
reported hardware image hash; packaging-only version changes are separate.

Detailed hardware records remain supported. Their project fingerprint, actual
duration, track counts, maximum instance count, conditions and continuity,
transport, controls, memory-integrity and recovery checks must describe the
test actually performed. Pending/failed checks still block that form. There is
no minimum duration or eight-active-track requirement. The owner reviews the
evidence and approves publication by merging the PR.

DSP static counts must include expensive branches, parameter updates, trigger
splits and initialization. State explicitly which counts model instruction
cycles and which measurements exclude stalls; don't present them as chip
wall-clock measurements. Separate the core's standard processing reserve and
unmeasured contention from module code costs. Hardware operation is supporting
evidence, and maximum-load coverage must remain honestly labelled.

Keep firmware, extracted stock, LCD/RAM dumps, cards and private raw logs local and temporary. Only original/licensed code, sanitized text evidence and reviewed media enter the PR. CI validates text records without firmware, native source execution or hardware access. Visitor configuration builds retain only lightweight compatibility/placement/packaging checks and never run this qualification suite.

## Owner-approved CC Map / Preview Vol exception — 2 October 2026

The owner explicitly approved `cc-map` and `previewvol` version `0.1.2-experimental` with software verification and real-chip timing marked unmeasured because physical hardware runs are unavailable. `sdk/module-release-waivers.json` binds only these two complete folder/native-source hashes. It is separate from the unchanged eleven-module baseline and immutable after this PR. Both manifests retain `hardwareStatus: "untested"`, null chip cycles, actual LCD provenance, complete tutorials and source-bound software reports. Ordinary submission validation still requires full measured qualification; a contributor cannot grant a waiver in metadata. Any folder/version change invalidates the exception. Source-only release compilation reproduces the locally native-parity-verified packages without firmware.

## MIDI Scenes standalone approval, 3 October 2026

The owner explicitly approved firmware building without hardware timing and
complete memory bounds for the measured MIDISC2.0 release. The exception is
restricted to `midi-scenes` `0.2.4-experimental`, author MAIN SHA-256
`debb24090cada4be00bc70880136f14e813b0d3a9018b516f922d33671bd9b87`,
and the complete source/folder fingerprints in
`../sdk/midi-scenes-build-approval.json`. It requires matching shared-worker
MAIN/full-update parity, changed-base rejection and rejection of all thirteen
companions. No mixed compositions or future versions inherit it. Unknown
hardware timing and memory bounds remain explicitly unknown. UI, provenance,
licence, documentation, stock isolation and owner-merged PR review still apply.
The frozen eleven-module baseline and two utility waivers are unchanged.

## Sidechain Compressor hardware-only exception

On 5 October 2026 the owner explicitly approved sidechain-compressor@0.1.1-experimental without fresh physical hardware evidence. `sdk/sidechain-compressor-build-approval.json` binds that exception to the exact source, image and complete folder, and `scripts/module-qualification.mjs` refuses it for anything else. Both processor cycle bounds, sixteen-instance memory accounting, the composition comparison with native octabam, rejection checks, licensing and actual LCD documentation remain mandatory. Hardware status stays historical; no chip wall-clock timing or current-image hardware pass is claimed.
