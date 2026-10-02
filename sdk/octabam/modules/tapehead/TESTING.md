# TapeHead testing

## Commands and exact revision

Contributor results below used PR #42 source on top of Octamod `main` at
`433fa32c0f5b381cf5a71930dc45e121609b7f4d` (2 Oct 2026), with the vendored
DSP56300 tree built from `sdk/octabam/scripts/vendor.sh dsp56300` (pin
`8ccdd843`, `tools/patches/dsp56300.patch` applied) on Linux x86-64.

| file | SHA-256 |
|---|---|
| `tapehead.asm` | `eb30c36f76344df2e9e53a0cf397665a0203cd203573da13fcc4a45c1b92eda5` |
| octabam's `modules/tapehead/tapehead.asm` (before the fixes) | `097c6d2b066fda5596d2eab5568ca138ae276c12290d35606fe3809495d1ba02` |

### The render gate: `verify.py`

```sh
cd sdk/octabam
bash scripts/vendor.sh dsp56300
cmake -S vendor/dsp56300 -B vendor/dsp56300/build -DCMAKE_BUILD_TYPE=Release
cmake --build vendor/dsp56300/build --target dsp56kDisassemble dsp_asm dsp_host -j8
python3 modules/tapehead/verify.py
```

No firmware is read. `verify.py` assembles `tapehead.asm` at P:0x2000 and
runs it in `dsp_host` as one instance from a synthetic memory image: a no-op
frame-context routine (`-ctx 40,41,42`), 16-sample blocks, r7 = 0x6200,
r6 = 0x506, page-1 knobs as value << 16. It takes about 35 seconds.

Result on the revision above:

```
assembled 416 words; init P:2000 proc P:2006
[PASS] tapehead_l is straight-line, one rts
[PASS] tapehead_r is straight-line, one rts
[PASS] no mpysu anywhere []
[PASS] COLOR 0: zero in, zero out
[PASS] COLOR 1: zero in, zero out
[PASS] COLOR 2: zero in, zero out
[PASS] peak error vs the float JSFX <= 0.001 worst 4.68e-04 at COLOR/DRIVE/TRIM/signal (0, 0, 0, 1000)
       meter: 268.1 instructions/sample (one instance, dsp_host)
[PASS] COLOR 1 renders MEDIUM, not BRIGHT error vs MED 6.0e-05, vs BRGT 7.0e-02
[PASS] stereo render == two mono renders, bit for bit
all TAPEHEAD gates passed
```

Negative control: the same `verify.py` against octabam's unfixed source
fails two gates, peak error 1.62 (COLOR 1, DRIVE 127, TRIM 0, 4 kHz) and
COLOR 1 matching neither MEDIUM (4.0e-1) nor BRIGHT (3.7e-1) because the
other two defects also distort that render. With only the two arithmetic
fixes applied, COLOR 1 matched BRIGHT to 5.6e-5 and MEDIUM to 7.0e-2.

The 4.7e-4 residual is the polynomial fits of DRIVE and TRIM plus Q1.23
truncation. The peak sits at DRIVE 0, TRIM 0, 1 kHz, where the output is
loudest.

What this gate cannot see: the composed image, the real dispatcher, the
panel, placement beside other modules, and two cores. Those need `make check`
with the source now integrated, and the reported hardware operation.

### Static checks with a scratch remix

With the draft copied to `sdk/octabam/modules/tapehead/` and a scratch
`remixes/test/tapehead/remix.py` (both removed afterwards):

- `REMIX=tapehead python3 tools/build/cycle_count.py`: **288 cycles/sample**
  (`bsr tapehead_l 133w/call, bsr tapehead_r 134w/call`). Four FX2 instances
  on one core: 1,152. With TAPEHEAD also on FX1, eight per core: 2,304,
  headroom 816 against 3,120 usable.
- `tools/remix/ledger.check` over CHARACTER, EUCLID, MINIVERB, MODULATION,
  SPECTRUM, TAPE ECHO and TAPEHEAD: no conflicts. No two modules share an FX2
  ID, priority 17 is unused, layout letter `4` is unused.
- `tools/remix/selftest.py`: `[PASS] tapehead: insert, tracks 1-8` and
  `every module declares category, author, author_url, proof`. The rest of
  the selftest needs remixes the SDK does not carry and was not counted.
- `octamod.module.json` parses with `parseModuleDocument`; publication is
  refused for missing OT UI captures and missing qualification, as intended.

### Disassembly

`dsp56kDisassemble` of the assembled blob: 14 `mpy y1,y0,a`, 5
`mpy y1,y0,b`, 10 `mpy x0,y1,a`, 4 `mpy x1,y0,a` and 2 `mpy x0,x0,a`,
all signed. poly6's negative coefficients sit in y0 of `mpy y1,y0`, which is
signed, so the open question octabam carried about them is closed.

octabam squared the knobs with `mpy x0,x1`, which encodes as `mpysu`.
Harmless there (t ≥ 0), but the Octamod build refuses any mpysu not in its
audit table, so both are now `mpy x0,x0` (2 words fewer, output unchanged:
verify.py's 4.68e-4 is identical before and after).

## What changed from the octabam build

Each was found by the render above and confirmed by fixing it alone.

1. **MIN stages returned 2 × min.** The branchless clamp is
   `max = (P + LO + |P − LO|) / 2`, then `min = (M + HI − |M − HI|) / 2`. The
   max had its `/2`; the six min stages did not. Smoothstep therefore saw
   twice the drive and was evaluated outside ±1, where `1.5v − 0.5v³` folds
   back towards zero, and the y3 output clamp passed 2 × y3. Fix: one
   `asr #$1,b,b` after each min stage (+6 cycles/sample).
2. **The g3 term was limited.** `|g3| · y3c` reaches 1.16 at full-scale y3.
   It was stored to r7 at full scale, where the store limits to 0.99999. The
   half is stored now and doubled in the accumulator before the subtract.
3. **COLOR's MED selected BRGT.** Page-1 values arrive as value << 16
   (`docs/remixer/HARNESS.md`; Mini Verb decodes its RATE select with
   `asr #$10`). COLOR was tested with `tst` (works for 0) and `sub #1` (never
   zero for 0x010000). It now subtracts 0x010000.

Effect on sound: the octabam build was louder and harsher than the JSFX.
At DRIVE 36 / TRIM 18 its peak output on a test mix was 0.80 against 0.62
now; at DRIVE 100 it hit full scale against 0.91 now.

## Stress and audio quality

A maximum-load hardware stress test was not run. The owner removed the mandatory
60-minute/eight-track requirement and accepted the contributor's functional
operation report. See [hardware evidence](evidence/hardware.md) for the statement
and its unknown model, duration, track count and coverage limitations.

## Resources

- DSP cycles: 288 cycles/sample per instance, static (`cycle_count.py`), the
  same at every setting. dsp_host meter: 268.2 instructions/sample. Neither
  is a hardware measurement; worst case under modulation in a composed image
  is reproduced in evidence/benchmark.md.
- DSP program: 416 words (1,248 bytes at 24 bits) in each payload's donor
  region (composed build report).
- DSP X: 31 words per instance (r7 + $00–$12, $20–$25, $30–$35), inside the
  dispatcher's own 256-word r7 block. No allocator buffer, no Y memory, no
  tables beyond immediates.
- ColdFire: 402-byte descriptor in a 416-byte stride and 60-byte COLOR formatter; no audio processing.

## Hardware

2 Oct 2026: the author flashed `OCTATRACK_OCTABAM2.bin` (SHA-256 above)
and reported that TapeHead works well on the unit. That is a listening
report: the panel model, project, duration and track count were not
recorded, and it is not a measured maximum-load stress pass. The octabam build heard on 12 Sep 2026 had different
arithmetic (see above).

## The hardware test image

`hardware-test-remix.py` (as `sdk/octabam/remixes/tapehead-spring/remix.py`,
with this draft copied to `sdk/octabam/modules/tapehead/`):

```sh
cd sdk/octabam
make image REMIX=tapehead-spring BUILD=2
```

Built 2 Oct 2026 from the author's own OS 1.40C (MAIN OS section SHA-256
`164f3122…0a84e`, the fingerprint `stock_guard.py` expects). The build
report:

```
TAPEHEAD      P:0x01252..0x013f2 ( 416 words)  id 0x1f      (payload A)
TAPEHEAD      P:0x01012..0x011b2 ( 416 words)  id 0x1f      (payload B)
region P:...  (1063 words)  used 416  FREE 647
donor ids (SPRING) -> null stub
TAPEHEAD      slot 2  COLOR prints NORM|MED|BRGT
out/mainos_bus.bin: 1,112,560 bytes, 2547 changed
```

| artifact (local only, never committed) | SHA-256 |
|---|---|
| `out/mainos_bus.bin` | `bb700652540fc42068d1f92791960fb3c86b672932d113f538776c2b1441a0f7` |
| `out/OCTATRACK_OCTABAM2.bin` | `2f01f0136755e0d37a9a320eb3ae38be1fe634df4cfff8799a956b5fad1d6942` |
| `out/OCTATRACK_OS1.40C_OCTABAM2.syx` | `1817eeae554395d379b0ff92d0cf42eec377b8c80c36630aba43266907b228f5` |

`make_bin.py` round-trips the card image (payload and checksum ok). Gates run
on this remix:

- `verify_menu.py`: ALL CHECKS PASSED (TAPEHEAD's three drawn names are the
  manifest's; SPRING's own descriptor unchanged).
- `verify_initregs.py`: TAPEHEAD's init preserves r1.
- `verify_replaces.py --image`: every stock id is stock's.
- `label_fmt.py`: COLOR's label cave verifies (60 B, NORM MED BRGT).
- `cycle_count.py`: 288 cycles/sample; worst core 1,152 (four FX2 slots).
- Not runnable in the SDK: `verify_dirtystate.py` (needs the absent `send`
  module), `verify_slots.py` (needs `busverb`), and the ColdFire-port gates
  that need the `.venv`.
- Composed-image render: `benchmark.py`'s TAPEHEAD dump, one instance at the
  defaults, is within 3.9e-5 of `reference.py`, L = R for mono input.

## TapeHead against SPRING REV: `benchmark.py`

```sh
cd sdk/octabam
REMIX=tapehead-spring python3 modules/tapehead/benchmark.py
```

It reuses `tools/harness/benchmark_reverbs.py`'s runner, which measured Mini
Verb against the stock reverbs: both cores from their real payloads (stock
SPRING REV from the untouched 1.40C, TAPEHEAD from the image above), four FX2
slots per core at the real r7 stride, 16-sample blocks, 2,048 blocks per
case. "Modulated" moves every active control every block; the `split` cases
cover all 16 trigger-split positions. The unit is **executed DSP
instructions**, not hardware cycles: the meter leaves out the dispatcher,
ColdFire work, DMA and memory stalls.

| case | TapeHead | SPRING REV |
|---|---:|---:|
| one instance, fixed controls, per 16-sample block | 4,287 | 4,186 |
| one instance, per sample | 267.9 | 261.6 |
| four per core, fixed controls, peak per block | 17,148 | 16,744 |
| four per core, modulated, peak per block | 17,160 | 16,748 |
| four per core, worst of all splits, peak per block | 17,616 | 20,376 |
| per core, per sample, worst | 1,101 | 1,273.5 |
| init, per core | 24 | 380 |

SPRING REV's worst, 20,376, is the figure the Mini Verb benchmark recorded
for pristine 1.40C on 20 Sep 2026, so the two runs agree. At equal settings
TapeHead costs about 2% more than Spring at its defaults; Spring's costlier
types and split paths make its worst case 16% higher than TapeHead's, which
costs the same at every setting.

Memory:

| | TapeHead | SPRING REV |
|---|---:|---:|
| DSP program, per payload | 416 words | 1,063 words |
| FX2 instance buffer (allocator) | none | 16,384 words per instance slot |
| per-instance state | 31 words of its r7 block | not measured |
| ColdFire | cloned descriptor, 60 B label cave | stock descriptor |

## OT UI capture evidence

`scripts/capture-module-ui.py` on `ot_emu` (SHA-256 the exact hash in `media/capture.json`, built
from `tools/emu/ot_emu` with the pinned `vendor/mc68k`), MKII panel, empty
scratch card, transport stopped, the image above. Plan and hashes:
`media/capture.json`. Reviewed:

- `media/ot-location.png`: FX2 SETUP after YES, TAPEHEAD highlighted in the
  row after PLATE REV, no SETUP controls.
- `media/ot-controls.png`: the FX2 main page, DRIVE, TRIM, COLOR, footer
  `FX2▸TAPEHEAD`.
- `media/ot-color.png`: COLOR turned once, printing MED with the tick widget.

The emulator boots the image and draws the chooser and page. This is UI
evidence only: it is not a hardware or audio test.


## Publication evidence, 2 October 2026

The owner accepted the author-reported listening/parameter-lock test and removed
the mandatory 60-minute, eight-track stress requirement. This version includes
the exact same DSP instructions as the reported hardware image; its hash was
reproduced locally. Model, duration and maximum hardware workload remain unknown.
See [the actual report](evidence/hardware.md), [worst-case code-cycle model](evidence/cycles.md),
[exact memory inventory](evidence/memory.md) and [reproduced full benchmark](evidence/benchmark.md).
The static model prices eight inserts per core, including split/reselection
overhead; it is not a chip wall-clock measurement or a hardware maximum-load pass.
Fresh actual monochrome LCD captures were reviewed in the MKII emulator.

The algorithm is the **JClones VladG TapeHead clone**, pinned to JSFXClones
`88a1503d668c378ced4c166e772378272f3b72ea`, [original JSFX](https://github.com/JClones/JSFXClones/blob/88a1503d668c378ced4c166e772378272f3b72ea/jsfx/JClones_TapeHead.jsfx).
JClones is credited for the original implementation, devilfish707 for the port,
and Sam Banks for the SDK. Full MIT notices accompany the source and site.
The inspected source does not establish an Airwindows derivation.
