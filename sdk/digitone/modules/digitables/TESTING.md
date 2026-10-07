# digitables testing

## In Modwerk

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.2:

- OS 1.43: built and verified, core 2.2 with digitables 1.3, SHA-256 prefix `aea014f61feb5230`.

This is a build check against the owner’s stock files, kept locally. It is not a hardware test.

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.43: combines with digihealth.

## Upstream

The author reports testing on a Digitone mk1 (3–4 October 2026): the TBL page, the table editor, the fast speeds, the Mod Menu and ADD steps. Not yet checked: the tables restored at power-up, and the arpeggiator with tables. The author’s documentation in [upstream/README.md](upstream/README.md) adds that the Digitone Keys runs the same OS file but has not been tried, that the power-up step cannot be shown in the author’s emulator, that portamento has not been tried with tables, and that digitables links with digihealth 1.1 in elekloader’s lint but the two have not been run together.

Those results belong to the author’s v1.3 build with elekloader’s toolchain and core-dn1 2.2; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digitables-1.3.elemod` release object for OS 1.43 (SHA-256 `a9a2335d0f0c80c17103062bb731a3560af5aca3b05b1b4650713dd273ca5511`) contains 5,248 B in `.run`, 3,765 B in `.bss` and 48 B of table contributions (12 entries of 4 B: its 7 event subscriptions and its 5 table contributions): **9,061 B** in total. This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. This is an upstream object measurement, not a measured Modwerk build or hardware load report.

## Documentation capture — 7 October 2026

Documentation version: `1.3.1-experimental`. Source revision: `5bbd9adffbd0f2d97fa0553613c507b43fca3bda` (`.`). Native source, build declaration and pinned release objects were not changed.

The unchanged vendored elekloader kit 0.4.0 linked and verified the pinned release modules listed in [capture.json](media/capture.json) with the owner’s private stock OS 1.43 file. Built-image SHA-256: `1d614a5c85878781cd55b3d9ee261f34345fc95ab14908863b1932f87fa44bb6`. Module metadata version is separate from the native release versions listed in that record. Firmware and derived images remain private.

Pinned digiemu `c1b5735835923e328f8b4950d6ba927875e5b669` ran firmware-native drawing with `hle=False`, a reviewed patched Unicorn 2.1.4, Python 3.12.13 and a disposable first-boot project in a network-denied macOS sandbox. The record pins the Unicorn source, six patch hashes and local library hash. Only complete, unmodified LCD frames were retained at 6× integer scale and every retained image was opened for review.

- Third AMP page: TBL and SPD.
- Table editor with step 1 NOTE at +04.

UI-only documentation; no hardware, audio, timing, persistence or stress qualification.
Editor opened using a 5-second emulated T1 hold; physical long-press timing and table playback were not measured.

Reproduce after building the same module selection using the browser’s vendored elekloader builder and your own OS file, keeping all firmware and emulator outputs outside the checkout:

```sh
python3 scripts/capture-digi-module-ui.py \
  --emulator /path/to/pinned/digiemu \
  --firmware /private/capture/custom.syx \
  --plan sdk/digitone/modules/digitables/media/capture-plan.txt \
  --out /private/capture/new-session
```

Run that command inside the isolated sandbox described in [MODULE_UI_CAPTURES.md](../../../../docs/MODULE_UI_CAPTURES.md). `capture-plan.txt` is the exact panel plan used; `capture.json` retains its actual input events and selected timestamps. The capture CLI was smoke-tested from a fresh Digitakt digihealth first boot; these module captures use the same pinned emulator panel APIs. No menu state or LCD labels were injected.

Passed repository validation on 7 October 2026: `npm run modules:generate`, `npm run check`, `npm run module:doctor -- digitables`, and `npm run modules:check -- --base origin/main`. UI documentation keeps the existing evidence tier and imported resource estimates; hardware, sound quality, persistence, stress behaviour and cycle-accurate performance remain untested in this update.
