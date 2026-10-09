# Euclid Seq

Version: 0.1.0-experimental · author: [bretth18](https://github.com/bretth18)

## Overview

An Analog Rytm-style Euclidean sequencer for Octatrack audio tracks. Two
pulse generators spread their pulses as evenly as possible over the track's
length; each can be rotated, a logic operator combines them and the result
can be rotated again. The module writes the result as **ordinary trigs** in
the current pattern. The stock sequencer plays them, so tempo, track speed,
swing, parameter locks, trig conditions, micro-timing and bank saving all
behave as they do for any other trig. Euclid Seq keeps no clock of its own.

While EUC is on for a track, its trigs belong to the generator: the TRIG keys
cannot add or remove them. Holding a trig to edit its parameter locks works
as usual.

## Controls

The EUCLID page has the Analog Rytm's eight settings on the Octatrack's knobs.

| Knob | Setting | Range | What it does |
|---|---|---|---|
| A | PL1 | 0–LEN | Pulses of generator 1 |
| B | PL2 | 0–LEN | Pulses of generator 2 |
| C | LEN | shown only | The track's length (PATTERN SCALE) |
| D | RO1 | 0–LEN-1 | Rotates generator 1 later by steps |
| E | RO2 | 0–LEN-1 | Rotates generator 2 later by steps |
| F | TRO | 0–LEN-1 | Rotates the combined result later by steps |
| LEVEL | OP | OR, XOR, AND, SUB | How PL1 and PL2 combine; SUB keeps PL1 pulses without a PL2 pulse |
| YES | EUC | ON / OFF | Hands the track's trigs to the generator, or back |
| NO | — | — | Returns to TRACK TRIG EDIT |

Pulses follow `(i × k) mod n < k`, the same distribution as the Euclid
effect: E(3,8) is `x..x..x.` with the first pulse on step 1. New settings
start at PL1 4, PL2 0, rotations 0 and OR.

## Usage

The page lives where the Octatrack keeps per-track trig settings:

1. Select an audio track and press **REC** for grid recording.
2. Hold **FUNC** and press **BANK** to open TRACK TRIG EDIT.
3. With the **TRIGS** row selected, press **RIGHT** to open EUCLID.

The firmware keeps one menu window at a time, so EUCLID takes TRACK TRIG
EDIT's place; **NO** brings it back with the TRIGS row selected.

With EUC on, every change regenerates the track at once: steps that gain a
pulse get a fresh trig (no locks, no condition), and steps that lose one are
cleared together with their locks, exactly as the stock grid editor removes a
trig. Trigs past the track's length are cleared. Changing the pattern or
track length on PATTERN SCALE regenerates every EUC track of the pattern.

Settings are kept per bank, pattern and audio track. Turning EUC off leaves
the last generated trigs as ordinary trigs that can be edited as usual.

### Quick tutorial

1. Select track 1 with a sample, press REC, hold FUNC and press BANK.
2. With the TRIGS row selected, press RIGHT to open EUCLID, then press YES: EUC:ON writes four trigs on steps 1, 5, 9 and 13.
3. Turn A to PL1 5 and B to PL2 3, then turn LEVEL to XOR: steps where only one generator pulses keep a trig. Press PLAY to hear it.
4. Turn F to rotate the whole rhythm. Press NO to return to TRACK TRIG EDIT, or YES on the page to turn EUC off and keep the trigs.

### Changes to stock flows

Euclid Seq changes two stock flows. Both apply only in a build that includes
it, and the second only while EUC is on.

- **RIGHT on TRACK TRIG EDIT's TRIGS row opens EUCLID.** RIGHT has no stock
  binding in that window: the window's key layer handles UP, DOWN, YES, NO
  and FUNC only, and RIGHT changed nothing on 16- and 64-step patterns in
  the emulator. A fifth menu row was considered and rejected: the four
  stock rows fill the window, so a fifth would make the stock list scroll.
  A new button combination was rejected because the free ones are few and
  easy to collide with. The page replaces TRACK TRIG EDIT (one window at a
  time) and NO returns to it. Checked neighbours: UP/DOWN row selection,
  YES (QUANTIZE 50%), NO (close), FUNC+YES (ARM TRK), the SLIDE, SWING and
  REC.TRG rows, PAGE (step page).
- **With EUC on, the TRIG keys do not add or remove trigs on that track,** as
  in the Analog Rytm's Euclidean mode. Holding a trig still opens its locks,
  and the SLIDE, SWING and REC.TRG rows edit as usual. To turn it off, open
  EUCLID and press YES. Checked neighbours: hold-for-lock, the other trig
  rows, other tracks, EUC off.

## Compatibility and limitations

Octatrack MKI or MKII with base OS 1.40C; audio tracks. No module conflicts
are declared.

- EUC settings are runtime state, not project data: a reboot or project
  reload turns EUC off and returns PL/RO/OP to their defaults. The trigs they
  produced are ordinary pattern data and stay.
- Live recording is not blocked while EUC is on and was not tested; recorded
  trigs are replaced at the next regeneration.
- Copying, pasting or clearing a track or pattern moves trigs as usual; EUC
  settings stay with their bank, pattern and track and do not follow.
- MIDI tracks are not supported.
- Not yet run on hardware; worst-case chip timing is unmeasured.
- Like every DRAM module, the build gives up about 10 MB of sample memory to
  the platform reserve.

## Implementation

`gen.c` is the pure-integer generator. `native.c` holds the settings table,
the pattern writer and the page; `hooks.s` the stubs and key layers.
`prepare.py` compiles both into the checked-in `control.s`. Five guarded
sites in OS 1.40C:

| Site | Stock role | Change |
|---|---|---|
| `0x4007c0a8`, `0x4007b48c` | push and pop TRACK TRIG EDIT's key layer `0x400d0140` | the operand names a module copy: the five stock records (copied from the local OS at build time) plus RIGHT |
| `0x40051970` | grid editor places a trig on an empty step (press) | skipped while EUC is on |
| `0x400601aa` | grid editor removes a held trig on release | skipped while EUC is on |
| `0x4004c912` | PATTERN SCALE length setter, after the store | replays its call, then regenerates EUC tracks |

The writer edits the RAM bank and the battery mirror `0x1001614e`, sets the
stock dirty flags and calls the stock lock-index rebuild `0x400339d8` and
track publication `0x4009da20`, as VECTOR does. It runs only from key, knob
and length-setter events on the UI task.

## Tests and measurements

`verify.py` (host gate) compiles `gen.c` and compares 633,984 settings with an
independent formulation (pulse *j* of *k* over *n* steps at ⌈j·n/k⌉), plus
hand-checked patterns. Emulator checks and their limits are in
[TESTING.md](TESTING.md). Nothing has run on hardware yet.

## Screens and audio

No captures are published yet; emulator captures will be added with the
first release.

## Authorship and licences

Original code by bretth18 under the MIT licence ([LICENSE](LICENSE)). Window,
key-layer and pattern-write idioms follow VECTOR and Analog BD (repeat98) and
Sam Banks' MIT octabam editor tooling; firmware facts are cited from octabam
and Play Modes (devilfish707). The five stock key records are copied from the
user's own OS at build time and are never stored in this source. No Elektron
firmware, routines, tables or images are included.
