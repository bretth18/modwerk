# CC Map testing

Draft version: `0.1.0-experimental`.
Source pin: `8d0ad6f4f82c2efbc10e1c65eefbce0ad1cec4bf` (sambanks/octabam).

## Current status and commands

This is a source draft outside native discovery, compilation and the public
catalog. No imported Python or assembly was executed. No firmware, DSP,
emulator, audio render or hardware test ran during this import.
`tests.qualification` is absent, `access.screenshots` and `media` are empty,
and both publication gates reject it. The eleven-module baseline is unchanged.

Use Node 24 from the repository root:

```sh
npm run sdk:check
npm run test -- src/catalog/cc-map-draft.test.ts
npm run modules:check -- --base origin/main
npm run check
```

The SDK check verifies source hashes, licence, static declaration and import
hygiene without evaluating the manifest. The domain test checks metadata,
failed qualification/UI gates and exclusion from discovery, selections and
the compiler's source inventory. The full check also runs ordinary application
lint, domain tests, type checks and the static production build. These are
application/source-integrity checks, not firmware qualification.

## Historical upstream results

[Pinned upstream notes](OCTABAM.md) describe `tools/verify/verify_ccmap.py`
under Unicorn: CC 62 writes and clamps Part/live/shadow bytes for tracks 0–7;
CC 40 passes onward without page-2 writes. The ColdFire port reports CC 68
reaching FX1 page 2 and its DSP record on 15 September 2026. These gates are
not imported or run here and their results do not prove this draft's integration.

Historical MKII image 96 is described as moving SHMR via CC 63 and changing
reverb-tail bands; image 97 exercised FX1 MODE via CC 69. The native manifest
labels its proof as hardware use on 13 September 2026. Earlier images wrote
the wrong page-2 byte. Preserve these notes as historical evidence, not a
passed current-version hardware stress record.

## Required qualification reports

- Worst-case ColdFire cycles per MIDI event, the supported maximum workload
  and a real-time event budget with stock dispatch, scheduling and headroom.
  Include all eight tracks sharing a channel, dense CC bursts, endpoints,
  count/min clamps, AUDIO CC IN changes, effect/Part/mode changes and
  simultaneous LFO, p-lock, scene and MIDI modulation with all eight audio
  tracks active. Measure channel-map rebuilding, store/dirty-flag work and
  refresh costs. Document any indirect DSP workload without inventing a DSP
  algorithm or counts.
- Exact linked allocation/address map and totals for cave code and count
  tables, alignment, stack peaks, shared state and any other reservations.
  The upstream authored oracle is 712 code bytes plus twelve table bytes;
  the four-byte dispatch poke replaces an existing vector. Neither fact
  is a complete memory report or a new allocation measurement.
- At least 60 continuous minutes on each claimed real MKI/MKII model, all
  eight audio tracks active and maximum applicable MIDI/USB traffic. Record
  tester/date, module version, tested-source SHA-256, local-image SHA-256 and
  reproducible stress-project recipe/fingerprint. Audio continuity, transport,
  controls, memory integrity and recovery must pass, including cold boot and
  Part save/reload. Firmware, full projects/cards and private logs stay local.
- Actual AUDIO CC IN/location and relevant FX1 control-page captures with
  exact panel/menu sequences, monochrome PNGs, version/build/setup provenance
  and synchronized README/tutorial/manifest documentation. No capture or
  exact hardware menu path has been verified for this import.

Complete [the qualification template](../../../public/module-qualification.example.json)
from actual reports, then bind `tests.qualification` to the new version,
native-source hash and local build hash. Keep sanitized text reports in this
file or `evidence/`. The owner must verify actual results and source/media
rights before merging a qualified publication PR. A source or documentation
edit requires a higher semantic version and invalidates the old evidence.

## Integration and rejection coverage

Review the MIDI dispatch-vector claim at `0x400d64a0`, floating cave placement,
the lazy stock guard and linker-defined `CC_NEXT` / `CC_MODEDEF1/2` symbols
against the pinned native remixer. Keep the stock-free source-build path
separate from local firmware composition; never give firmware to automation.

CC 62–67 are consumed but only write when the FX2 ID is BusDelay (6) or
BusVerb (7). Those engines are outside scope; do not import them to make the
block appear supported. Verify no write for every current catalog/stock FX2
and for FX1 NONE; verify CC 68–73 against supported FX1 descriptor ranges.
Outside-range CCs must retain stock behavior. Test disabled AUDIO CC IN,
matching/nonmatching/shared channels, over-count values and pedal overlap.
The upstream MODE DEFAULTS and SCENES KITS overrides are not enabled here.

All Octamod combinations remain unverified, including MIDI Scenes, OctaKit,
Scale Quantizer, internal USB MIDI and USB Audio. Detect actual hook/arena
collisions and reject unsupported combinations. Upstream leaves hardware
SCENES KITS chaining and FX1-to-DSP THRU updates open. Browser/native full-byte
parity, altered/missing firmware rejection and packaging integrity are required
before admitting CC Map to firmware builds. Ordinary visitor builds must
remain lightweight and never run this qualification workload.
