# Mute Modes measurements

Recorded 7 October 2026. Version `0.1.0-experimental`, upstream `6f9e5bc9db0ae9fa99fa2f2a0f4de1fdb8e9a136`.

## Source identity

`evidence/source-identity.json` records source-only GNU assembly checks. The assembler is GNU Binutils 2.47.20260726. No stock image was read by the source oracle. The plain softmute, SC_KEY variant and menu hashes all match the author references. The import record `../../imports/mute-modes-6f9e5bc.json` binds the original and vendored source bytes; only guard handling and attribution change in the declaration.

## Reproduce the source-only measurements

Run the probe in the reviewed toolchain container with its network disabled, read-only root, dropped capabilities and a private temporary directory. Mount this checkout read-only at `/repo`, the SDK emulator CMake build at `/native`, and its pinned vendor directory at `/vendor`. Use `--tmpfs /tmp:rw,exec,nosuid,nodev,size=128m` for the temporary compiled probe. Mount a new private output parent at `/results`. The inner command is:

```sh
python3 /repo/sdk/drafts/mute-modes/qualification/run.py \
  --emulator-build /native --vendor /vendor --output /results/mute-modes
```

The CMake build uses this checkout's `sdk/octabam/tools/emu/ot_emu`, with mc68k revision `4a6d0d17a1f2b30077ab726c27fe9bb770fa0456`. GNU source checks read manifest literals with AST and never import the declaration. The runner compiles `qualification/probe.cpp`, loads only authored instructions and deletes all binaries automatically. It writes sanitized `source-identity.json` and `probes.json`. Exit 0 is a behavioral pass; exit 2 preserves a measured qualification failure. A nonzero exit must not be hidden by a shell pipeline. No firmware is needed for these probes.

Before measuring, four port regressions passed: `emac`, `periph`, `mc68kColdFireTimingTest`, `mc68kColdFireDivideTest` (4/4 via CTest).

## Native execution measurements

`qualification/probe.cpp` executes the actual assembled instructions in the reviewed ColdFire port, not a reimplementation of the algorithms. It loads only authored assembly bytes. `evidence/probes.json` records the assertions and path maxima.

| Path | Cases | Instructions max | Model cycles max | V4 core bound | Extra stack bytes max |
|---|---:|---:|---:|---:|---:|
| dispatch | 57344 | 21 | 37 | 336 | 12 |
| frame-mode-0 | 131072 | 13 | 26 | 208 | 16 |
| frame-mode-1 | 131072 | 118 | 210 | 1888 | 24 |
| frame-mode-2 | 131072 | 30 | 52 | 480 | 16 |
| frame-mode-3 | 131072 | 127 | 170 | 2032 | 24 |
| fresh-bind | 57344 | 22 | 33 | 352 | 8 |
| menu-get | 54 | 12 | 26 | 192 | 0 |
| menu-set | 54 | 24 | 46 | 384 | 0 |
| mt-trig | 57344 | 21 | 34 | 336 | 4 |
| rebind | 57344 | 20 | 32 | 320 | 0 |
| sidechain-frame-mode-0 | 65536 | 13 | 26 | 208 | 16 |
| sidechain-frame-mode-1 | 65536 | 200 | 382 | 3200 | 24 |
| sidechain-frame-mode-2 | 65536 | 136 | 232 | 2176 | 20 |
| sidechain-frame-mode-3 | 65536 | 209 | 342 | 3344 | 24 |
| sidechain-fresh-bind | 2097152 | 17 | 35 | 272 | 8 |
| trig-flag | 57344 | 19 | 30 | 304 | 0 |

Model cycles use mc68k `4a6d0d17a1f2b30077ab726c27fe9bb770fa0456`, its MCF5206E timing model, cache-hit and zero-wait assumptions. They are not MCF5445x wall-clock measurements. V4 core bounds charge 16 cycles per ordinary instruction and 38 per long divide: a deliberately conservative envelope over the actual supported forms, branch misprediction, return prediction and up to three pipeline stalls per instruction. Sources use aligned data except documented stock accesses. The basis is [MCF54455 Reference Manual](https://www.nxp.com/docs/en/reference-manual/MCF54455RM.pdf), section 3.3.5, tables 3-12 through 3-20 (long divide <=35, return <=9, conditional branch <=8, MOVEM at most six registers in these hooks). External stock function bodies, their stack, cache misses, memory-bus waits, interrupt nesting and allocation contention are excluded, so the bound must not be presented as a complete interrupt deadline measurement.

Plain frame probes cover every combination of eight-bit mute and solo masks, all four modes and both SOLO_FLAG states. They assert preserved CUE bits and d0-d3, balanced stack and the exact OTFX dry-gain words in both frame banks. Dispatch/rebind tests cover every mute mask, seven solo edge masks and every audio track, including the caller d3 preservation fix. Setter tests cover valid/corrupt values, both deltas, clamp/wrap, label translation and battery-shadow writes. Sidechain probes cover every key/mute mask in all modes and 2,097,152 fresh binds. Stock note-off and per-machine callbacks are synthetic returning fixtures; real envelopes and FX-tail audio still need full-project rendering.

## Memory

Authored code: 1176 bytes; relocated tables: 204 bytes. No extra DSP code or owned audio pool is declared. Probe stack peaks cover the module and synthetic callback return frames; they exclude stock callback stack and the surrounding caller. Reused state includes the 4-byte PERSONALIZE gate, 4-byte battery shadow, 1-byte frame shadow and existing release mask. The SC_KEY variant adds a key-mask byte to its ROM unit, writable after load. These counts are not a complete placement/lifetime inventory. `evidence/local-image.json` identifies the locally composed standalone image used for captures; it does not assert common-builder parity.

The locally composed image's exact range ledger is [evidence/memory-layout.json](evidence/memory-layout.json): 1380 bytes of code/tables plus 224 bytes of alignment gaps, 1604 bytes from first allocation to last end. These are exact for that local layout; complete stock lifetimes and callback stack remain null.

## Upstream hardware reports

Upstream records author MKI use of the standalone and KYOTI builds, and an octabam SIDECHAIN_COMPRESSOR build on 4 October 2026. These reports describe upstream images, not hardware testing of this Modwerk import. Current-image physical hardware testing is not claimed. A read-only CoreMIDI inventory returned no exposed sources or destinations on this machine.

## Remaining release gates

- Integrate the module shape through the shared source compiler and builder; compare all supported selections with native octabam, including stock FX2, correct refusals and guarded changed-base rejection.
- Complete the memory ledger including alignment, caller/stock callback stack, reused ranges and simultaneous lifetimes.
- Measure longest frame interrupt and idle share under the same maximum-load project on stock and the module with CF Meter; do not relabel emulator instruction-clock timestamps as chip time.
- Run real DSP audio tests and stress, persistence/recovery, Part/pattern changes and all cases left untested above.
- Supply exact-current-image hardware evidence or an explicit owner exception before publication. This draft grants no exception and does not change the frozen qualification baseline.

Native source and firmware execution ran in a disposable Docker container, with network disabled, read-only root, no credentials, dropped capabilities and private scratch inputs. Only sanitized JSON, original probes and reviewed LCD PNGs may enter the repository.

## Repository validation

- `python3 -B -m unittest discover -s sdk/tests -p test_mute_modes_draft.py -v`: passed both import/evidence integrity tests; native manifests are not evaluated.
- `npm run check`: initial run passed all 991 tests plus licence/SDK checks, lint, types and build. Later full runs hit the existing 5-second FM Synth module-page timeout (latest 990/991 passed); a single-worker diagnostic additionally hit the doctor timeout. Both existing test files pass in isolation. Assertions and repository timeouts were not changed. The two new read-only SDK integrity tests pass independently. Final-tree CI is still required.
- `npm run module:doctor -- mute-modes`: exit 2, expected while the source is in `sdk/drafts/` rather than `sdk/octabam/modules/`. This is an integration gap, not a green doctor result.
- Strict manifest parsing and qualification publication refusal: passed; no qualification or owner waiver is added.
- All retained LCD PNGs were viewed and their 768×384 grayscale pixels and capture SHA-256 values checked; both original thumbnails were rendered and viewed.
