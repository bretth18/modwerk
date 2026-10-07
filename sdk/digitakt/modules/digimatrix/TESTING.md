# Digi Matrix testing

## In Modwerk

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.1 on each OS release it is built for:

- OS 1.53: core 2.1 and Digi Matrix 1.0b, built and verified; result SHA-256 begins `41f337c292d67eec`.
- OS 1.54: core 2.1 and Digi Matrix 1.0b, built and verified; result SHA-256 begins `c49d12a1a7d55db6`.

This is a build check against the owner’s stock files, kept locally. It is not a hardware test.

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.53: combines with digihealth, NEIGHBOR, DIGISLICER, SOPHIE, digichain, Digi EQ, Digi Mono, Digi Poly and Digi utilities.
- OS 1.54: combines with digihealth, NEIGHBOR, DIGISLICER, digichain, Digi EQ, Digi Mono, Digi Poly and Digi utilities.

## Upstream

Not yet tested on a unit, its author reports; it passes their emulator tests on OS 1.53 and 1.54. The author’s repository describes two checks: `tests/emu_matrix.py` runs both engine passes, the clamps, the keys, the knobs and the drawing in unicorn, and `tests/digiemu_matrix.py` boots the firmware in the digiemu emulator to show the SETTINGS row, the page, what its keys and knobs write into the pattern’s kit, and one track’s LFO moving another track’s parameter. The author’s RISKS.md asks owners to check once, after a power cycle on a unit, that a pattern’s matrix came back.

Those results belong to the author’s 1.0b builds with elekloader’s toolchain and core; they do not qualify a Modwerk build. The author’s overview is kept in [upstream/REPOSITORY.md](upstream/REPOSITORY.md).

## Imported memory estimate

The author’s 1.0b release objects, from the repository’s `elemods/` folder at commit `35bacb3730d1`:

- OS 1.53: `digimatrix-1.0b.elemod` (SHA-256 `792810c2432cadab14e6db5c02957c85714f87eca2a066d68b28e8e134148a9b`) contains 4,145 B in `.run`, 128 B in `.bss` and 20 B of table contributions: **4,293 B** in total.
- OS 1.54: `digimatrix-1.0b-os1.54.elemod` (SHA-256 `f12fd6c0f154f1358c5b16916630865263cb81c1b72a13e2795f6eba171c95aa`) contains 4,145 B in `.run`, 128 B in `.bss` and 20 B of table contributions: **4,293 B** in total.

This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. These are upstream object measurements, not measurements of a Modwerk build or a hardware load report.

## Documentation capture — 7 October 2026

Documentation version: `1.0.1-experimental`. Source revision: `35bacb3730d108e4dc48a7bd6de4c99ae9b161e6` (`mods/digimatrix`). Native source, build declaration and pinned release objects were not changed.

The unchanged vendored elekloader kit 0.4.0 linked and verified the pinned release modules listed in [capture.json](media/capture.json) with the owner’s private stock OS 1.53 file. Built-image SHA-256: `d4294009b411885a2c02262859daa3b53e3cb3f2c6ed5fe6507b889b645e6069`. Module metadata version is separate from the native release versions listed in that record. Firmware and derived images remain private.

Pinned digiemu `c1b5735835923e328f8b4950d6ba927875e5b669` ran firmware-native drawing with `hle=False`, a reviewed patched Unicorn 2.1.4, Python 3.12.13 and a disposable first-boot project in a network-denied macOS sandbox. The record pins the Unicorn source, six patch hashes and local library hash. Only complete, unmodified LCD frames were retained at 6× integer scale and every retained image was opened for review.

- MOD MATRIX in Settings.
- Eight matrix slots, initially disabled.
- Enabled T1 LFO1 route and its depth.

UI-only documentation; no hardware, audio, timing, persistence or stress qualification.

Reproduce after building the same module selection using the browser’s vendored elekloader builder and your own OS file, keeping all firmware and emulator outputs outside the checkout:

```sh
python3 scripts/capture-digi-module-ui.py \
  --emulator /path/to/pinned/digiemu \
  --firmware /private/capture/custom.syx \
  --plan sdk/digitakt/modules/digimatrix/media/capture-plan.txt \
  --out /private/capture/new-session
```

Run that command inside the isolated sandbox described in [MODULE_UI_CAPTURES.md](../../../../docs/MODULE_UI_CAPTURES.md). `capture-plan.txt` is the exact panel plan used; `capture.json` retains its actual input events and selected timestamps. The capture CLI was smoke-tested from a fresh Digitakt digihealth first boot; these module captures use the same pinned emulator panel APIs. No menu state or LCD labels were injected.

Passed repository validation on 7 October 2026: `npm run modules:generate`, `npm run check`, `npm run module:doctor -- digimatrix`, and `npm run modules:check -- --base origin/main`. UI documentation keeps the existing evidence tier and imported resource estimates; hardware, sound quality, persistence, stress behaviour and cycle-accurate performance remain untested in this update.
