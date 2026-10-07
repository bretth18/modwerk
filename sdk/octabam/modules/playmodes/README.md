# Play Modes

Version: `0.1.0-experimental` · author: [@devilfish707](https://github.com/devilfish707) · source: [devilfish707/Octaplay](https://github.com/devilfish707/Octaplay)

The sequencer's playhead in six directions, per pattern, shared by every
track or set per track. ColdFire-only (no DSP code, no effect slot), for
original OS 1.40C.

**Experimental.** Played on the author's MKII in test images (builds 12–19,
3–7 Oct 2026); not stress-tested, chip timing unmeasured. See
[TESTING.md](TESTING.md).

![Play Modes thumbnail: normal, reversed, pingpong and shuffle playhead paths over 16 steps](presentation/thumbnail.svg)

## Overview

| mode | 16 steps play as |
|---|---|
| NORMAL | 1 2 3 … 16, 1 2 3 … (stock) |
| REVERSED | 16 15 14 … 1, 16 15 … |
| PINGPONG | 1 … 16 15 … 2, 1 … 16 15 … 2: the end steps play once |
| PINGPONG 2 | 1 … 16 16 … 1, 1 … 16 …: the end steps play twice |
| RANDOM | any step each time; a step can repeat |
| SHUFFLE | every step once per pass, in a new order every pass |

Every pattern of every bank has its own modes. With the pattern's SCALE MODE
on NORMAL, one mode is shared by every track, and RANDOM / SHUFFLE move all
tracks through the same order. With SCALE MODE on PER TRACK, each track has
its own: T1–T8 and the MIDI tracks M1–M8. Switching SCALE MODE back keeps
both: the shared mode returns, and the per-track modes wait for the next
PER TRACK use.

The stock playhead keeps counting as always; the module only decides which
step plays at each position. Everything a step carries moves with it: its
trig or trigless trig, trig condition, micro-timing, swing bit and parameter
locks. Tempo, track length and scale, the pattern end, chains and CHAIN
AFTER stay stock. The trig LEDs, live recording and lock editing follow the
step you hear.

## Controls

No knob and no effect slot (`controls` is empty). The module applies
automatically when included in a build.

| action | result |
|---|---|
| hold [TRACK n], press [UP] | the mode one row up the list (towards NORMAL) |
| hold [TRACK n], press [DOWN] | the mode one row down (towards SHUFFLE) |

The list is NORMAL, REVERSED, PINGPONG, PINGPONG 2, RANDOM, SHUFFLE and does
not wrap. A one-second popup shows the result: `ALL PINGPONG` under NORMAL
scale mode (any TRACK key changes the shared mode), `T3 PINGPONG` or
`M2 REVERSED` under PER TRACK (MIDI mode addresses M1–M8). Default NORMAL.
The keys change the pattern that is playing (or selected while stopped);
the change takes effect from the next step.

## Usage

- REVERSED on a melodic MIDI track turns a phrase backwards without
  re-programming it.
- PINGPONG on a sliced break plays it out and back: 30 steps of material
  from 16; PINGPONG 2 gives 32, with a doubled hit at each turn.
- SHUFFLE keeps every hit of a groove but re-orders it every pass; RANDOM
  lets steps repeat and others drop out.
- With PER TRACK scale mode and different lengths, a 5-step PINGPONG hat
  against a 16-step NORMAL kick drifts in and out of phase.

PLAY and every pattern change start each track from its first step again
(REVERSED from its last) and draw a new RANDOM / SHUFFLE order.

**Per pattern and saved with the project.** The modes follow the pattern:
switching patterns (also in a chain) brings each pattern's own. Pattern
copy (FUNC + REC) and paste (FUNC + STOP) take them along, undoing a paste
brings the old ones back, and clearing a pattern (FUNC + PLAY) sets it back
to NORMAL. They are written to `project.work` as one comment line per
pattern that is not all NORMAL, `#PLAY_MODES=A01:` and 17 digits (the
shared mode, T1–T8, M1–M8; 0 NORMAL, 1 REVERSED, 2 PINGPONG, 3 RANDOM,
4 SHUFFLE, 5 PINGPONG 2), whenever the Octatrack writes the project's
settings: PROJECT > SAVE (copied to `project.strd`), SYNC TO CARD, PROJECT >
CHANGE. Loading or reloading reads them back; a project without them loads
as all NORMAL. A power cycle reads no project file, so the whole table is
also kept in battery-backed RAM, as stock keeps CHAIN AFTER. Stock firmware
reads the lines as comments, so the projects still open on a stock OS (and
lose the lines at their next save there).

**MASTER LENGTH.** Under PER TRACK, MASTER LENGTH restarts every track after
that many master steps (default 16), so a 20-step track never gets past
step 16 in any mode. Each mode works on the steps a track actually reaches
before that restart: REVERSED then plays 16 → 1, the mirror of what NORMAL
plays. Set MASTER LENGTH to INF to let each track run its full length.
With INF a pattern never reaches its end, so a queued pattern change waits
for CHAIN AFTER; a pattern on USE PAT SET. with PAT.LEN never changes
(stock behaviour): choose USE PRJ SET. or give it its own CHAIN AFTER.

## Quick tutorial

1. Include Play Modes in your build and load a pattern with a trig on step 1 only; SCALE MODE NORMAL.
2. Hold TRACK 1, press DOWN once: ALL REVERSED. Press PLAY: the trig sounds on the last step of every bar, and the trig LEDs walk 16 to 1.
3. Hold TRACK 1, press DOWN twice more: ALL PINGPONG 2, the trig sounds twice in a row at every turn back to step 1. Hold TRACK 1 and press UP until ALL NORMAL to return to stock playback.

## Compatibility and limitations

- Base: original OS 1.40C. Played on an MKII; the MKI shares the sequencer
  and key map layout but is untested.
- Composes with EUCLID and SCALE QUANTIZER by design: their stubs at
  `0x4009c3d4` and `0x400866cc` / `0x400867a2` / `0x400888aa` return into
  this module's sites. Other combinations are untested (`module:verify`
  builds them).
- Does not combine with octabam's PLOCKS P2 (not in this catalog): both use
  battery RAM `0x100f8600..` and the 20 pattern-copy memcpy sites.
- Deliberate changes to stock flows: TRACK held + UP / DOWN is consumed (it
  changes the mode instead of reaching the stock arrow handler);
  `project.work` gains `#PLAY_MODES=` comment lines. Without a mode other
  than NORMAL, playback is stock. To turn it off, set every pattern back to
  NORMAL or leave the module out of the build.
- Copying a single track does not copy that track's mode. PROJECT > NEW may
  keep the previous project's modes (untested).
- Swing follows the step that plays (stock reads the swing bit of the step
  it is given). Trig conditions keep counting stock passes.
- Micro-timing, trig conditions, slides and live recording were not checked
  on purpose; MIDI tracks only briefly.
- Like every DRAM module, the build gives up about 10 MB of sample memory to
  the platform reserve.

## Tests and measurements

`python3 verify.py` (the module's gate) compiles the engine and the
firmware glue for the host and runs their suites: every mode for lengths
1–64, SHUFFLE a permutation every pass, RANDOM's spread, look-ahead equal to
what then plays, what is prepared while stopped equal to what PLAY plays,
the popup text, scale modes, per-track lengths and the MASTER LENGTH cut,
PLAY and pattern-switch restarts, per-pattern rows, the project lines,
battery RAM over a simulated power cycle, pattern copy / paste / undo and
clear. With `m68k-elf-gcc` on the PATH it also compiles the ColdFire unit,
refuses any call outside it and checks `playmodes.s` is current. Hardware
results, resources and what is not tested: [TESTING.md](TESTING.md). How
every firmware address was found: [INVESTIGATION.md](INVESTIGATION.md).

## Authorship and licences

Original code and illustration by devilfish707, MIT ([LICENSE](LICENSE)).
Firmware addresses are cited from octabam (Sam Banks), SCALE QUANTIZER and
DIRECT JUMP (Tim Hastie), the KYOTI firmware notes (Zac-Kyoti) and OctaKit
(June Kiff), and read from the author's own 1.40C with the probe in the
[Octaplay repository](https://github.com/devilfish707/Octaplay) (its output
is never committed). No Elektron code, tables or images are included.

## Screens and audio

Emulator captures (octabam's headless `ot_emu`, MKII panel) of the author's
build 19, the image tested on the unit:

![Hold TRACK 1 and press DOWN: the popup reads ALL REVERSED](media/ot-mode-all-reversed.png)

![Two more DOWN presses: ALL PINGPONG 2](media/ot-mode-all-pingpong2.png)

The trig LEDs are not part of the LCD and are not captured. The thumbnail
is an illustration, not an Octatrack screen. No audio.
