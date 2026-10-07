# Digi Mono testing

## In Modwerk

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.1 on each OS release:

- OS 1.53: core 2.1, DIGICHAIN 1.6 and Digi Mono 0.13b, built and verified; result SHA-256 starts `0398b1d7a05f4381`.
- OS 1.54: core 2.1, DIGICHAIN 1.6 and Digi Mono 0.13b, built and verified; result SHA-256 starts `30f8c005bf648133`.

This is a build check against the owner’s stock files, which are kept locally. It is not a hardware test.

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.53: combines with digihealth, Digi EQ, Digi Matrix, Digi Poly and Digi utilities; refused beside NEIGHBOR, DIGISLICER and SOPHIE, whose patch sites overlap (the builder names the sites).
- OS 1.54: combines with digihealth, Digi EQ, Digi Matrix, Digi Poly and Digi utilities; refused beside NEIGHBOR and DIGISLICER, whose patch sites overlap (the builder names the sites).

## Upstream

Digi Mono is not yet tested on a unit, its author reports; it passes their emulator tests on OS 1.53 and 1.54. The author’s design notes in [upstream/DESIGN.md](upstream/DESIGN.md) describe those checks: the engine measured on a PC build (`tests/mono_signal.py`), the ColdFire build compared bit for bit with the PC build (`tests/emu_mono.py`), every machine played in the real firmware in the digiemu emulator and compared bit for bit with the engine (`tests/digiemu_mono.py`), and the FLTR, AMP and LFO pages on a Digi Mono track (`tests/digiemu_mono_fx.py`). Those results belong to the author’s 0.13b builds with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digimono-0.13b.elemod` release object for OS 1.53 (SHA-256 `79b51a364b1b7fd8ca13ac6aacba15bd1439bb46569b11d1ad5b3a35b1cec3ec`) contains 22,931 B in `.run`, 9,272 B in `.bss` and 32 B of table contributions: **32,235 B** in total.

The author’s `digimono-0.13b-os1.54.elemod` release object for OS 1.54 (SHA-256 `bbd79b944ab7a2176d933d671cc3019e2f55748412c37e1b9c64779348137dbc`) contains 22,931 B in `.run`, 9,272 B in `.bss` and 32 B of table contributions: **32,235 B** in total.

This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment, which the browser estimate reserves separately, and DIGICHAIN, which counts as its own module. This is an upstream object measurement, not a measured Modwerk build or hardware load report.

## Documentation capture — 7 October 2026

Documentation version: `0.13.1-experimental`. Source revision: `35bacb3730d108e4dc48a7bd6de4c99ae9b161e6` (`mods/digimono`). Native source, build declaration and pinned release objects were not changed.

The unchanged vendored elekloader kit 0.4.0 linked and verified the pinned release modules listed in [capture.json](media/capture.json) with the owner’s private stock OS 1.53 file. Built-image SHA-256: `734d97eee93237736fbeea07a756ed04af28ad6840b2e6fb9953e69423b8274e`. Module metadata version is separate from the native release versions listed in that record. Firmware and derived images remain private.

Pinned digiemu `c1b5735835923e328f8b4950d6ba927875e5b669` ran firmware-native drawing with `hle=False`, a reviewed patched Unicorn 2.1.4, Python 3.12.13 and a disposable first-boot project in a network-denied macOS sandbox. The record pins the Unicorn source, six patch hashes and local library hash. Only complete, unmodified LCD frames were retained at 6× integer scale and every retained image was opened for review.

- MONO SIN in the machine chooser.
- MONO SIN controls.
- MONO NOISE controls.
- MONO SAW controls.
- MONO PULSE controls.
- MONO ENS controls.
- MONO VO controls.

UI-only documentation; no hardware, audio, timing, persistence or stress qualification.

Reproduce after building the same module selection using the browser’s vendored elekloader builder and your own OS file, keeping all firmware and emulator outputs outside the checkout:

```sh
python3 scripts/capture-digi-module-ui.py \
  --emulator /path/to/pinned/digiemu \
  --firmware /private/capture/custom.syx \
  --plan sdk/digitakt/modules/digimono/media/capture-plan.txt \
  --out /private/capture/new-session
```

Run that command inside the isolated sandbox described in [MODULE_UI_CAPTURES.md](../../../../docs/MODULE_UI_CAPTURES.md). `capture-plan.txt` is the exact panel plan used; `capture.json` retains its actual input events and selected timestamps. The capture CLI was smoke-tested from a fresh Digitakt digihealth first boot; these module captures use the same pinned emulator panel APIs. No menu state or LCD labels were injected.

Passed repository validation on 7 October 2026: `npm run modules:generate`, `npm run check`, `npm run module:doctor -- digimono`, and `npm run modules:check -- --base origin/main`. UI documentation keeps the existing evidence tier and imported resource estimates; hardware, sound quality, persistence, stress behaviour and cycle-accurate performance remain untested in this update.
