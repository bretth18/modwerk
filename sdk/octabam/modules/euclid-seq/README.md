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

The module adds an **EUCLID trig mode** to the TRIG MODE list. In it the
main screen shows a EUCLID panel, like CHROMATIC's or SLICES', with the
selected track's settings and trig page, and FUNC+RIGHT opens the EUCLID
page.

While EUC is on for a track, its trigs belong to the generator: the TRIG keys
and live recording cannot add or remove them. Holding a trig to edit its
parameter locks works as usual. On an MKII, the trig keys show the Euclid
trigs purple in grid recording.

## Controls

The EUCLID page has the Analog Rytm's eight settings on the Octatrack's
knobs, drawn in the stock setup-page style: six dials (PL1, PL2, LEN on top,
RO1, RO2, TRO below) beside a panel with EUC, the operator and the trig page.

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

**The EUCLID trig mode.** Hold **FUNC** and press **DOWN** (or **UP**) to
open TRIG MODE, as for CHROMATIC or SLICES; on audio tracks the list has a
seventh row, **EUCLID**. In this mode:

- the main screen's lower right shows the EUCLID panel: the title with
  PL1:PL2 while EUC is on, the operator and EUC state, and the trig page on
  screen as a bar (a block per trig);
- **FUNC+RIGHT** opens the EUCLID page, in grid recording or not; **NO**
  closes it;
- the TRIG keys, LEDs, knobs and everything else behave as in TRACKS.

Choosing another row leaves the mode. MIDI tracks keep their three stock
rows. The mode is not saved, like the stock trig mode.

**From TRACK TRIG EDIT.** The page is also where the Octatrack keeps
per-track trig settings:

1. Select an audio track and press **REC** for grid recording.
2. Hold **FUNC** and press **BANK** to open TRACK TRIG EDIT.
3. With the **TRIGS** row selected, press **RIGHT** to open EUCLID.

The firmware keeps one menu window at a time, so EUCLID takes TRACK TRIG
EDIT's place; **NO** brings it back with the TRIGS row selected. Opened with
FUNC+RIGHT, NO returns to the main screen.

With EUC on, every change regenerates the track at once: steps that gain a
pulse get a fresh trig (no locks, no condition), and steps that lose one are
cleared together with their locks, exactly as the stock grid editor removes a
trig. Trigs past the track's length are cleared. Changing the pattern or
track length on PATTERN SCALE regenerates every EUC track of the pattern.

Settings are kept per bank, pattern and audio track. Turning EUC off leaves
the last generated trigs as ordinary trigs that can be edited as usual.

**Purple trigs (MKII).** The MKII panel keeps one colour per key and state.
While grid recording on an audio track with EUC on, the 16 trig keys show a
trig in purple instead of red, at the stock LED brightness; selecting another
track, turning EUC off or leaving grid recording restores the stock red. The
MKI's trig LEDs mix only red and green, so they stay stock.

### Quick tutorial

1. Select track 1 with a sample. Hold FUNC and press DOWN until TRIG MODE shows EUCLID, then release FUNC.
2. Press FUNC+RIGHT to open EUCLID, then press YES: EUC ON writes four trigs on steps 1, 5, 9 and 13.
3. Turn A to PL1 5 and B to PL2 3, then turn LEVEL to XOR: steps where only one generator pulses keep a trig. Press PLAY to hear it.
4. Turn F to rotate the whole rhythm, then press NO: the EUCLID panel shows 5:3, XOR and the new trigs. Press YES on the page to turn EUC off and keep the trigs.

### Changes to stock flows

Euclid Seq changes these stock flows, only in a build that includes it.

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
- **With EUC on, the TRIG keys and live recording do not add or remove trigs
  on that track,** as in the Analog Rytm's Euclidean mode. Holding a trig
  still opens its locks, and the SLIDE, SWING and REC.TRG rows edit as usual.
  To turn it off, open EUCLID and press YES. Checked neighbours:
  hold-for-lock, the other trig rows, other tracks, live recording on other
  tracks, EUC off.
- **TRIG MODE lists a seventh row, EUCLID, on audio tracks.** The list
  already scrolls three rows at a time, so the window is unchanged; rows 1
  to 6 and the MIDI tracks' three rows are stock. While EUCLID is chosen
  the stock mode is TRACKS for everything except the mode panel, the
  compact parameter page beside it and the status-bar icon. A seventh mode
  value was rejected: six stock tables are indexed by the mode without a
  range check. Checked neighbours: UP/DOWN through all rows and back, the
  MIDI tracks' list, TRIG keys playing tracks, trig LEDs, the parameter
  page. To leave the mode, choose another row.
- **In the EUCLID mode, FUNC+RIGHT opens the EUCLID page.** Stock
  FUNC+RIGHT shifts the track's trigs one step later in grid recording and
  changes nothing on the main screen otherwise (measured in the emulator);
  in the EUCLID mode that shift is replaced. FUNC+RIGHT was chosen over
  YES, which arms tracks. In every other trig mode FUNC+RIGHT is stock.
- **With EUC on, FUNC+LEFT and FUNC+RIGHT do not shift that track's trigs**
  in grid recording, in any trig mode, so the generator's pattern stays in
  place; TRO rotates it instead. Tracks with EUC off, and shifts from
  TRACK TRIG EDIT's SLIDE, SWING and REC.TRG rows, shift as stock. Checked
  neighbours: FUNC+LEFT/RIGHT on an EUC-off track, the EUCLID page.
- **On an MKII in grid recording, the trig keys' trig colour is purple while
  the selected track has EUC on.** Only the palette entry for a trig on the
  16 trig keys changes; trigless trigs, other keys and other views keep their
  stock colours.

## Compatibility and limitations

Octatrack MKI or MKII with base OS 1.40C; audio tracks. No module conflicts
are declared.

- The EUCLID trig mode is runtime state, like the stock trig mode, and
  starts as TRACKS after a reboot. Its panel refreshes when the screen is
  redrawn (track or page change, closing the page), not after every trig
  edit in grid recording.
- EUC settings are runtime state, not project data: a reboot or project
  reload turns EUC off and returns PL/RO/OP to their defaults. The trigs they
  produced are ordinary pattern data and stay.
- Copying, pasting or clearing a track or pattern moves trigs as usual; EUC
  settings stay with their bank, pattern and track and do not follow.
- MIDI tracks are not supported.
- One functional MKII report so far (TESTING.md); worst-case chip timing is
  unmeasured.
- Like every DRAM module, the build gives up about 10 MB of sample memory to
  the platform reserve.

## Implementation

`gen.c` is the pure-integer generator. `native.c` holds the settings table,
the pattern writer and the page; `hooks.s` the stubs and key layers.
`prepare.py` compiles both into the checked-in `control.s`. Nineteen
guarded sites in OS 1.40C:

| Site | Stock role | Change |
|---|---|---|
| `0x4007c0a8`, `0x4007b48c` | push and pop TRACK TRIG EDIT's key layer `0x400d0140` | the operand names a module copy: the window's five bindings by stock handler address plus RIGHT |
| `0x40051970` | grid editor places a trig on an empty step (press) | skipped while EUC is on |
| `0x400601aa` | grid editor removes a held trig on release | skipped while EUC is on |
| `0x4004c912` | PATTERN SCALE length setter, after the store | replays its call, then regenerates EUC tracks |
| `0x40042d1c` | `REC_TRIG`, the live recorder | returns no step on an EUC track |
| `0x40013634` | LED-row sender | first keeps the MKII trig-key palette (`0x40013368`) purple or red |
| `0x40058722` | TRIG MODE window: list of 6 rows (3 on MIDI), current row | 7 rows on audio tracks; row 6 selected in the EUCLID mode |
| `0x40051f18`, `0x40051f88` | UP/DOWN store the row's mode in `0x460d16f0` | row 6 stores TRACKS and sets the module's EUCLID flag |
| `0x40035a30`, `0x40035a44`, `0x400359fa` | the row painter's mode, icon and name tables | seven-entry module tables (stock entries by address, plus EUCLID and an original icon) |
| `0x40035854` | status-bar trig-mode icon | the EUCLID icon in its mode |
| `0x40045826`, `0x40035f84`, `0x40044932` | mode panel frame, title and body (not in TRACKS) | drawn in the EUCLID mode with the module's title and body |
| `0x4004d95c` | compact parameter page beside the panel | also in the EUCLID mode |
| `0x400502f8` | grid recording trig shift (FUNC+LEFT/RIGHT) | skipped on an EUC track (TRIGS row or no TRACK TRIG EDIT) |
| `0x400503c4` | FUNC layer's RIGHT handler (trig shift in grid recording) | opens the EUCLID page in the EUCLID mode |

The stock mode word `0x460d16f0` is never set to a seventh value: its 30
references in 1.40C include unchecked table lookups, and none copies it into
battery RAM or a saved file (the only other store swaps it with
`0x400c0aec` when switching between audio and MIDI tracks). The page draws
with the stock dial widget `0x400479b4`, text `0x40013904` and the AMP
SETUP frame calls.

The writer edits the RAM bank and the battery mirror `0x1001614e`, sets the
stock dirty flags and calls the stock lock-index rebuild `0x400339d8` and
track publication `0x4009da20`, as VECTOR does. It runs only from key, knob
and length-setter events on the UI task.

## Tests and measurements

`verify.py` (host gate) compiles `gen.c` and compares 633,984 settings with an
independent formulation (pulse *j* of *k* over *n* steps at ⌈j·n/k⌉), plus
hand-checked patterns. Emulator checks and their limits are in
[TESTING.md](TESTING.md), with the first functional MKII report.

## Screens and audio

No captures are published yet; emulator captures will be added with the
first release.

## Authorship and licences

Original code by bretth18 under the MIT licence ([LICENSE](LICENSE)). Window,
key-layer and pattern-write idioms follow VECTOR and Analog BD (repeat98) and
Sam Banks' MIT octabam editor tooling; firmware facts are cited from octabam
and Play Modes (devilfish707). No Elektron firmware, routines, tables or
images are included.
