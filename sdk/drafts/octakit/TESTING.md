# OctaKit testing

Draft version: `0.1.1-experimental`.
Integration pin: `8d0ad6f4f82c2efbc10e1c65eefbce0ad1cec4bf` (sambanks/octabam).
Author pin: `c6d3f3927b13fda0cf03711157237b837acdb1f9` (emuyia/ems-octakit),
recipe `ot-26914-152100`.

## Current status

Source inspection/file identities, an isolated local native UI build and three
actual monochrome MKII LCD captures are supplied. The source remains outside
native discovery, the catalog and configurator. `tests.qualification` is absent:
worst-case cycles, complete memory and real-hardware stress evidence are still
missing. The incomplete template contains the actual documentation/tutorial
binding but cannot pass qualification and is not measured hardware evidence.

`npm run sdk:check` reads the import hashes, source subset, capture hashes,
version/build bindings and source hygiene without evaluating the native manifest.
`npm run check` also validates the real PNGs' monochrome pixels, complete README
and synchronized tutorial, catalog exclusion and failed qualification gate,
then runs ordinary lightweight application checks/build. No native source,
firmware, DSP/emulator or hardware tests run during those application checks.

## Current-version UI build and captures — 2 October 2026

At the owner's request, the pinned draft was copied into a new private native
tree as `modules/octakit`. The local build ran under macOS `sandbox-exec` with
network denied, a clean environment, read access limited to that tree/local
vendor toolchain/verified base, and writes limited to the task's temporary
workspace. It selected all fourteen registered stock effects plus OCTAKIT,
stock FX1, `NO_FALLBACK`, `static_stock=True`, and no platform modules. This is
a UI-only build; scoped module combinations and browser packaging are unverified.

The trusted `tools/build/build_bus.py` compiled the imported runtime with
m68k-elf-gcc 16.2.0 (recipe pins 16.1.0). The builder verified the raw runtime,
packed runtime and original author append against their pinned recipe
identities, then composed its own loader/choosers. The result was 1,188,408 bytes
with SHA-256 `859b53a5fa9ac81ddf3a136878982014525c9e3b9b3c079af741f9a40f51680e`.
This identifies a private capture image, not an approved/downloadable package.
The 1,112,560-byte local base matched SHA-256
`164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e`.

The reviewed emulator binary matched SHA-256
`93484e4b71c70f48f795825103146a36ef95ef9ac06ee627e28608ae3e3bb3eb`.
Python 3.14.6 drove its MKII panel, stopped transport and actual LCD/window
renderer through `scripts/capture-module-ui.py`. A local native-test template
was copied/cleaned with `tools/hw/ot_project.py:make_clean_project`, then staged
with `tools/emu/emu_card.py:stage_project` as SET OCTAMOD / PROJECT KITDEMO on a
64 MiB disposable card, without audio assets. That helper uses FX1 ID 0 and FX2
ID 9, with zeroed pages; this stock composition interprets those as NONE/LO-FI.
Its stock Parts migrated to Kits. The emulator reported LOAD PROJECT handled
before panel actions; empty-card attempts did not open the Kit menus and their
images were discarded. Project loading took several minutes of wall time.

Reproduction uses the profile recipe, local tool/source hashes and private
fixture fingerprints in [media/capture.json](media/capture.json). The temporary
build command/options and full panel plan are recorded there. Capture command,
inside the same private sandbox (paths are intentionally local placeholders):

```sh
python3 -B scripts/capture-module-ui.py \
  --emulator <local-reviewed-ot_emu> \
  --image <private-mainos_bus.bin> \
  --image-sha256 859b53a5fa9ac81ddf3a136878982014525c9e3b9b3c079af741f9a40f51680e \
  --card <private-disposable-card.img> \
  --set-name OCTAMOD --project-name KITDEMO \
  --plan <private-plan-loaded.json> --output <new-private-output>
```

After the loaded fixture's initial clock prompt was confirmed, PART opened
LOAD KIT, showing selected 001 ONE, UNDO KIT and unassigned-slot markers.
NO closed it; FUNC+PART opened SAVE KIT; YES opened the name editor. These
three actual LCD images were inspected and retained at integer scale 6,
768×384, with grayscale pixel values 24/240. Their SHA-256 values, module version,
source inventory, image/emulator identity, panel plan and setup are recorded in
capture.json and `media[].otUi`. Their naming/rights declaration is in
[media/LICENSE.md](media/LICENSE.md). The original thumbnail is a separate SVG
illustration and was rendered/visually inspected.

This verifies MKII menu access and name-editor appearance only. No current MKI,
reload/undo correctness, slot clipboard, pattern copy, persistence/audio/stress
or hardware claim follows from the pictures. Imported source files remained
unchanged. Only reviewed PNGs and sanitized metadata are retained; private
firmware, runtime binaries, card/project fixtures, raw LCD/RAM and logs are
removed after retaining the permitted evidence.

## Historical upstream evidence

[OCTABAM.md](OCTABAM.md) records a standalone Octakit image-identity check,
runtime reconstruction with m68k-elf-gcc 16.2.0 against pinned 16.1.0
identities, ColdFire emulator boot/readback, and historical `OKMS1` use on
MIDI Scenes' author's unit on 14 September 2026. Its page-1/page-2 parameter
write experiments concern other upstream remixes. The native declaration's
hardware proof label refers to these historical observations.

The upstream `tools/verify/verify_octakit.py` tests stock plus the author's
writes/append against the author's standalone image. An octabam composition
adds its own chooser/loader changes, so the standalone identity is not
Octamod browser/native parity. The gate can skip when the toolchain or author
checkout is absent; a skip cannot qualify this module. Reproduce reviewed
native work in isolation using the exact pinned upstream, never by executing
unreviewed source on a trusted host.

No supplied record establishes worst-case cycles, complete memory totals or a
continuous 60-minute real-hardware stress project for this Octamod version.
Historical hardware use is not a new passed qualification run.

## Required reports before publication

- ColdFire worst-case cycles per event and supported maximum configuration,
  with real-time deadline/budget, control updates, Kit selection/save/reload,
  migration, copy/paste/undo, interrupted transitions and persistence spikes.
  Exercise parameter endpoints and simultaneous LFO, p-lock, MIDI CC and scene
  changes with maximum audio/MIDI/USB load. Account for stock/scheduling/transport
  work and headroom. This module has no DSP algorithm; document any indirect
  DSP/control workload rather than inventing DSP counts.
- Exact memory inventory from allocation/link maps. Upstream declares 528
  shared audio pages (3,244,032 bytes) at `0x45d0dde0..0x46025de0`, a 154,766-byte
  raw runtime including locally recovered stock, and temporary boot staging at
  `0x47fc7410..0x47fe0000` in the recipe. These figures do not constitute a full
  report: account for code/state/tables/buffers/stack/heap/padding, aliases,
  reused stock regions, shared reservations, lifetime overlap, guards and peaks.
  Distinguish the staged packed payload from its reserved range. Reconcile all
  region/word/byte and maximum-instance totals with the actual local build.
- At least 60 continuous minutes on each claimed real MKI/MKII model with all
  eight audio tracks active, maximum applicable MIDI activity and scoped USB
  use. Record tester, date, source/version/local-image identity and reproducible
  stress-project recipe/fingerprint. Cover scene sweeps, heavy modulation,
  repeated Kit/Part/mode changes, recording/playback, load/save/reload,
  pattern/Kit copying and interrupted transitions. Require passed continuity,
  transport, controls, memory integrity and recovery checks, including cold boot.
- Disposable backed-up project migration and persistence fixtures: old Parts
  map to the first 64 Kits, empty/populated Kit slots, bank-independent pattern
  assignment, undo, warm/cold restore and documented downgrade behavior.
- Owner review of the supplied thumbnail, complete README/tutorial and three
  actual MKII menu/name-editor captures. Current MKI access and behavioral
  qualification remain pending. Review must verify page coverage, authenticity,
  rights and consistency with the current version/source.

Place sanitized text reports under `evidence/` or in this file. Fill
`tests.qualification` only from actual reports and recompute its native-source
hash after source paths are final. The source and complete-folder fingerprints
change when this draft is promoted or edited. Keep firmware, extracted stock,
RAM/LCD dumps, card/project fixtures and private logs local and temporary.
Retain only reviewed images and metadata in module media.

## Integration work before firmware builds

Before release, add source-backed CPU/DSP/memory tiers in `resources.impact`
under the current [resource-gauge contract](../../../docs/MODULE_RESOURCE_GAUGES.md).
They must describe the workload and rationale and remain distinct from actual
cycle/memory/hardware measurements. No generic rating or frozen companion
estimate can qualify or publish this new draft.

The existing SDK has runtime/arena abstractions, but the OctaKit recipe,
stock-containing runtime reconstruction and current source package/browser
engine have not been integrated or validated together. Review the sparse
guard discipline, pinned caller returns and page-1 write token; resolve actual
hook collisions with MIDI Scenes, Quantizer and the remaining scoped modules
without silently importing additional modules. Upstream specifically leaves
dirty marking, UNDO KIT and pattern-paste behavior after external writes open.

Require native ledger/placement/rejection coverage for supported combinations,
local fingerprint-checked stock recovery, and actual browser/native byte
parity before replacing approved packages or enabling downloads. Firmware
must never enter source-build automation. Owner review of reports and rights,
then owner merge of a qualified version's PR, is required before publication.
