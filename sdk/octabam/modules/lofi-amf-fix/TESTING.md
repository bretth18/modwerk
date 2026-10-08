# LO-FI AMF Fix testing

Only results that were actually produced are recorded here. Anything not listed as run is not tested.

## Source identity

- Imported from `sambanks/octabam` `modules/lofi-amf-fix` at `063a42626a40f863c0e1b056155b74f8b5666004` (Sam Banks's declaration; the module's files last changed in `7f6d9cc2`).
- Fix author's repository: `bryantysinger/octa-bt-pt` at `e970dd0f9841ce5f648c2a257342cb8a3a05b54a` (licence only is copied, as `upstream/LICENSE`).
- Every copied file, its source path, Git blob and SHA-256, and the two transformed files (`manifest.py`: guarded pokes; `upstream/README.md`: the stock word's hex elided) are recorded in `sdk/imports/lofi-amf-fix-063a426.json`.
- Modwerk branch `lofi-amf-fix` off `main` at `bc00c723b0d85fbdbe18ee5de938bad0f56aa0a6`.

## What upstream measured (not reproduced here)

- octabam: both sites disassembled against the stock image, `mpysu x0,y0,a` before and `mpyuu x0,y0,a` after, at P:0x01bef (payload A) and P:0x019af (payload B), resolved to image addresses with `tools/build/dsp_modmap.py`. Proof level `CHECK`; not flashed.
- octa-bt-pt: AMF 0-127 × fine 0-127 (16,384 points) through the DSP emulator with the fix, zero monotonicity violations; the eleven stock violations (AMF 8, 17, 23, 28, 32, 35, 37, 40, 42, 45, 48) resolved. That sweep exercised payload A only; payload B cannot be booted in `dsp_host`.

## Commands run in this repository

8 October 2026: Linux sandbox (Node 22.22.0), and Bryan Tysinger's Mac (Node 24.21.0) for the doctor and check.

| Command | Result |
| --- | --- |
| Import `manifest.py` with the vendored `remix.schema` (no firmware) | passes: `Kind.CF_PATCH`, two pokes at `0x400f4bbb` and `0x40107b0c`, 3-byte guards, write `cd2701` |
| `npm run licenses:generate`, `npm run licenses:check` | pass |
| `npm run module:doctor -- lofi-amf-fix` | see the last section |

Confirmed 8 October 2026 against an original OS 1.40C update (MAIN OS 1,112,560 bytes, SHA-256 `164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e`), in the sandbox and again on Bryan Tysinger's Mac:

| | payload A (tracks 5-8) | payload B (tracks 1-4) |
| --- | --- | --- |
| DSP address | P:0x1bef | P:0x19af |
| Image address via `tools/build/dsp_modmap.py` | `0x400f4bbb` (matches manifest) | `0x40107b0c` (matches manifest) |
| Stock word guard SHA-256 `7a4ab30f…3c9f10` | match | match |
| Enclosing P record starts at | P:0x1b58 (LO-FI) | P:0x1918 (LO-FI) |

Applying both pokes changes exactly two bytes of MAIN OS (one per payload); the result has SHA-256 `175989699c705de1434e03b23cf0615329da9af7db85a8c57ea2aea0a667cbbe` on both machines. Not confirmed here: that the stock word disassembles as `mpysu x0,y0,a` and the replacement as `mpyuu x0,y0,a` (upstream's and the author's disassembly; the DSP disassembler was not built for this check).

## OT UI captures

8 October 2026, Bryan Tysinger's Mac (Apple silicon). `ot_emu` built from this checkout's `sdk/octabam/tools/emu/ot_emu` (`bash scripts/vendor.sh mc68k dsp56300`, mc68k `4a6d0d1`, dsp56300 `8ccdd843`; `cmake -S tools/emu/ot_emu -B out/emu -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES=arm64`), emulator SHA-256 `1955bc62…37938d718`. Image: the original MAIN OS with only this module's two guarded pokes applied by a local script (`175989699c70…a667cbbe`); a standalone composition, not shared-builder output. `scripts/capture-module-ui.py` with the plan recorded in `media/capture.json`, MKII panel, empty scratch card. Both PNGs were reviewed (FX1 SETUP with LO-FI highlighted; LO-FI's page with AMF at 8) and their hashes match `media/capture.json`. They are stock screens and show nothing about the fix itself.

## Native comparison and packages

Not run. They need a local original OS 1.40C and the toolchain image:

```sh
docker build --file sdk/build/Dockerfile --tag modwerk-source-tools .
image=$(docker image inspect modwerk-source-tools --format '{{.Id}}')
bash scripts/build-modules-isolated.sh . ../module-packages "$image"
npm run modules:import -- ../module-packages/packages --development
npm run module:verify -- lofi-amf-fix --os ~/path/to/OCTATRACK_OS1.40C.bin
```

## Sound quality

Not tested. The module changes the ring-modulator frequency only; aliasing, clipping, DC and idle behaviour of LO-FI are expected to match stock at unaffected AMF values. `npm run fx:audit` has not been run.

## Performance

Not tested. `evidence/performance.json` does not exist yet. The replacement is a one-word multiply of the same family as the stock one, so LO-FI's instruction count is unchanged; its cycle count before and after has not been measured. Comparator: stock LO-FI itself.

## Stock flows

Not run. The one intended change (LO-FI's AMF pitch at the affected values; see README, "Change to a stock flow") must be confirmed, and these flows compared with and without the module, before release:

- LO-FI on FX1 and on FX2, tracks 1-4 (payload B) and 5-8 (payload A): AMF 0-60 sweep, AMF 7 → 8.
- LO-FI's other parameters (DIST, SRR, BRR, AMD, AMPH): unchanged.
- AMF under LFO, scene (crossfader) and parameter-lock modulation.
- Part save / reload, project save / load, and a power cycle with LO-FI settings on several tracks.
- Every other stock effect on FX1 and FX2: unchanged.

## Hardware

Untested.

## Release notes to add when the module is listed

`src/community/module-changelogs.json` refuses notes for a module that is not yet in `sdk/catalog.json`. When it is listed, add under `lofi-amf-fix`, version `0.1.0-experimental`: the import and what the fix does; that saved projects at the affected AMF values play at the corrected pitch, with no runtime switch; that Modwerk declares the writes as guarded pokes with no change to the addresses or word; and which of the tests above were actually run.

## module:doctor, 8 October 2026

Red, as expected for an unlisted import without a local OS: catalog entry, native comparison, declaration checks and package fingerprint need the steps above. Notes: performance record absent; sound quality not tested.
