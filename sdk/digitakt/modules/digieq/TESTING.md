# Digi EQ testing

## In Modwerk

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
