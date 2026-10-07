# Play Modes testing

## Commands and exact revision

Source: [devilfish707/Octaplay](https://github.com/devilfish707/Octaplay)
`playmodes/` at commit `1d2e9dc` (build 19 source, `playmodes.s` generated
with the author's m68k-elf-gcc, 7 Oct 2026); this folder is that source
with `manifest.py`'s category set to MACHINES, without the firmware probe
`investigate.py` (it stays in Octaplay).

```sh
python3 verify.py        # host suites; with m68k-elf-gcc also the ColdFire unit
python3 generate.py      # regenerates playmodes.s (playmode.c + adapter.c + hooks.s)
```

Host gate, author's Mac (Homebrew python 3.14, m68k-elf-gcc) and a Linux
container (gcc, host only): all pass. A deliberate defect (PINGPONG playing
its end step twice) fails the engine suite with 382 failures, so the checks
bite.

What the host suites cover:

- NORMAL / REVERSED for every length 1–64 over three passes.
- PINGPONG: exact sequences for lengths 1, 2, 4; for 3–64 every move is
  ±1 and the end steps are not doubled; it keeps bouncing across passes.
- PINGPONG 2: exact sequences for lengths 1 and 4; for 2–64 every move is
  ±1 and only the end steps repeat, once per turn.
- SHUFFLE: for every length 1–64 and four seeds, each of eight passes plays
  every step exactly once; the order changes between passes.
- RANDOM: 64,000 steps over 16 within ±10 % of uniform; repeats occur.
- NORMAL scale mode: all tracks share one RANDOM / SHUFFLE order; PER TRACK:
  each its own.
- Look-ahead: the step predicted one ahead (also across the pattern end) is
  the step that then plays.
- While stopped: what stock prepares is what PLAY then plays, every mode,
  both scale modes.
- PLAY restarts every track (via the transport-start stubs); playback alone
  never does.
- Lengths: pattern length under NORMAL scale mode; per-track length under
  PER TRACK, cut to the steps MASTER LENGTH lets the track reach, at
  different track scales; INF and 0 do not cut.
- The display (the UI's step query), the popup text, held TRACK + arrows.
- Per pattern: two patterns keep their own modes across switches.
- The project lines: their exact text, one per pattern that is not all
  NORMAL, a storing load pass starting from NORMAL, the parse-only pass
  storing nothing, other `#` lines and bad pattern names left alone, short
  lines and bad digits, an older single-line format applied to every pattern.
- Battery RAM: the whole table (all 256 full rows) back after a simulated
  power cycle, a damaged copy read as all NORMAL, nothing written outside
  `0x100f8600..0x100f8f06`.
- Pattern copy / paste / undo through the memcpy hook: the clipboard and
  undo rows, the battery copy ignored, track copies and odd addresses left
  alone, the playing pattern picking up a paste.
- Clear pattern: only that pattern back to NORMAL, the playing one at once,
  the clipboard and odd addresses left alone, the clear in battery RAM.

## Hardware and audio quality

Author's MKII (devilfish707), OS 1.40C, test images built with octamod
(`playmodes-test`: this module and the stock effects), 3–7 Oct 2026. Short
interactive sessions per build, not timed; no stress project.

| build | result |
|---|---|
| 12 | Modes switch with TRACK + UP/DOWN, popup shows `ALL …` / `T1 …`; arrow direction right; PER TRACK shows the track's own mode. LEDs still stock. |
| 13 | LEDs follow the played step. Found: STOP + PLAY did not restart PINGPONG; PER TRACK tracks stopped at 16 (MASTER LENGTH 16, stock). |
| 14 | Restart by run start time: PINGPONG only played forward (that time is rewritten during playback). Reverted. |
| 15 | Restart from the four transport-start sites: PINGPONG bounces and restarts on PLAY. Found: NORMAL → STOP → REVERSED → PLAY fired step 1's trig once at step 16's place. |
| 16 | Mode changes rebuild the prepared step; stopped preparation uses the next run. The phantom is gone. Longer patterns (32/48/64), PER TRACK with MASTER LENGTH INF and various lengths and modes, pattern changes across banks 1–2 and tempo changes all behaved. |
| 17 | Modes saved with the project (one set for all patterns then). Found: the set was shared by every pattern. |
| 18–19 | Per-pattern modes, battery RAM table, pattern copy / paste / undo, clear, PINGPONG 2. About 15 minutes on build 19: PINGPONG 2, save / reload, power cycle, copy / paste (also to other banks) and clear all work ([evidence/hardware.md](evidence/hardware.md)). |

No audio artefacts were heard; audio was not measured (the module adds no
DSP and changes only which step's trig fires).

## Stock flows

- Unchanged by design, and seen unchanged with every pattern on NORMAL:
  playback, PLAY / STOP, tempo, track length and scale, chains, CHAIN AFTER,
  pattern changes across banks, the trig LEDs.
- Deliberate changes: TRACK held + UP / DOWN changes the mode and does not
  reach the stock arrow handler (the author found no stock function of that
  chord on the main screen); `project.work` gains
  `#PLAY_MODES=` comment lines (stock ignores `#` lines); pattern copy,
  paste, undo and clear also move or reset the pattern's modes.
- Not tested: MKI, live recording, trig conditions, micro-timing, slides,
  MIDI tracks beyond a first check, PROJECT > NEW, the arranger, scenes and
  Parts while a mode other than NORMAL plays.

## Performance

Instruction counts of the module's own code in octabam's ColdFire emulator
core (no firmware), with a 32-cycles-per-instruction allowance:
[evidence/cycles.md](evidence/cycles.md). One track step: 1,726
instructions measured (SHUFFLE), bounded at 4,206; sixteen tracks: 67,296
instructions, 2,153,472 cycles, against 6,600,000 for one step at 300 BPM
and 2X scale. No chip timing, no `evidence/performance.json` (perf:audit)
yet.

## Resources

13,724 bytes, all shared: code 6,628, read-only data 102, state and the
pattern table 4,684 (SDRAM platform reserve), battery table 2,310 (CS1
`0x100f8600..0x100f8f06`); stack at most 104 bytes; no heap, DSP memory,
cave space or effect ID. 35 detours, each guarded by the SHA-256 of the
stock bytes it replaces. [evidence/memory.md](evidence/memory.md).

## Hardware

See "Hardware and audio quality": interactive tests on one MKII, no timed
stress run, no chip timing. Qualification for publication still needs the
stress project, its duration and the checks of
`docs/MODULE_QUALIFICATION.md`.

## OT UI capture evidence

Pending. To capture: the popup after TRACK + DOWN (`ALL REVERSED`), a
PER TRACK popup (`T3 PINGPONG`), and the trig LEDs during REVERSED
playback, with `scripts/capture-module-ui.py` on the headless emulator.
