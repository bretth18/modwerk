# Recorder Loop Fix measurements

Recorded 7 October 2026. Version `0.1.0-experimental`, upstream `6f9e5bc9db0ae9fa99fa2f2a0f4de1fdb8e9a136`.

## Source identity

`evidence/source-identity.json` records source-only GNU assembly checks. The assembler is GNU Binutils 2.47.20260726. No stock image was read by the source oracle. All eight patches match their authored pinned bytes at three ROM origins (24 comparisons). The import record `../../imports/recorder-loop-fix-6f9e5bc.json` binds the original and vendored source bytes; only guard handling and attribution change in the declaration.

## Reproduce the source-only measurements

Run the probe in the reviewed toolchain container with its network disabled, read-only root, dropped capabilities and a private temporary directory. Mount this checkout read-only at `/repo`, the SDK emulator CMake build at `/native`, and its pinned vendor directory at `/vendor`. Use `--tmpfs /tmp:rw,exec,nosuid,nodev,size=128m` for the temporary compiled probe. Mount a new private output parent at `/results`. The inner command is:

```sh
python3 /repo/sdk/drafts/recorder-loop-fix/qualification/run.py \
  --emulator-build /native --vendor /vendor --output /results/recorder-loop-fix
```

The CMake build uses this checkout's `sdk/octabam/tools/emu/ot_emu`, with mc68k revision `4a6d0d17a1f2b30077ab726c27fe9bb770fa0456`. GNU source checks read manifest literals with AST and never import the declaration. The runner compiles `qualification/probe.cpp`, loads only authored instructions and deletes all binaries automatically. It writes sanitized `source-identity.json` and `probes.json`. Exit 0 is a behavioral pass; exit 2 preserves a measured qualification failure. A nonzero exit must not be hidden by a shell pipeline. No firmware is needed for these probes.

Before measuring, four port regressions passed: `emac`, `periph`, `mc68kColdFireTimingTest`, `mc68kColdFireDivideTest` (4/4 via CTest).

## Native execution measurements

`qualification/probe.cpp` executes the actual assembled instructions in the reviewed ColdFire port, not a reimplementation of the algorithms. It loads only authored assembly bytes. `evidence/probes.json` records the assertions and path maxima.

| Path | Cases | Instructions max | Model cycles max | V4 core bound | Extra stack bytes max |
|---|---:|---:|---:|---:|---:|
| hold_copy.s | 108 | 34 | 59 | 544 | 12 |
| hold_guard.s | 108 | 29 | 40 | 464 | 12 |
| hold_xfade_a.s | 108 | 34 | 60 | 544 | 20 |
| hold_xfade_b.s | 108 | 34 | 59 | 544 | 20 |
| hold_xguard.s | 108 | 39 | 57 | 624 | 12 |
| seek-counter | 2 | 5 | 13 | 80 | 0 |
| seekbind | 2 | 5 | 10 | 80 | 0 |
| spacing | 555008 | 43 | 301 | 798 | 24 |
| spacing-late-arm | 13279 | 43 | 301 | 798 | 24 |

Model cycles use mc68k `4a6d0d17a1f2b30077ab726c27fe9bb770fa0456`, its MCF5206E timing model, cache-hit and zero-wait assumptions. They are not MCF5445x wall-clock measurements. V4 core bounds charge 16 cycles per ordinary instruction and 38 per long divide: a deliberately conservative envelope over the actual supported forms, branch misprediction, return prediction and up to three pipeline stalls per instruction. Sources use aligned data except documented stock accesses. The basis is [MCF54455 Reference Manual](https://www.nxp.com/docs/en/reference-manual/MCF54455RM.pdf), section 3.3.5, tables 3-12 through 3-20 (long divide <=35, return <=9, conditional branch <=8, MOVEM at most six registers in these hooks). External stock function bodies, their stack, cache misses, memory-bus waits, interrupt nesting and allocation contention are excluded, so the bound must not be presented as a complete interrupt deadline measurement.

Spacing tests cover every integer BPM 30..300, RLEN 1..64, all eight track indices and 32 successive arm phases: 555,008 cases. An independent next-arm oracle asserts each of the first 32 ideal phases, balanced stack and restored scratch registers. Each hold path runs 108 cases covering END-1/END/END+1, forward/zero/reverse counts, recorder/ordinary buffers, mapped/empty fetches and successful/unmapped/zero-count fallback callbacks. Seek and counter tests exercise both same/different sample paths. The fetch callback is a synthetic fixture; actual stock fetch cost and audio continuity are separate full-project tests. Fractional-tempo ticks, long-running 32-bit arm wrap, swing/speed/scale, memory reallocation, repeated restart and audio output remain to be measured.

## Measured long-run spacing failure

The separate ideal consecutive-arm comparison covers BPM 30..300, RLEN 1/2/4/8/16/32/64 and elapsed times 30/60/300/1,800/3,600/7,200/14,400 seconds: 13,279 cases. Native execution differs from `floor((k+1)N/D) - floor(kN/D)` in **953 cases**, always by one sample in this sweep. The source estimates the phase with `arm / q`; fractional accumulation eventually makes that estimate differ from the ideal arm index. A representative early failure is RLEN 1 at 197 BPM after five minutes (arm 13,230,000; native length 3,358, ideal next gap 3,357). RLEN 16 passes all 1,897 tested long-run cases. This is an arithmetic result for ideal consecutive arms, not an audio or hardware timing claim. The author assembly is retained byte-identically; qualification exits **2** and the overall `passed` field is **false**. Do not publish this draft as a universal loop-spacing fix.

## Memory

Authored code: 718 bytes; relocated tables: 0 bytes. No extra DSP code or owned audio pool is declared. Probe stack peaks cover the module and synthetic callback return frames; they exclude stock callback stack and the surrounding caller. Recorder state and audio blocks are stock-owned. The eight patches read existing voice/recorder metadata and invoke the original fetch routine; eleven pool-base literals must follow the common builder allocation. These counts are not a complete placement/lifetime inventory. `evidence/local-image.json` identifies the locally composed standalone image used for captures; it does not assert common-builder parity.

The locally composed image's exact range ledger is [evidence/memory-layout.json](evidence/memory-layout.json): 718 bytes of code/tables plus 424 bytes of alignment gaps, 1142 bytes from first allocation to last end. These are exact for that local layout; complete stock lifetimes and callback stack remain null.

## Upstream hardware reports

Upstream reports Sam Banks on MKII image OCTABAM83 for the first three fixes on 12 September 2026, and Bryan T on MKII sos-capture build 95 for all eight patches on 3 October 2026. They do not qualify this newly composed Modwerk image. Current-image physical hardware testing is not claimed. A read-only CoreMIDI inventory returned no exposed sources or destinations on this machine.

## Remaining release gates

- Integrate the module shape through the shared source compiler and builder; compare all supported selections with native octabam, including stock FX2, correct refusals and guarded changed-base rejection.
- Complete the memory ledger including alignment, caller/stock callback stack, reused ranges and simultaneous lifetimes.
- Measure longest frame interrupt and idle share under the same maximum-load project on stock and the module with CF Meter; do not relabel emulator instruction-clock timestamps as chip time.
- Run real DSP audio tests and stress, persistence/recovery, Part/pattern changes and all cases left untested above.
- Supply exact-current-image hardware evidence or an explicit owner exception before publication. This draft grants no exception and does not change the frozen qualification baseline.

Native source and firmware execution ran in a disposable Docker container, with network disabled, read-only root, no credentials, dropped capabilities and private scratch inputs. Only sanitized JSON, original probes and reviewed LCD PNGs may enter the repository.

## Repository validation

- `python3 -B -m unittest discover -s sdk/tests -p test_recorder_loop_fix_draft.py -v`: passed both import/evidence integrity tests; native manifests are not evaluated.
- `npm run check`: required repository CI check, including licence/SDK checks, lint, tests, types and production build.
- `npm run module:doctor -- recorder-loop-fix`: exit 2, expected while the source is in `sdk/drafts/` rather than `sdk/octabam/modules/`. This is an integration gap, not a green doctor result.
- Strict manifest parsing and qualification publication refusal: passed; no qualification or owner waiver is added.
- All retained LCD PNGs were viewed and their 768×384 grayscale pixels and capture SHA-256 values checked; both original thumbnails were rendered and viewed.
