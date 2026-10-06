# VECTOR testing

Version: `0.2.3-experimental`, 6 October 2026. The current image, source-file hashes and test walks are in `media/capture.json`. The generator/editor lineage is source revision `3b285711d27305138b8657435f8ccbe39afe6316`; the rename is retested from the source fingerprint in `media/capture.json` and is also bound by `tests.qualification.sourceSha256`. Firmware, sample cards and linked output stay private.

## Firmware-free core and source packaging

In the pinned toolchain, without network:

```sh
python3 -B modules/vector/verify_native.py
```

The gate compiles `engine.c` and `test_engine.c` with `-fsanitize=address,undefined`, runs 244,800 deterministic/scale/density cases and 29,772 secondary-control cases, packed-settings round trips, buffer canaries and writer checks. The writer preserves unrelated locks, recorder events, swing and timing, and validates before writing. It then regenerates `control.s` using GCC 16.2.0 from the current C and `hooks.s` and compares it byte-for-byte. This is a source/engine gate, not hardware evidence.

`control.s` includes authored code and four 6/6/8/8-byte zero placeholders. `manifest.py` declares each displaced span by local-stock address, length and SHA-256. The shared native linker and browser linker restore those bytes from the user's verified original 1.40C. The package compiler never reads firmware. The release adds an explicit word alignment before the later hook section; the browser correctly rejects odd hook addresses. No generated file containing replay bytes is committed.

## Native image and emulator behavior

A private `vector-local` remix selects VECTOR, all fourteen stock FX2 effects and the usual ten FX1 entries, `NO_FALLBACK`, static stock descriptors, XBUS=1 SPEC=1 DEV=0 BUILD=98. Run `tools/build/build_bus.py` only inside the isolated toolchain, with the original MAIN OS kept private. Native MAIN input SHA-256: `164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e`. The compiler image is `sha256:244853509446c2f2bb0b9032b6160b1dbffc911ab5a66a9139eadfbd0930f457`.

The runtime was rebuilt and both focused walks were rerun after alignment. The current image SHA-256 is in the capture and qualification records. The source-only reconstruction before alignment reproduced the previously tested image byte-for-byte; that result is not used instead of testing the aligned release.

Both fresh octemu processes exited 0. The core walk exercises all twelve stopped/live SRC edits, seed stability, YES variation, empty-track first PLAY, populated restart, advancing native steps, LEVEL sample editing and held-trig access. Other seven track records and native timing remain unchanged. The pool walk covers automatic modal entry, visible horizontal chevrons, LEFT/RIGHT menu navigation, held LEFT, UP/DOWN highlighting, NO cancellation, both stock sample pools/file browsers and native sample confirmation. Pool browsing does not alter the assigned kind; sample confirmation retains VECTOR settings and sequence and commits the chosen backing kind/sample. Native counters advance on both Flex and Static.

The actual monochrome LCD frames were reviewed before publication. The walks and normalized screenshot destinations are in `media/walk.jsonl` and `media/pool-walk.jsonl`. Substitute a task-private capture directory. The private fixture uses a 16-step T1 test tone, Part ONE, A01, 120 BPM and FX NONE. GDB reads pause the guest; these walks do not measure audio continuity, physical timing or general persistence.

## ColdFire instructions and conditional cycle model

`tools/cf-probe.cpp` runs the linked ColdFire instructions with octabam's `Machine`/Musashi V4e layer. Compile it against `ot_machine` in a private network-disabled toolchain; invoke it with the private image and `out/platform/runtime/runtime.bin`. The fixed entry addresses belong to the exact VECTOR-alone profile above. The probe maps the authored runtime as the loader does, supplies synthetic pattern/Part state and executes actual stock commit callees. It does not boot the RTOS, DSP or audio.

Measured maxima across 3,840 generator/writer cases (seeds 0..127, TYPE endpoints, all scales, lengths 1/16/64, maximum density/gate/accent and rotation/reverse): generator 65,099 executed instructions and 968 stack bytes; writer 25,380 instructions and 40 stack bytes. Eight full native commit calls peak at 472,499 instructions and 1,048 stack bytes. These are executed instruction counts, not chip cycles. Root/window/repeat and writer corner cases additionally have the sanitizer matrix; the instruction matrix is not exhaustive across all control combinations.

The static envelope charges 100,000 instructions for generation (64 steps, 25 candidate pitches each, at most 2,016 insertion shifts), 40,000 for the writer (64 x 32 locks), 50,000 for two 2,330-byte staging/publication scans, 10,000 for bounded adapter/settings work, 371,000 for stock's global audio/MIDI lock-index rebuild (8 x 64 x 32 paired reads, a maximum 22-instruction inner path plus loop overhead), 100,000 for native track publication and 10,000 for stock dirty/event bookkeeping. Total 681,000 is rounded up to 700,000 instructions/commit. Native rendering and scheduling have an additional reserve.

Conditional pricing allows 32 cycles/executed instruction for arithmetic, memory service and contention. That is an engineering assumption, not measured silicon wait states. One commit is therefore 22,400,000 modeled cycles; eight startup commits plus a 6,000,000-cycle stock UI/scheduling reserve are 185,200,000. The declared budget is one second (264,000,000 cycles at 264 MHz) for a full eight-track initial-PLAY burst. Ordinary knob edits generate only the selected track. Generation stays in the UI task and adds no per-sample DSP work. This budget is not a promise of sustained 30 Hz generation or of hardware audio headroom. Unbounded memory stalls, interrupted native service or mixed-module maximum audio load invalidate the stated assumptions and need hardware measurement. `evidence/software.json` preserves measured and modeled quantities separately; physical wall-clock cycles remain null.

## Exact memory accounting

The qualification counts capacities once, including reused stock memory. VECTOR alone's linked runtime covers 24,604 bytes: text 12,650, rodata 391, data 3,368 and linker padding 8,195. Its 2,330-byte staging record, 257-byte phrase, 402-byte descriptor, control/layer state and constants are inside those sections. The full runtime and packed staging are inside the 10,487,808-byte / 1,707-page shared platform arena; they are not added again. The platform's flash append is 8,247 bytes. Both values are measured from the actual layout/output. Additional DRAM modules share the arena; placements and pack sizes change with composition.

The compiler's largest fixed frame is 968 bytes in generation. Native adapter calls peak at 1,048 observed bytes; the declared additional UI stack ceiling is 1,216 bytes, including 168 bytes for VECTOR's outer wrappers/callers. Other authored callbacks are smaller and there is no recursion. The stock UI caller's existing stack is outside the added-frame claim. Hardware stack canaries remain unmeasured.

The stock list constructor uses one fixed 56-byte window slot, one 20-byte surface descriptor, two preallocated 1,024-byte raster buffers and 8 bytes of callback/priority state: 2,132 borrowed bytes. VECTOR creates no heap allocation. Modal/sample-browser contexts are exclusive. Two 64-byte native lock-index masks add 128 borrowed bytes. Per audio track, sixteen 2,330-byte pattern records in the loaded bank and SRAM mirror count 74,560 borrowed bytes; twelve settings bytes in four Parts and both mirrors count 96. That is 74,656 bytes/track, eight tracks maximum. The exact declared total is 11,096,779 bytes, including the shared reserve and borrowed capacities; it is not incremental RAM consumption. No added DSP code, buffers, tables, delay lines or per-sample state are allocated.

## Browser/native parity

The standard source-only package build, importer and `module:verify` workflow are used. The recorded comparison belongs in `sdk/native-comparisons/vector.json`; it checks VECTOR alone, paired/fuller selections and both stock-FX2 modes, and matches successful output and native rejections. Analog BD and FM Synth share chooser hooks; both the ledger and configurator reject those combinations. MIDI Scenes remains standalone. See `docs/VERIFICATION.md` for the final recorded counts. Software parity is required independently of the hardware waiver.

## Hardware waiver and limits

On 6 October 2026 the owner requested publication on modwerk.app and approved the current non-hardware evidence because their OT is in repair. `sdk/vector-build-approval.json` binds that hardware-only approval to this exact version, source fingerprint and tested image. `hardwareStatus` stays `untested`; chip wall-clock cycles and physical memory canaries stay null. This does not waive source packaging, emulator behavior, software resource accounting or browser/native parity.

Save/reload, Part copy/reload, bank/pattern changes and power-cycle persistence, general swing/track-scale playback equivalence, physical Flex/Static audio continuity and mixed-module maximum-load/recovery stress remain untested. The source writes the native bank and SRAM mirror and uses stock dirty/publication paths; that implementation is not claimed as an empirical persistence test. No hardware model, duration, audio render or recovery result is invented.

The owner selected the public name VECTOR before release. The renamed native image was rebuilt; both SRC/playback and Static/Flex walks, host sanitizers, assembly reproduction and the 3,840-case native instruction/stack probe were repeated. Counts and stack peaks were unchanged. Native sections and flash append above describe this renamed build.
