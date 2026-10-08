# Air Chorus 0.1.0-experimental — test record

Recorded 8 October 2026. Development candidate. The owner reports a successful
50-minute MKII test with several instances/full knob sweeps on the first image;
fresh hardware testing of the initialization update is explicitly owner-waived. See [the hardware report](evidence/hardware-report.md).
Original source pin: `e718c9bcfcdd736deeddb08bffe6bce2aa8e0eea`.
Actual assembly SHA-256 (455 words, P:0x2000 synthetic origin):
`b5a3c90b8089142e5fd6330714ed4eb844a169c43ad445f7d082fd8c5132fbf0`. No firmware or extracted stock bytes are committed.

## Native DSP renders

`verify.py` assembles and executes the actual DSP in `dsp_host`, using synthetic
memory and inert frame-context entry points. This is an audio/DSP test, not
execution of the ColdFire project/editor/dispatcher. The toolchain image used
was `octamod-tapehead-qualification-tools:local` (local image ID `3a5861370c0f`).
Assembler/disassembler and host binaries came from `/opt/toolchain/vendor/dsp56300`.
Reports: `evidence/software.json`, `evidence/controls.json`,
`evidence/instances.json`, `evidence/bounds.json`.

- Seven static parameter fixtures versus the pinned float oracle, 16,384
  stereo frames at 997/331 Hz. Default-control peak error 0.0000507 FS;
  largest observed error 0.00117292 FS at the maximum
  speed/range. Gate limit 0.003 FS for these finite fixtures. This is bounded
  fixture agreement, not bit parity or a proof of long-term phase equivalence.
- Signed-multiply encoding census, init dispatcher-register preservation,
  loaded-memory guards, byte-exact MIX 0, dirty-state silence in all four FX2
  allocator slots and safe dry dispatch in all four FX1 slots passed.
- Stereo channel independence, dirty-state music versus clean initialization,
  scheduled control changes and 1+15, 4+12, 8+8 trig-split renders passed.
  Split outputs are byte-identical to the corresponding unsplit render at
  identical target-change samples. This models DSP calls, not ColdFire timing.
- A high-frequency burst followed by three seconds of silence reaches exact
  digital silence in the last half-second.
- Eight differently controlled/sounded instances, four on each modeled core,
  are byte-identical to their isolated renders. Both cores' shared buffer
  windows are mapped separately and memory guards pass. A 256 MiB Docker
  shared-memory allowance is required. This is not physical deadline evidence.

## Moving controls / zipper check

The adapter compiles the shared repository metric from
`sdk/octabam/tools/verify/verify_knob_clicks.py` unchanged, with its constants
and known-bad/known-good self-test. It excludes the firmware-dependent rig
render driver. Measurement self-test passes: a block-glided gain flags at
−60.7 dBFS, a sample-glided gain is clean at −92.6 dBFS.

A 438.75 Hz tone at 0.3 FS; jumps at blocks 1500/2000 and one-byte turns every
two blocks from 2500. Panel case: 20↔110, other controls 64/64/127. Endpoint
case: 0↔127, other controls at their maximums. Stereo channels are both judged.
Flag rule: a block-correlated step above −70 dBFS and >6 dB over its static
baseline. **All six control cases / eighteen windows pass.** −140 is the
measurement floor, not a claim of perfect silence.

| Case | Control | Jump up dBFS | Jump down dBFS | Turn dBFS |
| --- | --- | --- | --- | --- |
| panel | SPEED | -108.7 | -140.0 | -140.0 |
| panel | RANGE | -140.0 | -104.6 | -140.0 |
| panel | MIX | -140.0 | -140.0 | -117.0 |
| endpoints | SPEED | -140.0 | -140.0 | -97.1 |
| endpoints | RANGE | -140.0 | -140.0 | -140.0 |
| endpoints | MIX | -140.0 | -140.0 | -140.0 |

The first one-block ramps failed RANGE/MIX. A single longer slew passed ordinary
turns but failed full-scale jumps because its first sample could move the
read position by several samples. Final RANGE/MIX use cascaded 48-bit,
per-sample poles; SPEED uses one. Original interpolation is retained.
The census cannot establish a physical DSP deadline, the panel-to-r6 path,
or inaudibility below its tone/difference floor. Full knob sweeps worked well
in the owner's 50-minute MKII report of the earlier image; the changed image
has no fresh physical listening result.

## Sound-quality audit

The guide's `npm run fx:audit` plan/check analysis was used at its unchanged
default limits (alias −60 dBc, DC −60 dBFS, idle −90 dBFS).
Static setting: SPD 0 (phase frozen), RNG 127, MIX 127. All eight tone cases
and idle pass. This checks delay-read/filter quantization without modulation.

```text
signal                  out dBFS  harmonics  aliasing  residual   DC dBFS   rails  verdict
tone-1100hz-12db           -12.0      -86.9     -93.5     -83.2    -110.2       0  ok
tone-1100hz-1db             -1.0     -102.4     -98.6     -94.4     -96.0       0  ok
tone-2701hz-12db           -12.1      -98.1     -87.3     -83.1     -99.7       0  ok
tone-2701hz-1db             -1.1     -118.2    -104.7     -93.0     -87.5       0  ok
tone-5301hz-12db           -12.5     -109.2     -91.7     -81.6     -92.6       0  ok
tone-5301hz-1db             -1.5     -122.1    -111.3     -92.4     -81.1       0  ok
tone-9102hz-12db           -13.6     -115.5     -96.2     -80.5     -86.7       0  ok
tone-9102hz-1db             -2.6     -126.7    -109.0     -91.4     -75.4       0  ok
idle                    after the input stops: digital silence  OK
```

A separate SPD/RNG/MIX 127 render is retained in
`evidence/quality-modulated.txt`: five audit cases flag. Its fixed-frequency
fundamental is strongly spread into pitch sidebands, so the reported dBc
ratios are not a clean estimate of alias harmonics; high-speed delay reads
also genuinely can alias. Finite-window means reach −51.0 dBFS in one −1 dBFS
case. No rails were hit and idle reaches digital silence. Do not call the
maximum-modulation setting transparent or alias-free. Limits were not loosened
and this flagged render is not recorded as a passed sound-quality audit.

## Code budget and memory

`verify_bounds.py` refuses altered call topology, non-forward branches and
callee loops before charging whole assembled word spans at every call,
including mutually exclusive arms, plus four cycles per branch/call. The
repository's ordinary cycle counter cannot price these branched nested callees.
Model upper bound: 708 loop cycles/sample plus 129 setup cycles/call;
717 cycles/sample at 16 unsplit frames, 725 with two trig-split calls.
Initialization has a separate 99-cycle upper bound. Charging initialization
and two split calls to all four FX2 instances each block gives 46,740 modeled
cycles/core/block, versus the SDK usable budget 49,920. The theoretical
72,560-cycle core budget reserves 22,640 for stock processing/dispatcher/
transport/streaming. The remaining modeled allowance is 3,180 cycles per
block before contention stalls or other custom effects. These are conditional
software instruction-word bounds, not measured chip deadlines.
Observed interpreter costs are retained in the current software/stock reports;
executed instructions are not a chip cycle measurement. Memory stalls and complete ColdFire
stock/platform paths remain unbounded. No authored ColdFire routine exists.

Code: 455 P words; quarter-sine table plus endpoint: 1,026 P words;
combined native package: 1,481 words (4,443 bytes at 24 bits/word).
Each instance initializes 56 X words in its reserved 256-word state slot and
uses 16,384 Y words in its existing FX2 buffer without a burst clear. Four FX2 instances reserve 66,560
X+Y words per core, eight 133,120 across both cores. This includes the whole
reserved X slot and excludes unrelated stock state, stacks and platform RAM.
Unused/reserved state is explicitly cleared. No global sample RAM is claimed
by the module itself. The loader-bearing image has separate shared platform
arena costs; they are not zero and that integration remains pending.

## Matched stock DSP cost comparison

After rebasing on main's updated FX best practices, `benchmark.py` compared
stock CHORUS, stock SPRING REV and the exact standalone Air Chorus image.
Both real payloads are dumped only to a private staging tree. One instance per
core, X:0 audio (the real stock location), identical 44.1 kHz tone/transient
inputs, 16 frames/block, 4,096 blocks/case. Null stub is subtracted per core
and split. Spring and Air Chorus cover fixed settings and the shared full
endpoint/turn/type schedule, with split offsets 0, 1, 8 and 15 on both cores.
Stock Chorus covers fixed/moving unsplit cases. This is a finite observed
maximum; all sixteen split positions and whole instrument workload remain
unqualified. No stock code/table/dump, raw schedule or audio is committed.

| Effect | Worst observed net instructions/sample |
| --- | ---: |
| Stock Chorus | 253.625 |
| Stock Spring Reverb | 314.000 |
| Air Chorus (cold-buffer path) | 524.500 |

Air Chorus is 1.67× this expensive Spring sweep and 2.07× stock Chorus while the ring history fills (8,192 frames, about 186 ms). Afterward it uses the original fast tap path.
The extra work buys the full original long stereo sweep, separate alternating
48-bit air states and precise multi-stage control smoothing. This is in the
same order of cost as the Spring design target, not a claim of matched chip
headroom. Executed instruction counts are not compared directly with the
717/725 modeled cycle bound. Record: `evidence/stock-comparison.json`, including
source image and harness hashes, per-core/split figures and exact conditions.
The physical eight-track deadline, complete DSP workload and ColdFire cost
still need qualification and explicit review before release.

## Private firmware composition / UI / remaining gates

Native standalone compilation on the user's verified original 1.40C MAIN OS
passes on both DSP payloads with 1,243 donor P words free. A loader-bearing
composition with all stock FX2 also assembles and proves relocation at four
bases, but its attempted empty-card UI sequence did not select Air Chorus;
it is not qualified. No passing browser/native comparison is claimed.
The private hardware candidate is the compact standalone image identified in
`evidence/private-build.json`; its saved ELEK/ELUP update round-trip is checked
against the native MAIN bytes. Stock FX1 is retained; old FX2 assignments can
fall back to NONE. Use only a disposable project.

Four actual LCD exports from the exact compact image are retained under `media/`,
with their plan and hashes in `media/capture.json`. All were visually reviewed: chooser
location; confirmed SPD/RNG 64 and MIX 0; MIX 64 example; return to MIX 0.
The final capture used `scripts/capture-module-ui.py`, the native standalone
image hash and `--shm-size 256m` in the reviewed container. Labels were shortened
from SPEED/RANGE to SPD/RNG for readable panel spacing. `evidence/source-inventory.json`
binds the native/test inputs to their exact file hashes. Emulation does not verify physical reboot,
panel audio timing, persistence, maximum-load deadlines or hardware sound.
See [HARDWARE.md](HARDWARE.md) for the MKII test request.

The owner approved limited functional coverage and waived fresh hardware
testing of the exact initialization update. Publication still needs native/browser
composition and rejection coverage, stock/platform performance evidence and
owner first-release review. The candidate stays under `sdk/drafts`, outside
catalogue/package discovery. `module:doctor` cannot go green for an unlisted
module; its catalogue/qualification/package/parity gates must be satisfied at
promotion. No baseline or prior-version exception is extended to this source.

## Reproduction

Use Node 24 and `npm ci`. Run native code in the reviewed network-disabled
container, with a read-only source mount and private output mount. DSP tests:
`python3 -B verify.py`, `verify_controls.py`, `verify_instances.py` and
`verify_bounds.py`. Environment variables `CHORUS_RESULTS`,
`CHORUS_CONTROL_RESULTS`, `CHORUS_INSTANCE_RESULTS` and `CHORUS_BOUNDS_RESULTS`
write sanitized JSON reports. `render_quality.py --input <fx:audit plan>
--output <private renders> [--modulated]` renders the sound-quality plan.
`benchmark.py --native-sdk <private staging tree> --module-image <private MAIN>
--output <new private benchmark folder>` reproduces the matched stock comparison. For eight-instance testing add `--shm-size 256m`.

`build_private.py --raw-os <local original MAIN OS> --vendor <toolchain vendor>
--output <new private MAIN path>` stages a disposable native checkout and
builds the compact image. It verifies the original MAIN input hash. Use the
existing `encodeFirmware` codec and the user's original update to package it;
read the saved update back and compare decoded MAIN bytes. Keep all stock-
derived outputs private. The required repository check is
`npm run check -- --base origin/main` before each commit.

## Bounded initialization update

The hardware-tested implementation cleared all 16,384 Y words in one init call
(16,466 executed interpreter instructions). The release candidate instead
clears the 56-word X state and tracks valid ring history. Every unwritten tap
is logically zero; after 8,192 frames the original unmasked tap body is used.
The sample count is saturated and offsets are wrapped before validity checks.

The changed DSP passed the complete native render/control/instance suite.
Ten additional dirty-history fixtures, including 32,768-frame ring wraps,
endpoint settings and moving controls at split positions 0/1/8/15, are
byte-identical to the hardware-tested DSP. `evidence/history-parity.json`
records these finite comparisons. They do not establish current-image hardware
behavior. `evidence/hardware-report.md` retains both the original 50-minute
result and the owner's explicit current-image waiver.
