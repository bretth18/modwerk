# Digi Poly testing

## In Modwerk

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.1 on each release it is built for:

- OS 1.53: built and verified with core 2.1, DIGICHAIN 1.6 and Digi Poly 2.0. The result’s SHA-256 begins `53b3776e9095aa3f`.
- OS 1.54: built and verified with core 2.1, DIGICHAIN 1.6 and Digi Poly 2.0. The result’s SHA-256 begins `bb19da68134f031c`.

This is a build check against the owner’s stock files, kept locally. It is not a hardware test.

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.53: combines with digihealth, Digi EQ, Digi Matrix, Digi Mono and Digi utilities; refused beside NEIGHBOR, DIGISLICER and SOPHIE, whose patch sites overlap (the builder names the sites).
- OS 1.54: combines with digihealth, Digi EQ, Digi Matrix, Digi Mono and Digi utilities; refused beside NEIGHBOR and DIGISLICER, whose patch sites overlap (the builder names the sites).

## Upstream

The author reports that Digi Poly is not yet tested on a unit, and that it passes their emulator tests on OS 1.53 and 1.54. They check it in two parts: `tests/emu_poly.py` runs the mod’s own code in unicorn without booting the firmware (voice choice, the settings row, the chord’s messages, knob and level mirroring, the TRIG page’s fader), and `tests/digiemu_poly.py` boots the firmware in the digiemu emulator for the TRIG page, the key’s chord, chords from the sequencer on four voices, per-pattern pools and recording. The author’s [README](upstream/REPOSITORY.md) and [RISKS.md](https://github.com/gdeo607/digi1_mods/blob/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6/RISKS.md) describe these checks. Those results belong to the author’s 2.0 builds with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digipoly-2.0.elemod` release object for OS 1.53 (SHA-256 `1d2615c58e0a944c1ca49741739be4e1b3cc26cf8d94ce3ab1cd6af78c47ebac`) contains 4,723 B in `.run`, 248 B in `.bss` and 12 B of table contributions: **4,983 B** in total.

The author’s `digipoly-2.0-os1.54.elemod` release object for OS 1.54 (SHA-256 `4cc14624253150776b2eedd8e02b8b86b378888b1459cd2f0a0b49148b48263e`) contains the same: 4,723 B in `.run`, 248 B in `.bss` and 12 B of table contributions: **4,983 B** in total.

This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment, which the browser estimate reserves separately, and DIGICHAIN, which Digi Poly requires and which has its own estimate. This is an upstream object measurement, not a measured Modwerk build or hardware load report.

## Documentation capture — 7 October 2026

Documentation version: `2.0.1-experimental`. Source revision: `35bacb3730d108e4dc48a7bd6de4c99ae9b161e6` (`mods/digipoly`). Native source, build declaration and pinned release objects were not changed.

The unchanged vendored elekloader kit 0.4.0 linked and verified the pinned release modules listed in [capture.json](media/capture.json) with the owner’s private stock OS 1.53 file. Built-image SHA-256: `9cd7b202f12fe141fa7451bd61d2c750d8d75395ac10d58b1cc2efd252b7a627`. Module metadata version is separate from the native release versions listed in that record. Firmware and derived images remain private.

Pinned digiemu `c1b5735835923e328f8b4950d6ba927875e5b669` ran firmware-native drawing with `hle=False`, a reviewed patched Unicorn 2.1.4, Python 3.12.13 and a disposable first-boot project in a network-denied macOS sandbox. The record pins the Unicorn source, six patch hashes and local library hash. Only complete, unmodified LCD frames were retained at 6× integer scale and every retained image was opened for review.

- POLY in the machine chooser.
- POLY chord controls on TRIG.
- POLY voice pool in Settings.

UI-only documentation; no hardware, audio, timing, persistence or stress qualification.

Reproduce after building the same module selection using the browser’s vendored elekloader builder and your own OS file, keeping all firmware and emulator outputs outside the checkout:

```sh
python3 scripts/capture-digi-module-ui.py \
  --emulator /path/to/pinned/digiemu \
  --firmware /private/capture/custom.syx \
  --plan sdk/digitakt/modules/digipoly/media/capture-plan.txt \
  --out /private/capture/new-session
```

Run that command inside the isolated sandbox described in [MODULE_UI_CAPTURES.md](../../../../docs/MODULE_UI_CAPTURES.md). `capture-plan.txt` is the exact panel plan used; `capture.json` retains its actual input events and selected timestamps. The capture CLI was smoke-tested from a fresh Digitakt digihealth first boot; these module captures use the same pinned emulator panel APIs. No menu state or LCD labels were injected.

Passed repository validation on 7 October 2026: `npm run modules:generate`, `npm run check`, `npm run module:doctor -- digipoly`, and `npm run modules:check -- --base origin/main`. UI documentation keeps the existing evidence tier and imported resource estimates; hardware, sound quality, persistence, stress behaviour and cycle-accurate performance remain untested in this update.
