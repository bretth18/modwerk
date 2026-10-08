# Play Modes: ColdFire work per event

Method: instruction counts in octabam's ColdFire emulator core (Musashi +
the V4e layer of `tools/emu/ot_emu`), running **only this module's linked
code** (build 24, `runtime.elf` of the octamod build, Octaplay `41dbdaa`) in
an otherwise empty machine with synthetic sequencer state; no firmware.
Harness and commands: Octaplay
[`tools/instruction-count/`](https://github.com/devilfish707/Octaplay/tree/main/tools/instruction-count)
(with the MASTER LENGTH case and the LED query's computed path). Instruction counts are exact for the inputs run; cycles are
derived with an allowance of **32 cycles per instruction** (the convention
of VECTOR's conditional static bound), which covers cache misses and bus
waits only as an allowance, not as a measurement.

## The sequencer step (the event that bounds the module)

Per track and step the tick calls `pm_audio_step` / `pm_midi_step` →
`pm_step_entry` → `pm_seq_step`. Measured over every mode, lengths 1–64,
both scale modes, MASTER LENGTH INF and 0, PLAY restarts, 16 tracks, and
for SHUFFLE 60 runs (seeds) per length:

| mode | worst instructions, one track step (with a restart) |
|---|---|
| NORMAL | 1,161 |
| REVERSED | 1,211 |
| PINGPONG | 1,226 |
| RANDOM | 1,246 |
| SHUFFLE | 1,884 (measured) |
| PINGPONG 2 | 1,221 |
| any mode, 14-step tracks under MASTER LENGTH 16 (master restarts) | 1,417 |

A step on which all 16 tracks restart in SHUFFLE (length 33, the longest
walk): 12,548 instructions measured.

**SHUFFLE's bound.** SHUFFLE walks a keyed permutation of 0..2^b−1 until it
lands inside the track's length. The walk visits at most the 2^b−len
out-of-range values first, so it takes at most 2^b−len+1 ≤ 32 evaluations
(len 33). `pm_map` costs exactly **101 + 98 × walk** instructions (measured
for walks 1–7 and 24 with seeds found by `walk.py`, the step returned
matching the Python replica). Worst `pm_map`: 101 + 98 × 32 = 3,237.

**Bound per track step:** the costliest call that is not a long SHUFFLE
walk (1,417, the MASTER LENGTH restart case, which already includes its own
`pm_map`, the restart of all 16 tracks, the pattern-row reload and the
length learnt from the playhead) + the worst `pm_map` (3,237) = **4,654
instructions**,
an over-estimate (the restart runs once per step, not per track).

| | instructions | cycles at 32/instruction |
|---|---|---|
| one track step (worstCase) | 4,654 | 148,928 |
| 16 tracks in one step (maxConfiguration) | 74,464 | 2,382,848 |
| budget: one step at 300 BPM, 2X scale (25 ms at 264 MHz) | | 6,600,000 |

## Other events (UI and file context, not the tick)

| event | instructions measured |
|---|---|
| first use after boot (state init + battery-table read, once) | 64,965 |
| UI step query (`pm_show_entry`, trig LEDs), worst | 1,482 |
| rebuild / look-ahead (`pm_peek_entry`), worst | 1,445 |
| TRACK + UP / DOWN (`pm_key_updown`, one battery row) | 674 |
| project load: storing pass start (`pm_project_begin`, full table) | 62,786 |
| project load: one `#PLAY_MODES=` line | 801 |
| project load: an older single line (every pattern) | 65,322 |
| project write: 256 lines (`pm_project_format` × 256, all set) | 76,454 |
| pattern paste / undo (`pm_pattern_copy`) | 405 |
| clear pattern (`pm_pattern_clear`) | 433 |

Deepest stack below the caller's arguments over all runs: 120 bytes.

Not claimed: chip wall-clock cycles, cache behaviour, interrupt latency
added to the stock tick, or headroom under maximum stock audio load.
