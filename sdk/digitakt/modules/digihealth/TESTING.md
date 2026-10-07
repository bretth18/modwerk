# digihealth testing

## In Modwerk

No hardware, audio or timing qualification is claimed. Evidence tier: `none`. The current builder and UI capture results are recorded below.

## Upstream

The author documents their own checks in [upstream/README.md](upstream/README.md). Those results belong to the author’s v1.1 build with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digihealth-1.0.elemod` release object (SHA-256 `aba9413ee205e1368ec3997172a84e59eaa4e787d267bc7a3e94a161b4fcd0f1`) contains 2,988 B in `.run`, 2,560 B in `.bss` and 124 B of table contributions: **5,672 B** in total. This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. This is an upstream object measurement, not a measured Modwerk build or hardware load report.

## Documentation capture — 7 October 2026

Documentation version: `1.0.2-experimental`. Source revision: `6d2a95605901f4f5ea6301dbad16e573380331a6` (`.`). Native source, build declaration and pinned release objects were not changed.

The unchanged vendored elekloader kit 0.4.0 linked and verified the pinned release modules listed in [capture.json](media/capture.json) with the owner’s private stock OS 1.53 file. Built-image SHA-256: `4709095234ef5d94cfa2cceeac07040d6356e6570a69649cf6ed72b698594968`. Module metadata version is separate from the native release versions listed in that record. Firmware and derived images remain private.

Pinned digiemu `c1b5735835923e328f8b4950d6ba927875e5b669` ran firmware-native drawing with `hle=False`, a reviewed patched Unicorn 2.1.4, Python 3.12.13 and a disposable first-boot project in a network-denied macOS sandbox. The record pins the Unicorn source, six patch hashes and local library hash. Only complete, unmodified LCD frames were retained at 6× integer scale and every retained image was opened for review.

- SYS INFO in Settings.
- FAST AUDIO setting with the memory overlay.
- Load overlay on AMP; timing counters unavailable.
- Load overlay on SRC; timing counters unavailable.

UI-only documentation; no hardware, audio, timing, persistence or stress qualification.
CPU/DSP counters display -- because cycle timing is disabled. The readouts are documentation, not resource benchmarks.

Reproduce after building the same module selection using the browser’s vendored elekloader builder and your own OS file, keeping all firmware and emulator outputs outside the checkout:

```sh
python3 scripts/capture-digi-module-ui.py \
  --emulator /path/to/pinned/digiemu \
  --firmware /private/capture/custom.syx \
  --plan sdk/digitakt/modules/digihealth/media/capture-plan.txt \
  --out /private/capture/new-session
```

Run that command inside the isolated sandbox described in [MODULE_UI_CAPTURES.md](../../../../docs/MODULE_UI_CAPTURES.md). `capture-plan.txt` is the exact panel plan used; `capture.json` retains its actual input events and selected timestamps. The capture CLI was smoke-tested from a fresh Digitakt digihealth first boot; these module captures use the same pinned emulator panel APIs. No menu state or LCD labels were injected.

Passed repository validation on 7 October 2026: `npm run modules:generate`, `npm run check`, `npm run module:doctor -- digihealth`, and `npm run modules:check -- --base origin/main`. UI documentation keeps the existing evidence tier and imported resource estimates; hardware, sound quality, persistence, stress behaviour and cycle-accurate performance remain untested in this update.
