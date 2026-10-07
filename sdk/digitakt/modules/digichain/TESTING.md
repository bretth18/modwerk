# digichain testing

## In Modwerk

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.1 on each OS release:

- OS 1.53: core 2.1 and digichain 1.6, built and verified, SHA-256 `5dcead8c87465218…`.
- OS 1.54: core 2.1 and digichain 1.6, built and verified, SHA-256 `a5e6a765d3ca7bfa…`.

This is a build check against the owner’s stock OS files, kept locally, not a hardware test.

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.53: combines with digihealth, Digi EQ, Digi Matrix, Digi Mono, Digi Poly and Digi utilities; refused beside NEIGHBOR, DIGISLICER and SOPHIE, whose patch sites overlap (the builder names the sites).
- OS 1.54: combines with digihealth, Digi EQ, Digi Matrix, Digi Mono, Digi Poly and Digi utilities; refused beside NEIGHBOR and DIGISLICER, whose patch sites overlap (the builder names the sites).

## Upstream

Not yet tested on a unit, its author reports; it passes the author’s emulator tests on OS 1.53 and 1.54.

The author documents their checks in [upstream/README.md](upstream/README.md). In the digiemu emulator (`tests/digiemu_chain.py`), builds with core, digichain and the author’s -chain builds of SOPHIE, NEIGHBOR and DIGISLICER, with Digi Mono, were compared with builds of one mod as it is: the same SRC page pixels, the same knob maximums, and SOPHIE’s and NEIGHBOR’s voices the same bit for bit. NEIGHBOR’s new SLOT behaviour and its pitch shifter were checked there too. On OS 1.54, with core, digichain, the chained SOPHIE and Digi Mono, the LFO page’s DEST list and box showed MONO SAW’s and SOPHIE’s names, and ONESHOT’s as stock.

Those results belong to the author’s 1.6 build with elekloader’s toolchain and core, and to the -chain builds of the other mods; they do not qualify a Modwerk build.

## Imported memory estimate

- The author’s `digichain-1.6.elemod` release object for OS 1.53 (SHA-256 `819f6045b5ad4deaa720c74f0126d078cc15c019dfcb07710112ac453b65d47d`) contains 1,792 B in `.run`, 32 B in `.bss` and 4 B of table contributions: **1,828 B** in total.
- The author’s `digichain-1.6-os1.54.elemod` release object for OS 1.54 (SHA-256 `5d4910f597874ac2f5348e2cd76bea7e34b9ea0060c9bcf1406dd317a7af9e42`) contains 1,792 B in `.run`, 32 B in `.bss` and 4 B of table contributions: **1,828 B** in total.

This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. The author’s README gives 728 bytes for digichain; the figures above are measured from the 1.6 release objects. This is an upstream object measurement, not a measured Modwerk build or hardware load report.

## Documentation capture — 7 October 2026

Documentation version: `1.6.1-experimental`. Source revision: `35bacb3730d108e4dc48a7bd6de4c99ae9b161e6` (`mods/digichain`). Native source, build declaration and pinned release objects were not changed.

The unchanged vendored elekloader kit 0.4.0 linked and verified the pinned release modules listed in [capture.json](media/capture.json) with the owner’s private stock OS 1.53 file. Built-image SHA-256: `9cd7b202f12fe141fa7451bd61d2c750d8d75395ac10d58b1cc2efd252b7a627`. Module metadata version is separate from the native release versions listed in that record. Firmware and derived images remain private.

Pinned digiemu `c1b5735835923e328f8b4950d6ba927875e5b669` ran firmware-native drawing with `hle=False`, a reviewed patched Unicorn 2.1.4, Python 3.12.13 and a disposable first-boot project in a network-denied macOS sandbox. The record pins the Unicorn source, six patch hashes and local library hash. Only complete, unmodified LCD frames were retained at 6× integer scale and every retained image was opened for review.

- Dependent POLY machine supplied through digichain.
- POLY consumer controls; digichain has no page of its own.

UI-only documentation; no hardware, audio, timing, persistence or stress qualification.
Captured in a combined digichain + Digi Poly build. The depicted controls belong to Digi Poly; digichain has no independent UI.

Reproduce after building the same module selection using the browser’s vendored elekloader builder and your own OS file, keeping all firmware and emulator outputs outside the checkout:

```sh
python3 scripts/capture-digi-module-ui.py \
  --emulator /path/to/pinned/digiemu \
  --firmware /private/capture/custom.syx \
  --plan sdk/digitakt/modules/digichain/media/capture-plan.txt \
  --out /private/capture/new-session
```

Run that command inside the isolated sandbox described in [MODULE_UI_CAPTURES.md](../../../../docs/MODULE_UI_CAPTURES.md). `capture-plan.txt` is the exact panel plan used; `capture.json` retains its actual input events and selected timestamps. The capture CLI was smoke-tested from a fresh Digitakt digihealth first boot; these module captures use the same pinned emulator panel APIs. No menu state or LCD labels were injected.

Passed repository validation on 7 October 2026: `npm run modules:generate`, `npm run check`, `npm run module:doctor -- digichain`, and `npm run modules:check -- --base origin/main`. UI documentation keeps the existing evidence tier and imported resource estimates; hardware, sound quality, persistence, stress behaviour and cycle-accurate performance remain untested in this update.
