# Sidechain Compressor verification

Version **0.1.0-experimental**, recorded **5 October 2026**. Standalone build-enabled release. New physical hardware evidence is waived by the owner's explicit instruction. No current-image hardware pass or chip wall-clock timing is claimed.

## Source, image and reproduction

- octabam wrapper/tools/profile: f80ecfeabc187a33403588678e707443161afc96.
- Zac Kyoti dependency: d3e0801a5f666abc04bc05fc1cb37969d7fb38d0.
- Original local 1.40C MAIN SHA-256: 164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e.
- Native MAIN SHA-256: b5aa8cee7787a3dc0ea53007fe31358ba14d155421ebec9c7f98948de740675f.
- Extent: 1,112,560 bytes; 2,462 changed bytes. No appended runtime/Core Logger.
- REMIX=sidechain-compressor, XBUS=1, SPEC=1, DEV=0, NOROUNDTRIP=0, BUILD=81.
- Python 3.14.0, GNU GCC 15.2.0, reviewed m68k ELF tools and DSP assembler/interpreter. Binary/source fingerprints are retained in the evidence records.

[Import record](../../../imports/sidechain-compressor-f80ecfe.json), [native proof](reports/native-evidence.json) and [software report](evidence/software.json) retain hashes and attribution, without firmware. Run all native/firmware tests in bubblewrap with network and credentials absent, source/vendor mounts read-only and private output writable. README gives the pinned native composition procedure.

The public source compiler, tools/compile_package.py, independently assembles the 134-byte ColdFire unit and both 340-word DSP code blocks plus 48-word tables. release-layout.json declares placements, guarded local descriptor copying, explicit authored field edits and masked alterations containing only changed bits. It stores no inherited instruction spans or complete stock tables. Release automation executes compilation without firmware; the browser performs fingerprinted local reconstruction. The legacy mixed-remix SDK excludes this newer dialect. No neighboring KYOTI module, MUTE_MODES, BusDelay or BusVerb is imported.

## Software results

| Check | Result and scope |
| --- | --- |
| Native assembly, roundtrip and author parity | Both payloads passed; only table addressing differs at code word indices 138, 209, 210. Exact native substitutions match all words. |
| ColdFire and tables | Reference unit matches author's 134 bytes; all 48 coefficients/core match. |
| COMPRESSOR dispatch | Original init/process table entries retained on both payloads. |
| Native allocation refusals | Private keybus/shared-window synthetic overlaps independently refused; disjoint claim accepted. |
| Original-base guard | Changed byte 100 refused before composition. |
| Static cycle analysis | All branches priced, complete fixed loops, split overhead, initialization and shared work included; both payloads agree. |
| Dual-core matrix | 16 split positions × 2,304 blocks × 16 instances; every call returned. Initial measured maximum 19,828 modeled instruction cycles/core/block, init 192/core. |
| Numerical detector stages | Author's pinned gain/filter/cold-warm/HP-reentry/split/stash/MON-publish assertions passed. Probe dump order and receiving-track entry context adapted to the local CLI. |
| ColdFire formatters | All KEY 0..8 and KFLT 0..127 calls returned through the real stock sprintf; maxima 132/60 executed instructions, stack peaks 88/72 bytes. |
| UI evidence | Three reviewed actual MKII LCD captures; transport stopped, neutral disposable project, no audio assets. Capture emulator EMAC/peripheral gates passed. |
| Browser/native parity and packaging | Exact MAIN and complete update parity; source/blob/base tamper and all fourteen companion selections refused; see software report. |

The matrix exercises full patched stock compressor calls on both DSPs at the real X:0 audio base and r7 three-block track stride. It is an isolated algorithm workload, not the firmware's streaming/transport scheduler. The numerical suite is same-core payload B detector verification; it does not measure whole-chip cross-core synchronization or audible live ducking. Static bounds do not depend on the matrix finding every signal-dependent path.

## DSP bound

44.1 kHz, 16 stereo frames/block, 200 MHz/core. Conservative available budget: 4,535 × 16 = **72,560 cycles/core/block**. The core reserve **1,415 × 16 = 22,640** comes from pinned octabam tools/build/cycle_count.py and covers standard stock scheduling/transport work; it is a budget reservation, not a new measured scheduler maximum.

Instruction costs use the reviewed DSP56300 opcodecycles model, based on the [NXP DSP56300 manual](https://www.nxp.com/docs/en/reference-manual/DSP56300FM.pdf). Instrumentation counts every nested DO/REP instruction, not only outer interpreter calls. The independent static decoder respects instruction boundaries and prices both sides of conditional branches even when mutually exclusive. All ordinary control flow is forward/return; the eight authored loops have fixed 32-word or 16-pair limits. The seven stock compressor sample loops use n7; both split segment lengths sum to sixteen.

Both payloads give identical conservative stage costs:

| Stage | Modeled cycles/block |
| --- | ---: |
| Tap: all branches, two 32-word copies | 222 |
| Detector: all branches, five fixed loops | 1,049 |
| Monitor: all branches, 32-word copy | 107 |
| Stock compressor body: all branches and split setup | 1,612 |
| Additional second-split detector exit ceiling | 64 |
| Stock init spike, one instance | 24 |
| Two compressor hook entry costs | 10 |

The second detector call bypasses the loops when r0 is nonzero; KEY OFF calls only the bounded publish-OFF helper. Its forward-path ceiling is below 64. For maximum pricing:

    instance = 1612 + 1049 + 64 + 24 + 10 = 2759
    track tap/commit = 222 + 107 + 10 = 339
    core module code = 8 × 2759 + 4 × 339 = 23428
    core with reserve = 2 × 23428 + 22640 = 69496
    single-instance ceiling = 2 × (2759 + 339) = 6196

The 2× allowance is an explicit conservative model for instruction interlocks and bounded shared-memory contention. It is not measured silicon wait states. Both cores are priced separately at eight instances, covering FX1 and FX2 on four tracks each. Four global tap/commit calls/core run regardless of compressor count. Even repeated initialization is charged in the same block. Maximum load leaves **3,064 modeled cycles/core/block**.

This is a conditional engineering bound under the stated standard reserve and bounded contention model. Arbitrarily stalled memory, clock changes, corrupted parameters and unscheduled RTOS interruptions have no finite software-only wall-clock guarantee. Streaming/MIDI/USB/control dispatch use the stock reserve; the module adds no separate USB/MIDI event loop. LFO, p-lock, scene and CC modulation all update the same bounded parameter words. Static coverage prices all extremes/modes irrespective of input; the software matrix adds rapid block-rate changes and all split positions.

## ColdFire bound

ColdFire callbacks add UI formatting only; audio processing remains on the DSPs. Direct calls used the native linked unit and the real stock sprintf tail. KEY 0..8 peaks at 132 executed instructions/88 stack bytes; KFLT 0..127 peaks at 60/72. tools/cf-probe.cpp records that workload. The four-instruction KEY list trampoline changes one flag then tail-calls the unchanged stock widget.

At an explicit 30 Hz UI event basis and 264 MHz, budget **8,800,000 cycles/event**. A conservative allowance of **1,024 cycles/executed instruction**, including bounded memory service, prices the longest formatter at **135,168 cycles/event**. Charging sixteen such callbacks plus a **6,000,000-cycle stock UI/scheduling reserve** yields **8,162,688 cycles/event**. This is a conditional model, not a hardware measurement or a claim that the emulator's instruction counter equals cycles. The existing stock list/raster rendering is charged to the reserve, not omitted. The CPU arithmetic/cache/peripheral distinction follows the [MCF547x reference manual](https://www.nxp.com/docs/en/reference-manual/MCF5475RM.pdf). New hardware evidence is waived; these reservations must remain explicit.

## Exact memory inventory

All DSP values below are **logical 24-bit words**, three bytes each. Host .mem representations use four bytes/word and are temporary host files, not target allocations. Maximum is sixteen compressor instances; state is not reallocated per hook. The declaration totals **768 bytes/instance + 11,004 shared bytes = 23,292 logical bytes**.

| Region | Range/capacity and bytes |
| --- | --- |
| Existing compressor instance X block | r7 = stateBase + (1 + 3×track + FX-slot)×0x100; 256 words/instance = 768 B. Sixteen instances = 12,288 B. Sidechain fields +0x14/+0x16/+0x17/+0x18 reuse four words inside it. |
| Authored DSP code | A P:1282..13d5; B P:1042..1195; 340 words/core = 2,040 B total. |
| Coefficients | A P:1252..1281; B P:1012..1041; 48 words/core = 288 B total. |
| Private Y | Both cores Y:7f0..9ff, 528 words/core = 3,168 B. MON flags/key indices at 7f0..7ff, keybus at 800..9ff. |
| Shared key windows | A Y:33dfe..33fff and B Y:3bdfe..3bfff, 514 words/core = 3,084 B. Includes seed/counter and 4×4×32-word generations. |
| Existing low-X scratch | X:0..ff on each core, 256 words/core = 1,536 B. Audio X:0..1f and detector X:40..5f fit inside this borrowed capacity. |
| Existing DSP hardware stacks | Sixteen 48-bit entries/core = 192 B total, represented as 64 logical 24-bit words. Authored nesting peaks at one caller entry plus two DO entries; the OFF helper adds one entry without an active DO. No recursion. |
| CPU descriptor cave | 400d6b20..400d6cbf, 416 B reserved stride; 402-byte inherited descriptor plus 14-byte alignment/slack. |
| CPU authored unit | 400d6d00..400d6d85, 134 B plus 2 B alignment = 136 B. |
| Long chooser cave | 400d7bbc..400d7c3b, 128 B reserved; 14 rows use 56 B, 72 B remain unused. |
| Additional ColdFire stack | KEY's 12 B of arguments plus 4 B call return = 16 B. Formatter observed total peaks include reused stock sprintf frames (88/72 B). The trampoline tail-call allocates no new frame. |

These reused stock capacities are counted once; they are not incremental memory consumption. The exact incremental claim consists of the authored code/tables, keybus/windows, clone/UI caves and at most 16 B extra caller stack. The unused SPRING donor space remains available slack: original 1,063 words minus 35-word DARK helper leaves 1,028 words; this module uses 388/core and leaves 640. That retained 35-word helper is existing stock, not a new allocation. No heap, SDRAM reservation, appended runtime, delay-line allocation or other dynamic peak is introduced. Temporary DSP addresses lie in the declared scratch/state ranges; table indices and key addressing are bounded by the control domain. Stock DARK/PLATE buffers stay below the shared tail claim; native overlap tests enforce competing claims. Hardware canaries and physical stack peaks were not measured.

## Historical author evidence and waiver

The pinned author report says the MKI ran this octabam form on 4 October 2026 with all six KYOTI modules and REC_TRIG_MUTE: both pages, same-core/cross-core KEY both ways, KFLT/KGN/MON, no T7 reverb crosstalk, muted KEY in each MUTE MODE and the first kick after PLAY. Earlier standalone/KYOTI tests covered ducking, MON and muted KEY with MUTE_MODES. This is attributed upstream operation evidence for a different combined image; duration, exact hardware image hash and sustained maximum-load timing were not supplied.

On 5 October 2026 the owner explicitly stated: “I explicitely approve not needing hardware evidence right now.” The exact source/version/image/folder approval is sdk/sidechain-compressor-build-approval.json. It waives only new current-build hardware evidence, retaining cycle, memory, source, license, UI and browser/native gates. Hardware status stays historical. The eleven-version baseline and two utility waivers are unchanged.

Known physical caveats remain: cross-core rate locking/two-generation latency, shared-KEY MON stash interactions, dirty persisted state, effect replacement with MON left on, project reload and recovery. Turn MON off before replacing the effect; KEY OFF restores self-keying. No new physical maximum-load or live ducking claim follows from this report.

## Ordinary checks and data hygiene

npm run check, modules:check -- --base origin/main and git diff --check read source/data and never run submitted firmware/emulator/native manifests. Focused tests validate the hardware-only exception, resource arithmetic, report identities, source compilation fingerprints, tamper rejection and all companion conflicts. Original thumbnail/card/detail artwork and all three actual monochrome UI images are reviewed.

Keep firmware/images/updates, cards/projects, extracted stock disassembly, instrumented vendor/host copies, audio renders and raw logs private and temporary. Commit only authored sources, source-only recipes/packages, full licenses, sanitized hashes/counts and reviewed media.

A repeat after temporary-directory loss re-ran the complete 16 × 2,304 × 16 matrix with the restored meter adapter. Peaks: payload A 19,498 and B 19,506 nominal instruction-model cycles. The initial broader recorded maximum 19,828 is retained above; all are below the independent static bound. Raw logs, dumps and firmware remain private.


## Reproduce the restored measurements

Run only in the private isolated native workspace described in README, with /work writable and /reviewed-host/dsp_host.cpp mounted read-only from the reviewed CLI host. After producing the native image, execute tools/build_meter.py, tools/measure_matrix.py, tools/stock_cfg.py, tools/build_static.py and tools/price_static.py from modules/sidechain-compressor in that order. The meter adapter counts nested REP/DO execution; the separate static probe prints instruction costs and lengths only. Keep .mem files, extracted .bin/.dis files and host outputs private. evidence/cycle-matrix.json and evidence/static-cycles.json retain only aggregate counts.

The shared firmware-worker session was repeated after recovery: both stock chooser settings produced the exact complete native update SHA-256 720923585091e53c0ec57fe9e0006a8e41414e7579eac7294181e357c39bf31c. All fourteen companions were refused in both orders; four corrupted recipes, changed/truncated base firmware and builds after clear or failed inspection were refused. This exercises the same session used by firmware.worker.ts through Vite's module loader; it does not claim a new interactive browser capture.
