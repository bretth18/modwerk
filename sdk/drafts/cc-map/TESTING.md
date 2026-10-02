# CC Map testing

Draft version: `0.1.1-experimental`.
Source pin: `8d0ad6f4f82c2efbc10e1c65eefbce0ad1cec4bf` (sambanks/octabam).

## Current status and commands

This is a source draft outside public native discovery, release compilation
and the public catalog. Imported Python and assembly were evaluated only in
an isolated local Docker build for the explicitly requested LCD captures.
The linked cave matched its authored reference. An isolated emulator session
captured six actual LCD pages, including a visible CC 68 write to FILTER's
HP slope. No firmware/DSP qualification suite, audio render, transport playback,
hardware stress project or browser parity test ran.
`tests.qualification` is absent and publication still fails that gate.
Version-matched actual LCD captures now pass the UI metadata gate. The
eleven-module baseline and approved compiler source inventory are unchanged.

Use Node 24 from the repository root:

```sh
npm run sdk:check
npm run test -- src/catalog/cc-map-draft.test.ts
npm run modules:check -- --base origin/main
npm run check
```

The SDK check verifies source hashes, licence, static declaration, capture
identities and import hygiene without evaluating the manifest. Domain tests
check metadata, accepted UI evidence, failed qualification and exclusion from
discovery, selections and the compiler's source inventory. Screenshot checks
inspect actual monochrome PNG pixels. The full check also runs ordinary application
lint, domain tests, type checks and the static production build. These are
application/source-integrity checks, not firmware qualification.

## Actual LCD captures — 2 October 2026

The owner requested a thumbnail, complete documentation and actual OT
screenshots. Only local UI capture builds were authorized; this is not
publication or firmware-download approval. The capture profile contains
CC MAP and stock effects, with `static_stock=True`. BusDelay, BusVerb,
MODE DEFAULTS, SCENES KITS and every other source module are excluded.

The native builder is the SDK's `tools/build/build_bus.py` at tool revision
`b8deefc88b2c3e5f3c6158e364eb741df1924e1d`. A local wrapper supplies the
stock-plus-CC-MAP `Remix` profile and calls `build_bus.main()` in an ephemeral
Docker container: network disabled, capabilities dropped, no new privileges,
read-only container filesystem, unprivileged UID, only the private temporary
workspace mounted and no host credentials. The local image builder received
the owner's fingerprint-verified 1.40C extraction. Firmware never entered
source-release automation or the PR.

The 724-byte linked cave matched `legacy_bytes()` at its native placement.
Capture image SHA-256:
`2ca87b1313e1f6a1776eb11314dfd2082ec273fad3fa8c0432dc23a35ab59812`.
The emulator was built from the SDK source using the existing patched local
cores in the same isolated container. No CTest/native gate suite was run.
[media/capture.json](media/capture.json) records exact source/tool identities,
profile, build settings, capture plans, hashes and reproduction details.

Capture uses `scripts/capture-module-ui.py`, a fresh empty scratch FAT card,
MKII panel, stopped transport, `--dsp --frame --main-level off`, and actual
128×64 LCD pixels at scale 6. Docker shared memory is 512 MiB. The LCD
renderer maps its two pixel values to `(235,235,235)` and `(24,24,24)` before
creating PNGs; label shapes and control pixels are unchanged. A temporary
adapter for the second session accepts one bounded MIDI CC action and sends
the emulator's documented `midi b0 44 01` command followed by `run 200`.
The adapter changes and exact plans are recorded, not hidden behind a UI poke.

Verified UI-only results:

- PROJ > MIDI > CONTROL shows AUDIO CC IN enabled.
- MIDI > CHANNELS shows T1 TRIG CH 1 and AUTO CH 11 as separate settings.
- T1 FX1 and FUNC+FX1 reach FILTER's main and SETUP pages.
- Real UART0 input CC 68 value 1 on channel 1 changes FILTER's HP from
  12 dB to 24 dB. Closing/reopening SETUP refreshes the display, because the
  cave omits the stock editor's redraw call. No memory poke changed the control.

Every committed capture was visually inspected. The thumbnail is a separate
original routing illustration, explicitly labelled as such. These captures
prove only the documented MKII emulator UI paths and one visible control write.
MKI behavior, other effect controls, audio response, Part save/reload,
maximum workload, hardware, native/browser packaging and combinations remain
unverified. Temporary images, cards, raw LCD/RAM files and logs are removed;
only reviewed PNGs and sanitized metadata enter module media.

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
  and synchronized README/tutorial/manifest documentation. The six actual
  MKII emulator captures now document the enable/channel/FX1 paths and one
  example; the owner must verify complete coverage and rights. Real-hardware
  menu paths and MKI-specific access remain unverified.

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
