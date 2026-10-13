# Digi EQ testing

## Clear and box alignment — 1.0.2-experimental, 11 October 2026

Issue [#185](https://github.com/repeat98/modwerk/issues/185) is reproduced on OS 1.54 with the pinned 1.0b object: the native FUNC + held LFO + PLAY shortcut displays “CLEAR PAGE EQ” but leaves edited bands unchanged. The firmware's unused None page has no stock EQ parameters. The new, guarded master-view clear callback delegates to the stock handler for feedback and other pages, then restores all four bands' default frequency, gain, Q and type, clears partial encoder counts, recomputes the live coefficients and writes only the EQ-owned kit bits. Knob modes and the global override are preserved. The icon now ends at x=13, matching the pattern header; its EQ label is centered.

[evidence/clear-1.0.2.json](evidence/clear-1.0.2.json) binds runtime source SHA-256 `eeeb9242b68a5c0770403caee5feba821fe7960727215a701fe93426e60319af`, compiler, packages, private images and native input observations. Candidate compilation used a tracked-source snapshot of main plus the recorded source/manifest overlay; the base commit alone is not this source. CI must reproduce both committed source-only exports.

- Firmware-free GCC 16.2 / binutils 2.47 compilation passes on OS 1.53 and 1.54 in the pinned container without network or credentials. Exported packages and local recipe materialization produce byte-identical private firmware.
- The unchanged builder accepts core 2.1, DIGICHAIN 1.6, Digi Mono 0.13.3-experimental and Digi EQ 1.0.2-experimental on both releases. Stock hashes, patch overlap, instruction boundaries, placement budgets and saved container verification pass; sections 2, 4, 5 and 8 remain unchanged.
- Final catalogue pins reference source/package commit `1107d484c8d7ad84cfff14917b34acdcb83a53e6`. Both OS releases build without overrides and save/read back the same D185 image hashes below; the tested capture candidate and final pinned release are byte-identical.
- Native panel regressions on both releases edit all sixteen band parameters, then reset them to frequency indices `[25,55,89,114]`, gains `[24,24,24,24]`, Q indices `[4,5,5,4]` and types `[1,2,2,5]`. Comparisons of all eight sound records find zero changed bytes outside EQ-owned bits, including the shared Digi Poly high bit.
- Repeated Clear stays at defaults. The pressed A mode still edits Q afterward. FUNC+PLAY without held LFO leaves the EQ unchanged, and Internal Mixer Clear leaves the edited EQ unchanged. Global override preservation is source-reviewed only. Copy/Paste, Undo Clear, physical save/reload and reboot are unqualified.
- Filter DSP, coefficient calculations and stored EQ layout are unchanged by source review. This does not establish working audio or runtime timing on the new linked image.
- Current [media/capture.json](media/capture.json) records complete native EQ and Q/type frames from the exact OS 1.53 D185 candidate, input events, selected timestamps, kit/catalog identities and the local package override. Every retained PNG was opened for review. No menu, parameter or LCD state was injected.

Compiled module memory is 8,578 B `.run` + 564 B `.bss` + 4 B event contribution = **9,146 B**, excluding shared dependencies and alignment. The tested combination passes the linker's 128 KiB shared RAM and 2,304 B fast-RAM checks. Complete stack/heap/lifetime bounds, chip timing and hardware canaries are unmeasured.

### Exact private builds and physical checks

Use your stock recovery file and a disposable project. Build the selection above with output version D185:

| OS | Private firmware SHA-256 |
| --- | --- |
| 1.53 | `d8717d1d10418c6833d8312ba266d96fa7e3ecb03c78c3a927f2e45caeb5b6c5` |
| 1.54 | `255990b52f0c293a57c1c4d27b0deedd0a12ed78cc3cedae40f418f1147c67a6` |

1. Open Master EQ with FUNC + LFO twice. Play distinct audio tracks; edit every band’s gain, frequency, Q and type, including an always-active filter type. Hold FUNC and LFO, then press PLAY (CLEAR). Confirm default values, a flat curve and unchanged audio through the expected bypass/default response on main outs, headphones and USB.
2. Repeat Clear and edit again. Check normal/pressed encoder modes, other master pages, stock pattern Clear, EQ page Copy/Paste and Undo Clear. Confirm other tracks and companion modules remain independent.
3. Test with GLOBAL FX/MIX > MASTER EQ both off and on. Switch patterns with distinct EQ settings; clear the active EQ and confirm the intended per-pattern/global behavior.
4. Save/reload the project, power-cycle the physical unit and repeat with the exact saved image. Exercise the busiest supported project and report dropouts, hangs, changed sounds or lost settings. This is a single master EQ, so per-track EQ instances and FX-slot/DSP-core placement do not apply.

Hardware, audio, DSP timing, complete runtime memory bounds, persistence, physical reboot and stress remain unverified. Owner repeat98 explicitly approved “Approve this exact experimental release and issue closure with the limits disclosed” for this exact 1.0.2 source and both D185 images on 11 October 2026. The complete source/image-bound exception is in the evidence JSON. Closure remains gated on an actual saved live-download verification. Global override is source-reviewed only; Copy/Paste and Undo Clear are unqualified. No hardware pass is recorded, and this does not extend any prior module waiver.

## Historical import in Modwerk

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.1 on each OS release it is built for:

- OS 1.53: built and verified with core 2.1 and digieq 1.0b; the result’s SHA-256 begins `c2017f90d663d012`.
- OS 1.54: built and verified with core 2.1 and digieq 1.0b; the result’s SHA-256 begins `b8f0663db01791b4`.

This is a build check against the owner’s stock files, kept locally, not a hardware test. The built images stay on the owner’s computer.

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.53: combines with digihealth, NEIGHBOR, DIGISLICER, SOPHIE, digichain, Digi Matrix, Digi Mono, Digi Poly and Digi utilities.
- OS 1.54: combines with digihealth, NEIGHBOR, DIGISLICER, digichain, Digi Matrix, Digi Mono, Digi Poly and Digi utilities.

## Upstream

Its author reports Digi EQ 1.0b is not yet tested on a unit; it passes their emulator tests on OS 1.53 and 1.54. Their documentation describes those checks: `tests/emu_eq.py` checks the knobs against the design model, the audio bit for bit against it, and the settings in the kit and the global override; `tests/digiemu_eq.py` boots the firmware and measures a test tone put into the master mix again in the bus the USB stream is built from, against what the model says the settings should do. For 1.0b the author also reports a firmware round trip: settings written, project saved, RAM wiped and project loaded, with all bytes back and the EQ playing them. Their risk table asks owners to check once on the unit, after a power cycle, that a pattern’s EQ came back.

The author documents their checks in [upstream/REPOSITORY.md](upstream/REPOSITORY.md) and in the repository’s [CHANGELOG.md](https://github.com/gdeo607/digi1_mods/blob/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6/CHANGELOG.md) and [RISKS.md](https://github.com/gdeo607/digi1_mods/blob/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6/RISKS.md). Those results belong to the author’s 1.0b builds with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digieq-1.0b.elemod` release object for OS 1.53 (SHA-256 `af5088bf444de4f1c269e56151805e196277568a96645cf216fc947091162969`) contains 8,522 B in `.run`, 564 B in `.bss` and 4 B of table contributions: **9,090 B** in total.

The author’s `digieq-1.0b-os1.54.elemod` release object for OS 1.54 (SHA-256 `82dcd78faf44e67bc7fd0920266bb122583bd60288c1dd03fa878b6f3f9301a0`) contains 8,522 B in `.run`, 564 B in `.bss` and 4 B of table contributions: **9,090 B** in total.

This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. This is an upstream object measurement, not a measured Modwerk build or hardware load report.

## Documentation capture — 7 October 2026

Documentation version: `1.0.1-experimental`. Source revision: `35bacb3730d108e4dc48a7bd6de4c99ae9b161e6` (`mods/digieq`). Native source, build declaration and pinned release objects were not changed.

The unchanged vendored elekloader kit 0.4.0 linked and verified the pinned release modules listed in [capture.json](media/capture.json) with the owner’s private stock OS 1.53 file. Built-image SHA-256: `4542b2464429b97b77205ed7c793d39c94a5b3bce2116896411369f0e2a07e80`. Module metadata version is separate from the native release versions listed in that record. Firmware and derived images remain private.

Pinned digiemu `c1b5735835923e328f8b4950d6ba927875e5b669` ran firmware-native drawing with `hle=False`, a reviewed patched Unicorn 2.1.4, Python 3.12.13 and a disposable first-boot project in a network-denied macOS sandbox. The record pins the Unicorn source, six patch hashes and local library hash. Only complete, unmodified LCD frames were retained at 6× integer scale and every retained image was opened for review.

- Master EQ (2/4): band levels and frequencies.
- Master EQ: pressed knobs show Q and filter type.

UI-only documentation; no hardware, audio, timing, persistence or stress qualification.

Reproduce after building the same module selection using the browser’s vendored elekloader builder and your own OS file, keeping all firmware and emulator outputs outside the checkout:

```sh
python3 scripts/capture-digi-module-ui.py \
  --emulator /path/to/pinned/digiemu \
  --firmware /private/capture/custom.syx \
  --plan sdk/digitakt/modules/digieq/media/capture-plan.txt \
  --out /private/capture/new-session
```

Run that command inside the isolated sandbox described in [MODULE_UI_CAPTURES.md](../../../../docs/MODULE_UI_CAPTURES.md). `capture-plan.txt` is the exact panel plan used; `capture.json` retains its actual input events and selected timestamps. The capture CLI was smoke-tested from a fresh Digitakt digihealth first boot; these module captures use the same pinned emulator panel APIs. No menu state or LCD labels were injected.

Passed repository validation on 7 October 2026: `npm run modules:generate`, `npm run check`, `npm run module:doctor -- digieq`, and `npm run modules:check -- --base origin/main`. UI documentation keeps the existing evidence tier and imported resource estimates; hardware, sound quality, persistence, stress behaviour and cycle-accurate performance remain untested in this update.
