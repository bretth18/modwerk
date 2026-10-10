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

The track's LFOs can modulate all six settings: LFO SETUP's PMTR list
continues past FX2 into **EUC PL1, PL2, RO1, RO2, TRO and OP**. A modulated
track plays the generator's pulses as the LFO moves them, step by step,
while the stored trigs stay the unmodulated pattern.

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

**LFO destinations.** In LFO SETUP (FUNC+LFO), turning PMTR past the last
FX2 parameter reaches six more destinations, shown as EUC over the name:

| PMTR | Modulates | Full depth moves it by |
|---|---|---|
| EUC PL1 | PL1 | the track length (clamped 0–LEN) |
| EUC PL2 | PL2 | the track length (clamped 0–LEN) |
| EUC RO1 | RO1 | the track length (clamped 0–LEN-1) |
| EUC RO2 | RO2 | the track length (clamped 0–LEN-1) |
| EUC TRO | TRO | the track length (clamped 0–LEN-1) |
| EUC OP | OP | four operators (clamped OR–SUB) |

SPD, DEP, WAVE, MULT, TRIG, scenes and locks on the LFO page work as for any
destination; DEP 0 leaves the pattern as set. Several LFOs on one setting
add up. The destinations act only while EUC is on for the track.

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

**Saving.** The settings (EUC on or off, PL1, PL2, RO1, RO2, TRO, OP) are
saved with the project, like the stock project settings: every write of
the project file (PROJECT > SAVE, SYNC TO CARD) includes them, RELOAD and
loading the project bring them back, and over a power cycle they stay in
battery RAM, as the unit keeps its current bank. They follow banks and
patterns, not Parts: saving or reloading a Part leaves them alone. A project
saved without them (on stock firmware, or before this version) loads with
EUC off on every track.

**LFO modulation.** With an LFO on a EUCLID destination, the sequencer
asks the generator for each step as it plays, with the LFO's current value
added to the setting: the rhythm moves in time with the LFO, at the
sequencer's own tempo, speed and swing. The pattern's stored trigs stay the
unmodulated rhythm, so saving, copying and the stock editor see the settings
as set. A step the modulation adds plays as a plain sample trig: no
parameter locks unless the step holds a trigless (green) lock trig, whose
locks it then uses, and no condition. A stored trig the modulation removes
does not play, with its locks. Trigless lock trigs fire as usual on every
step the modulation leaves free. While playing, the grid recording trig
LEDs and the EUCLID panel's bar show the live pulses; stopped, the stored
pattern. The page's dials show the settings as set.

**Purple trigs (MKII).** The MKII panel keeps one colour per key and state.
While grid recording on an audio track with EUC on, the 16 trig keys show a
trig in purple instead of red, at the stock LED brightness; selecting another
track, turning EUC off or leaving grid recording restores the stock red. The
MKI's trig LEDs mix only red and green, so they stay stock.

### Quick tutorial

1. Select track 1 with a sample. Hold FUNC and press DOWN until TRIG MODE shows EUCLID, then release FUNC.
2. Press FUNC+RIGHT to open EUCLID, then press YES: EUC ON writes four trigs on steps 1, 5, 9 and 13.
3. Turn A to PL1 5 and B to PL2 3, then turn LEVEL to XOR: steps where only one generator pulses keep a trig. Press PLAY to hear it.
4. Turn F to rotate the whole rhythm, then press NO: the EUCLID panel shows 5:3, XOR and the new trigs.
5. Hold FUNC and press LFO for LFO SETUP. With LFO 1 selected, turn A (PMTR) all the way right, then back until it shows EUC PL1; turn F (DEP) up and press NO. Press PLAY: the pulse count rises and falls with the LFO, and the trig LEDs follow it in grid recording. Turn DEP to 0 or YES on the EUCLID page (EUC off) to stop it.

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
- **LFO SETUP's PMTR list continues into six EUCLID destinations on audio
  tracks.** Stock PMTR stops at the last FX2 parameter; turning further
  reaches EUC PL1 to EUC OP. A new LFO page or gesture was considered and
  rejected: PMTR is where every Octatrack destination is chosen. The Part
  keeps a stock-safe placeholder, the LFO's **own speed** (LFO 1 SPD1, LFO 2
  SPD2, LFO 3 SPD3): a project or Part opened on stock firmware, or on a
  build without this module, sees that LFO modulating only its own speed,
  which reaches no sound, never an unknown destination. The EUCLID
  destination itself lives in the module's battery table and the project's
  `#EUCLID_LFO=` lines. Choosing the LFO's own speed on purpose clears the
  EUCLID destination. Checked neighbours: every stock PMTR position (list
  order, both ends), LFO SPD/DEP and their stock destinations on another
  track (same modulated field and range as stock), the stock image loading
  a project saved with EUCLID destinations.
- **On a modulated EUC track the sequencer plays the live pulses.** The
  step evaluation's two mask-0 tests take the modulated generator's pulse
  instead of the stored trig; masks 1 to 3 (trigless locks, slides and the
  rest), conditions, micro-timing and swing are read as stock. Unmodulated
  tracks (no LFO on a EUCLID destination, or EUC off) play exactly the
  stored trigs. While playing, grid recording's trig LEDs show the live
  pulses. Checked neighbours: trigless lock trigs on the modulated track,
  DEP 0, EUC off, other tracks, stopping (the LEDs return to the stored
  pattern).
- **The project file gets `#EUCLID_SEQ=` lines.** One line per bank,
  pattern and track whose Euclid settings differ from the defaults, among
  the project settings, so the settings save and load with the project. The
  stock loader skips every line that starts with `#` (as it does Play Modes'
  and the quantizer's lines), so the file still loads on stock firmware,
  which ignores the lines and drops them at its next save. Nothing else in
  the file changes. Checked neighbours: PROJECT > SAVE and RELOAD, loading
  the project on stock firmware, a stock project on this build, the power
  cycle (battery RAM only).

## Compatibility and limitations

Octatrack MKI or MKII with base OS 1.40C; audio tracks. No module conflicts
are declared.

- LFO destinations follow bank, Part, track and LFO in the module's table.
  RELOAD PART, Part copy and paste restore or copy the Part's placeholder
  but not the table: by design, after a Part reload the LFO keeps the
  destination last chosen in that Part, and a pasted Part's placeholder
  shows as the LFO's own speed. Part reload, copy and paste were not
  tested; only Part 1 was exercised in the emulator.
- Modulation is decided per step on the sequencer task. Firmware that looks
  ahead at upcoming trigs (sample streaming preload for STATIC machines,
  slide and trigless searches) reads the stored pattern, not the live
  pulses; this was not measured. The EUCLID page's dials and the panel
  title show the settings as set, not the modulated values.
- Battery RAM `0x100fd100..0x100fd710` holds the LFO destinations.
- The EUCLID trig mode is runtime state, like the stock trig mode, and
  starts as TRACKS after a reboot. Its panel refreshes when the screen is
  redrawn (track or page change, closing the page), not after every trig
  edit in grid recording.
- EUC settings are saved with the project, not in the bank files: copying
  a project's banks to another project without its project file loses them
  (the trigs stay).
- Copying, pasting or clearing a track or pattern moves trigs as usual; EUC
  settings stay with their bank, pattern and track and do not follow.
- Battery RAM `0x100f9000..0x100fd010` holds the settings. Stock references
  nothing there; Play Modes uses `0x100f8600..0x100f8f06`, so the two fit
  together. A future module using this range would conflict.
- MIDI tracks are not supported.
- Functional MKII reports on earlier development images (TESTING.md); LFO
  modulation has not run on hardware; worst-case chip timing is unmeasured.
- Like every DRAM module, the build gives up about 10 MB of sample memory to
  the platform reserve.

## Implementation

`gen.c` is the pure-integer generator. `native.c` holds the settings table,
the pattern writer and the page; `hooks.s` the stubs and key layers.
`proj.c` formats and parses the project file's lines. `prepare.py` compiles
them into the checked-in `control.s`. Thirty guarded sites in OS 1.40C:

| Site | Stock role | Change |
|---|---|---|
| `0x4007c0a8`, `0x4007b48c` | push and pop TRACK TRIG EDIT's key layer `0x400d0140` | the operand names a module copy: the window's five bindings by stock handler address plus RIGHT |
| `0x40051970` | grid editor places a trig on an empty step (press) | skipped while EUC is on |
| `0x400601aa` | grid editor removes a held trig on release | skipped while EUC is on |
| `0x4004c912` | PATTERN SCALE length setter, after the store | replays its call, then regenerates EUC tracks |
| `0x40042d1c` | `REC_TRIG`, the live recorder | returns no step on an EUC track |
| `0x40013634` | LED-row sender | first keeps the MKII trig-key palette (`0x40013368`) purple or red |
| `0x400866e2` | project loader head, after it stores its parse-only flag | a storing pass first resets every setting to the defaults |
| `0x40088224` | project loader's next-line point (every line, `#` lines included) | reads `#EUCLID_SEQ=` lines on a storing pass |
| `0x400888d2` | project writer, before one stock setting's line | writes one `#EUCLID_SEQ=` line per non-default track first |
| `0x40058722` | TRIG MODE window: list of 6 rows (3 on MIDI), current row | 7 rows on audio tracks; row 6 selected in the EUCLID mode |
| `0x40051f18`, `0x40051f88` | UP/DOWN store the row's mode in `0x460d16f0` | row 6 stores TRACKS and sets the module's EUCLID flag |
| `0x40035a30`, `0x40035a44`, `0x400359fa` | the row painter's mode, icon and name tables | seven-entry module tables (stock entries by address, plus EUCLID and an original icon) |
| `0x40035854` | status-bar trig-mode icon | the EUCLID icon in its mode |
| `0x40045826`, `0x40035f84`, `0x40044932` | mode panel frame, title and body (not in TRACKS) | drawn in the EUCLID mode with the module's title and body |
| `0x4004d95c` | compact parameter page beside the panel | also in the EUCLID mode |
| `0x400502f8` | grid recording trig shift (FUNC+LEFT/RIGHT) | skipped on an EUC track (TRIGS row or no TRACK TRIG EDIT) |
| `0x400503c4` | FUNC layer's RIGHT handler (trig shift in grid recording) | opens the EUCLID page in the EUCLID mode |
| `0x400392cc` | LFO SETUP knob handler, audio PMTR: list position to code | six EUCLID positions after FX2; a EUCLID choice stores the LFO's own speed and the module's table entry |
| `0x4003bf64` | PMTR formatter | prints EUC and the destination for the selected LFO's placeholder |
| `0x40003c98`, `0x4000d032` | LFO engine (and its copy in the frame builder): load the destination code | the placeholder with a table entry modulates the module's buffer, not the speed |
| `0x4009d37c`, `0x4009d418` | step evaluation `0x4009d1e8`: mask 0 in the any-trig test and the sample-trig test | the modulated pulse on a modulated EUC track |
| `0x40034df4` | grid LED painter, TRIGS state, mask-0 word | the live pulses while playing |

The stock mode word `0x460d16f0` is never set to a seventh value: its 30
references in 1.40C include unchecked table lookups, and none copies it into
battery RAM or a saved file (the only other store swaps it with
`0x400c0aec` when switching between audio and MIDI tracks).

The stock PMTR codes are page × 6 + slot, 0–29; the engine adds an LFO's
output into the parameter halfword the code indexes, and a code above 29
would land in the DSP record's following fields (sample playback data, read
in the emulator), so the module never stores one. The engine stub routes
the placeholder only when the module's table names a destination, presets
its halfword to the centre (0x4000) and lets the stock arithmetic add depth
× output; the step evaluation reads the offset from the centre. The page draws
with the stock dial widget `0x400479b4`, text `0x40013904` and the AMP
SETUP frame calls.

The writer edits the RAM bank and the battery mirror `0x1001614e`, sets the
stock dirty flags and calls the stock lock-index rebuild `0x400339d8` and
track publication `0x4009da20`, as VECTOR does. It runs only from key, knob
and length-setter events on the UI task.

## Tests and measurements

`verify.py` (host gate) compiles `gen.c` and compares 633,984 settings with an
independent formulation (pulse *j* of *k* over *n* steps at ⌈j·n/k⌉), plus
hand-checked patterns, and round-trips the project-file lines (`proj.c`).
Emulator checks and their limits are in
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
