# Module qualification gates

From 2 October 2026, new modules and all module updates must provide **worst-case cycle counts, exact memory accounting, passed real-hardware stress-project evidence and complete documentation**. These are publication requirements. Missing measurements, nominal/average CPU percentages, emulator-only evidence, historical evidence for another version, failed checks and incomplete runs cannot qualify a submission.

`npm run modules:check`, `npm run modules:generate`, PR CI and release validation enforce the record. PR CI also checks version increases against the exact base commit. Configure `module-contract` as a required status check on protected main. The owner verifies the actual reports and merges the PR to approve the version; there is no extra website approval. Metadata checks do not run submitted source or perform physical hardware tests. A contributor declaration cannot replace reviewer verification.

## Existing modules

The eleven module folders present when this policy was requested remain included at their current versions, with their existing measurements and historical/status labels intact. [The frozen baseline](../sdk/module-qualification-baseline.json) records each exact version and complete folder SHA-256. This preserves the owner's acceptance of the existing tests without inventing cycle counts or changing earlier qualification claims. Existing availability, build and download restrictions remain intact.

An exemption applies only while **every file in that module folder and its version are unchanged**. Source, documentation, evidence or media updates require the new qualification record and the usual semantic version increase and OT UI evidence. New IDs cannot inherit an exemption. PR checks reject changes to the baseline once it exists on the base branch. Do not add modules to it or regenerate it as a way of making a failed gate pass.

## Complete documentation and screenshot style

Release validation also requires a complete README, TESTING report, licence/attribution, descriptions of every control, compatibility/limitations, a short practical tutorial and real documentation screenshots. Draft placeholders do not qualify; the owner verifies factual completeness and usability alongside the source. The release build runs the same gate as PR/local validation, including OT UI access/capture validation even without a Git base.

Record `documentation` inside `tests.qualification`: `tutorial.title`, at least three ordered `tutorial.steps`, nonempty `screenshots` paths and `screenshotStyle: "black-and-white"`. The tutorial covers setup and selection/enable, a useful control example, and the expected result plus stop/reset/bypass. Its heading and steps must appear in the same order in README. Module pages display these steps under the access instructions.

README must have populated Overview, Controls, Usage, Compatibility and limitations, Tests and measurements, Authorship and licences, and Screens and audio sections. Link or embed each declared documentation screenshot. Explain inactive controls and known limitations explicitly; cross-reference the measured costs and TESTING results. Synchronize the public manifest, README, tutorial, native controls, captions and version/build provenance. The owner verifies that the complete documentation covers the real behavior, including all relevant pages and controls.

Use the same **black-and-white/gray style as the online modules**, with readable integer scaling. Release validation decodes the actual PNG pixels and rejects yellow or colored captures; it accepts ordinary noninterlaced PNGs up to 2048×2048. Preserve real captured LCD content. Capture with a monochrome display/renderer rather than drawing replacement labels or substituting illustrations. Every referenced OT UI capture must still show the actual selection/enable location and relevant controls with exact button/menu steps and version/build/setup provenance. Screenshots must be declared hardware/emulator PNG media with captions, alt text, credits and rights.

An automatic USB module's reviewed `access.noUiReason` removes only the nonexistent OT LCD requirement. It still needs documentation screenshots of its actual host connection/routing controls and a short setup/use/verification tutorial. Existing exact baseline modules remain retained; future versions must meet all of these requirements.

## Record in the module manifest

Complete [the qualification template](../public/module-qualification.example.json) using actual results and place its object under `tests.qualification` in `octamod.module.json`. The downloadable file and scaffold copy are deliberately incomplete: null numbers, placeholder identities and pending/failed statuses fail validation. Leave a draft without `tests.qualification` while developing; it cannot pass submission/publication checks. Never replace unknown quantities with zero, averages or invented measurements.

Keep `tests.report`, `tests.evidenceRevision`, README, native declarations and the qualification reports synchronized. `tests.evidenceRevision` identifies the exact tested source commit; `qualification.moduleVersion` must match the submitted version. `qualification.sourceSha256` binds the evidence to the current native source inventory and `qualification.imageSha256` identifies the exact local image used for the hardware run. Commit only the hashes, never the firmware bytes. Source changes invalidate the qualification hash.

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

The local report must include commands/tool versions, the measured maximum and where it occurred, the parameter/mode matrix, branch coverage, sample/block/event basis, budget derivation and limitations. `static` counts need a defensible upper bound; emulator instruction counts without contention are not chip wall-clock cycles. State that limitation, account for contention/overhead and verify real-time operation on hardware. Average or nominal load does not meet this requirement.

## Exact memory

`memory.regions` inventories program/code, state, tables, buffers, stack, bounded heap, alignment/padding, temporary peaks and shared allocations. Each region records `name`, `space`, `words`, `wordBits`, exact `bytes` and `scope` (`instance` or `shared`). Supported spaces are `dsp-p`, `dsp-x`, `dsp-y`, `cpu-flash`, `cpu-ram` and `sdram`. Word widths are 8/16/24/32 bits, with `bytes = words × wordBits / 8`. Use 8-bit words for byte allocations and record padding/packing overhead explicitly. Distinguish DSP logical words from their actual storage representation.

The validator checks integer counts, duplicate regions, word/byte agreement and:

```text
perInstanceBytes = sum(instance regions)
sharedBytes      = sum(shared regions)
totalBytes       = perInstanceBytes × maxInstances + sharedBytes
```

The report must reconcile the inventory with native allocation/build maps, exact ranges and claims, build options, lifetime/peak overlap and supported instance limits. Explain zero or absent allocation classes and reused stock memory. Show stack/heap upper bounds and memory guard/canary evidence under modulation and stress. Estimates, an assembly-file length alone, unbounded dynamic allocation or a percentage of firmware size cannot substitute for exact memory. The owner checks for omitted allocations, unsafe overlaps and capacity overruns; a mathematically consistent table alone does not prove completeness.

## Real hardware stress project

Test on a real Octatrack **MKI or MKII**, with original OS 1.40C as the local base, using the exact recorded module/source/image. Do not infer support for an untested model. Run for **at least 60 continuous minutes with all eight audio tracks active**, at the most expensive supported placement and instance/voice count. Exercise applicable MIDI tracks and USB streaming, recording/playback, heavy parameter modulation, scene sweeps, mode/Part changes, bypass/reselection and sustained feedback. Test start/stop and recovery as well as the long-running workload. Record exact settings and any unsupported cases.

The SDK's `sdk/octabam/tools/harness/stress_project.py` is a starting point for generating a repeatable local project; its dearest/default settings do not alone cover every module or modulation path. Record generator/tool revision and commands, source-template fingerprint, sample recipe, final settings and added module-specific cases. An equivalent reproducible stress project is allowed. The `hardware.project` record requires `name`, `sha256` and `recipe`. Fingerprint the final project deterministically (sorted relative file names and per-file SHA-256 values, then SHA-256 of that JSON object) and document the procedure; reviewers must be able to reproduce the workload locally. Do not commit project/card dumps or source templates.

Record `model`, `testedOn`, credited `tester` handle (no email), `durationMinutes`, `audioTracks`, `midiTracks`, `maxInstances`, the five condition fields and a local text `report`. The hardware instance count must equal the supported total declared in memory and cover every cycle record's maximum instance count (which may be per core). `hardware.status` must be `passed`, `tests.hardwareStatus` must be `verified`, and each of these checks must pass:

- `audioContinuity`: no unintended dropouts, freezes, crackling or sustained corruption; define observation/capture criteria and compare with stock where appropriate.
- `transport`: sequencing, playback and recording remain responsive through the workload.
- `controls`: rapid modulation, edits and mode changes work correctly without destabilizing audio.
- `memoryIntegrity`: native bounds/guards and hardware canary/stack/allocator evidence cover the submitted allocation claims; explain the instrument used.
- `recovery`: stop/start, bypass/reselection and interrupted transitions recover; include a cold boot/power cycle in the procedure.

Report commands/procedure, duration, observations and failures honestly. A failed or shortened run must be fixed and rerun. Hardware evidence may be a reviewer-reproducible record rather than an uploaded video, but the owner must verify it. Emulator acceptance (`make accept`) and pressure/cycle reports remain separate supporting evidence; upstream acceptance explicitly records `hardware_validated: false`.

Keep firmware, extracted stock, LCD/RAM dumps, cards and private raw logs local and temporary. Only original/licensed code, sanitized text evidence and reviewed media enter the PR. CI validates text records without firmware, native source execution or hardware access. Visitor configuration builds retain only lightweight compatibility/placement/packaging checks and never run this qualification suite.
