# OctaKit testing

Draft version: `0.1.0-experimental`.
Integration pin: `8d0ad6f4f82c2efbc10e1c65eefbce0ad1cec4bf` (sambanks/octabam).
Author pin: `c6d3f3927b13fda0cf03711157237b837acdb1f9` (emuyia/ems-octakit),
recipe `ot-26914-152100`.

## Current status

Source inspection and file-identity checks only. No imported Python or native
source was executed; no firmware, DSP, emulator or hardware test was run for
this draft. It is excluded from native discovery, the generated catalog and
the configurator. `tests.qualification` is absent, `access.screenshots` is
empty, and publication gates must reject it. The qualification template is
deliberately incomplete and must never be presented as measured evidence.

`npm run sdk:check` verifies the import hashes, declared source subset and
source hygiene without evaluating the manifest. `npm run check` additionally
checks draft metadata, catalog exclusion and failed qualification/UI gates,
then runs the ordinary lightweight application checks and production build.
These checks do not qualify firmware or hardware.

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
- Actual LOAD KIT/SAVE KIT location and relevant menu/control LCD captures on
  supported panels, with exact access steps and module-version/local-image/setup
  provenance. No screenshots have been supplied or created. Complete the documentation/tutorial gate as well: populated README sections, a short practical tutorial, matching tutorial/access steps and actual monochrome/gray PNG captures. Owner review must verify completeness and authenticity.

Place sanitized text reports under `evidence/` or in this file. Fill
`tests.qualification` only from actual reports and recompute its native-source
hash after source paths are final. The source and complete-folder fingerprints
change when this draft is promoted or edited. Keep firmware, extracted stock,
RAM/LCD dumps, card/project fixtures and private logs local and temporary.
Retain only reviewed images and metadata in module media.

## Integration work before firmware builds

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
