# Euclid Seq testing

Proof level: **PORT** for the behaviours listed under Emulator; functional
MKII reports for earlier images are under Hardware, recorded as reported.

## Host gate

`python3 modules/euclid-seq/verify.py`: `gen.c` compiled with the host C
compiler matches an independent Python formulation on 633,984 settings
(lengths 1–64, all pulse counts, sampled rotations, all four operators) and
13 hand-checked patterns, including E(3,8) `x..x..x.`, E(5,8) `x.x.xx.x` and
`XOR` of E(4,8) and E(3,8) `..xxx...`. Passed 9 October 2026.

The same gate compiles `proj.c`: 11,960 random entries at 305 bank, pattern
and track positions format to a `#EUCLID_SEQ=` line and parse back to the
same bytes; two sample lines match byte for byte; default entries write no
line; 17 malformed or foreign lines (bad bank, pattern, track, EUC flag,
range, field count, trailing characters, Play Modes' key) are ignored.
Passed 9 October 2026.

The same gate checks the LFO arithmetic: `es_modulate` (`gen.c`) against
an independent formulation on 40,000 random settings and offsets (lengths
1–64, offsets up to three full swings either way, the clamps at both ends),
and `es_step` against `es_mask` for every one of them; 9,216
`#EUCLID_LFO=` lines (every bank, Part, track, LFO and destination) round-
trip, one sample line matches byte for byte and 9 malformed lines are
ignored. Passed 9 October 2026.

## Emulator

Headless `ot_emu` (built from this checkout) on a `make bus` image
(`OCTABAM_STATIC_STOCK=1`) containing only Euclid Seq, empty scratch card,
pattern A01, track 1, 120 BPM, stopped transport unless stated. Scripted
panel input; RAM and battery-mirror bytes read back. Passed with both the
MKII and the MKI panel on 9 October 2026 (17/17 each):

- RIGHT on TRACK TRIG EDIT's TRIGS row opens EUCLID (TRACK TRIG EDIT closes).
- YES: EUC ON writes E(4,16) `0x1111` to mask 0 and the battery mirror.
- A to PL1 5 gives E(5,16) `0x2491`; PL2 3 with XOR gives `0x2cd0`; TRO 2
  rotates the result two steps later.
- NO returns to TRACK TRIG EDIT; a second NO closes it as stock.
- EUC on: TRIG on an empty step does nothing on the TRIGS row and in the grid;
  tapping a Euclid trig keeps it.
- Holding a Euclid trig and turning A writes a lock and keeps the trig.
- PATTERN SCALE length 16 → 32 regenerates E(5,32) `0x04102081`; back to 16
  restores E(5,16); trigs past the length are cleared.
- Playing: track 1 fires 0, 500, 875, 1,250 and 1,625 ms after step 1
  (steps 1, 5, 8, 11, 14 at 120 BPM, within 3 ms of the emulator clock).
- EUC off: TRIG3 adds a trig and TRIG5 removes one with its locks (stock).

Also observed: with EUC on, the SLIDE row still edits the slide mask.

EUCLID trig mode and restyled page (same harness, 9 October 2026, MKII and
MKI panels, 15 further checks, 32/32 in all):

- FUNC+DOWN steps TRIG MODE to a seventh row, EUCLID; the stock mode word
  `0x460d16f0` stays 0 (TRACKS); DOWN on EUCLID stays there; UP returns to
  DELAY CTRL (mode 5) and on to TRACKS.
- In the EUCLID mode the main screen differs from TRACKS (the EUCLID panel);
  TRIG1 outside grid recording plays track 1 exactly as often as in TRACKS;
  the trig LED rows equal TRACKS'.
- FUNC+RIGHT opens the EUCLID page on the main screen and in grid
  recording, where it does not shift trigs; NO closes it (knob A no longer
  edits PL1).
- With EUC on, FUNC+LEFT (EUCLID mode) and FUNC+RIGHT (TRACKS) leave the
  track's trigs at `0x1111`. On track 2 with EUC off, FUNC+RIGHT shifts a
  trig `0x0001` → `0x0002` and FUNC+LEFT shifts it back, as stock.
- MIDI tracks: TRIG MODE still has three rows (modes 0, 1, 4).

Stock FUNC+RIGHT (stock image, emulator): on the main screen outside grid
recording nothing changed (identical LCD, unchanged trigs); in grid
recording it shifted the track's trigs one step later (`0x0005` →
`0x000a`) and FUNC+LEFT shifted them back.

Trig mode persistence (static reading of the 1.40C image): all 30
references to `0x460d16f0` were listed; the only stores are the TRIG MODE
window and the audio/MIDI swap with `0x400c0aec`, so the mode is not
written to battery RAM or the card. The module never stores a value above
5 there.

LCD captures of the selector, the main screen in the EUCLID mode and the
page were checked by eye; they are not yet published.

Live recording (REC+PLAY, TRIG9 three times on track 1): stock and the
module with EUC off both record `0x1120`; with EUC on the trigs stay
`0x1111`.

Purple trigs (MKII panel): with EUC on in grid recording, 16 palette
messages set trig-key indices 1, 5, 9 … 61 to `44 00 44`; selecting track 2,
leaving grid recording or EUC off sends `44 00 00` (stock red at brightness
2). The emulator does not render colour: the physical colour is not
verified.

### Saving with the project (emulator)

Same `make bus` build, MKII panel, a 64 MB card image with an empty set
OCTABAM, driven through the panel; battery RAM read back through the
emulator. 15/15 passed on 9 October 2026:

- Settings on A01 T1 (EUC on, PL1 5, XOR), A01 T2 (EUC off, PL2 3, RO2 2)
  and A02 T1 (EUC on, PL1 3); FUNC+PROJECT saves the new project, PROJECT >
  SAVE writes `project.strd` with exactly three `#EUCLID_SEQ=` lines
  (`A01:1:1,5,0,0,0,0,1`, `A01:2:0,4,3,0,2,0,0`, `A02:1:1,3,0,0,0,0,0`).
- Later edits (T1 PL1 7, which regenerates T1; T3 EUC on), then PROJECT >
  RELOAD: settings and trigs equal the saved ones again.
- Power cycle in the emulator: a new process with the saved card and the
  1 MB battery RAM (`--cs1-in`), no LOAD PROJECT posted (`--no-post`):
  the settings equal the saved ones at start and 7 s later, the trigs too,
  and knob A on the page still regenerates T1 (PL1 6, `0x4949`).
- A new process with empty battery RAM and an explicit LOAD PROJECT: the
  settings come from the file, the trigs from the banks.
- The stock 1.40C image loads the same project: its trigs load and the
  card log shows no project error (it ignores the lines).
- A project saved by stock firmware (no lines), loaded on this build with
  the earlier battery RAM: every setting reads as the default (EUC off).

Composition: a `make bus` build with Euclid Seq, Play Modes and Scale
Quantizer links (the loader and writer sites differ). In it, a saved project
holds the quantizer's `#SEQUENCER_SCALE=`, `#SEQUENCER_ROOT=`,
`#SYNTH_GLIDE=` lines and ours, and reloads our setting on a fresh battery
RAM. No Play Modes line was written (no play mode was changed), so its
line was not read back.

Found and fixed during these runs: `m68k-elf-gcc` compiled the entry copy
in `es_project_line` to `move.b (%a0)+,(%a0,%d0.l)`, which the emulator
executes with the incremented `a0`, writing each loaded entry one byte late.
The copy is now written field by field; no other instruction of that shape
remains in `control.s`.

An emulator power cycle is not a hardware power cycle: the unit's own
battery RAM retention has not been tested (see Hardware).

### LFO destinations and live pulses (emulator)

Same `make bus` build (Euclid Seq alone), MKII panel unless stated, 120
BPM, track 1 EUC on (E(4,16), mask 0 `0x1111`), the LFO at its defaults
(SPD 32, triangle, FREE) and DEP 127 unless stated. Steps were read from
the sequencer itself: each call of the step evaluation `0x4009d1e8` for
track 1 (its step argument) and whether it reached the sample-trig store
(`0x4009d42a`) or the trigless store (`0x4009d4b6`). 9 October 2026:

- LFO SETUP: turning PMTR past FX2 reaches EUC PL1 … EUC OP (the screen
  shows EUC over the name); the Part byte reads `06` (LFO 1's own speed)
  and the module's table the destination; turning back below stores the
  stock codes again.
- EUC PL1, DEP 127, 64 steps: the track fired every step near the LFO's top
  and none near its bottom (the clamps at LEN and 0), 28 of 64 steps
  differing from the stored E(4,16); mask 0 stayed `0x1111` throughout.
- Each destination changes what plays (64 steps each): PL2 15 steps
  differ, RO1 16, RO2 6 (with PL2 3), TRO 16, OP 2 (AND empties the steps
  while the LFO holds OP there). DEP 0 on PL1: all 64 steps equal the
  stored pattern.
- A trigless lock trig on step 3 of the modulated track (FUNC+TRIG3, a lock
  on A): over 64 steps step 3 fired every time, as a trigless lock trig
  (`0x4009d4b6`) where the modulation left it free and as a sample trig
  where a pulse landed on it. Unmodulated, it fired as a trigless trig each
  bar, as stock.
- Live LEDs: in grid recording while playing, 72 different trig-row LED
  messages over 8 s (the live pulses and the playhead); after STOP the rows
  return to `01 01 01 01` (the stored pattern). The EUCLID panel's bar in
  the EUCLID mode showed the live pulses (captures at 2 s and 5 s differ).
- Stock destinations unchanged: track 2 (EUC off) with LFO 1 on PTCH (code
  0), FX1's first parameter (code 18) and its own speed (code 6), DEP 127:
  on the stock image and on this build the same single field moves over the
  same range (the CF or DSP record's halfword for that code, 0 … 32,512),
  sampled every 50 ms for 8 s. The two images' LFO phase differs (different
  boot timing), so the raw samples are not compared.

Saving the LFO destinations (64 MB card image, as above): LFO 1 → EUC PL1
and LFO 2 → EUC OP on track 1; the Part bytes read `06 07` (the LFOs' own
speeds). PROJECT > SAVE writes exactly `#EUCLID_LFO=A1:1:1:1` and
`#EUCLID_LFO=A1:1:2:6`; a later change (LFO 1 → EUC RO1) is undone by
PROJECT > RELOAD; the destinations survive the emulator power cycle
(battery RAM only) and load from the file with empty battery RAM. **Stock
safety:** the stock 1.40C image loads the project with Part bytes `06 07`;
over 6 s of sampling, only track 1's CF halfwords 6 and 7 (LFO 1 and 2
speed) move, nothing in its DSP record. 9/9 passed.

Composition: `make bus` builds with Euclid Seq + FM Synth (`SYNTH MACHINE`,
whose LFO hooks sit at `0x40003ca4` and `0x4000d03e`, right after ours) +
Play Modes, and with Euclid Seq + Play Modes + Scale Quantizer, link. In
the FM Synth build EUC PL1 modulation fired exactly the same 64 steps as
the Euclid-only build, and PTCH, FX1 and own-speed destinations on track 2
moved the same field over the same range. In the Play Modes + Scale
Quantizer build EUC PL1 modulation fired the same 64 steps and FX1 on
track 2 moved the same field over the same range.

The earlier checks on this build: 34/34 on the MKII and the MKI panel, the
live-recording check holds `0x1111`, and the saving-with-the-project script
15/15 (its last case, a stock-saved project, timed out once in wall-clock
terms while seven emulators ran at once and passed when run alone; the
VACEUCLID5 build takes the same 193 s there).

Executed instructions added (emulator instruction counter between the site
and the stub's return, three LFOs on EUCLID destinations of track 1,
playing in grid recording, 2 s; interrupts taken inside a stub count too):

| Path | Runs | Added instructions |
|---|---|---|
| LFO engine, per LFO per frame (24 per frame, about 2,760 frames/s) | 132,432 | 19–28 typical, 96 at most (a routed LFO) |
| Step evaluation, any-trig test, per track per step | 128 | 103–138 typical, 382 at most |
| Step evaluation, sample-trig test (event steps only) | 16 | 373 |
| Grid LED painter, per trig key per paint, while playing | 624 | 401–404 typical, 1,992 at most |

These are executed-instruction counts, not modelled or hardware cycles; no
chip timing was measured.

### Look-ahead at upcoming trigs (10 October 2026)

Static scan of the 1.40C image (local disassembly, never committed): the
86 routines that index the track record (stride `0x91a`) were grouped by
caller. On the sequencer's own path, everything reached from the tick
`0x400a1e10`, three touch the record: the tick itself (length, scale and
playback fields only, no trig masks), the track publication `0x4009da20`
(calls the step evaluation) and the step evaluation `0x4009d1e8`. The
evaluation reads mask 0 in three places:

| Reader | Address | Looks ahead | Result |
| --- | --- | --- | --- |
| Any-trig test | `0x4009d37c` / `0x4009d382` | no (this step) | live pulse since VACEUCLID6 |
| Sample-trig test | `0x4009d418` / `0x4009d41c` | no (this step) | live pulse since VACEUCLID6 |
| Slide search, first candidate and loop | `0x4009d576`, `0x4009d5dc` | yes: the next step with a trig in masks 0-3, wrapping at the track length | live pulse from this source on |

The other routines are the grid editor, copy and paste, PATTERN SCALE, the
trig LED painter and the project and bank code, on the UI task; they work on
the stored pattern by design. No STATIC preload reader of the trig masks was
found on the sequencer's path; STATIC playback of an added pulse was not
tested.

**Defect found and fixed:** on VACEUCLID6 the slide search read the stored
mask 0. Stock enters it only from a step that has a trig in masks 0-3, so
the wrap-around search always ends at that step at the latest; a live pulse
need not be stored, so on a modulated EUC track with stored masks 0-3 empty
and a slide on a live pulse the search never ended and the sequencer task
stopped. Emulator, `slidehang.py` (EUC on, LFO 1 on EUC PL1 at DEP 127,
masks 0-3 cleared, every slide bit set): on the VACEUCLID6 image no step of
any track was evaluated in 4 s (with the slide bits left clear, 32 per
track and 11 pulses). With the two new sites the search takes the live
pulse and always counts the current step as found: 32 steps per track evaluated in
4 s and 11 pulses fired, as without the slides. On an unmodulated track
both sites read the stored masks exactly as stock (the forced current step
already has a stored trig there); slide timing on such a track was not
compared with the stock image.

Same `make bus` development build with the fix, 10 October 2026: 34/34
regression checks on the MKII and the MKI panel, live recording holds
`0x1111`, 10/10 LFO checks, 9/9 LFO saving and stock-safety checks, 15/15
saving checks, 3/3 slide checks.

**Not verified in the emulator:** swing and track speed applied to generated
trigs (they are stock trigs played by the stock sequencer, but the
measurement attempted was unreliable), tempo changes during playback, bank
changes, Part save and reload (no Part code is hooked; the settings are not
Part data), MIDI tracks; for LFO modulation: firmware look-ahead on the
live pulses by STATIC sample preload, Parts
other than Part 1, Part reload, copy and paste, scenes and locks on DEP,
the LFO trig modes other than FREE, tempo changes.

## Stock flows compared

With and without EUC on, in the emulator: TRACK TRIG EDIT UP/DOWN, YES, NO,
PAGE, the SLIDE and SWING rows, grid TRIG press/hold/release, PATTERN SCALE
length. RIGHT and LEFT in a stock TRACK TRIG EDIT changed nothing on 16- and
64-step patterns (stock image). Not compared: live recording, chromatic,
slots and slices trig modes.

## Hardware

VACEUCLID6 (LFO destinations and live pulses; source `9bbac30`, main image
SHA-256 `98de271410f821f006a5e4bd2cdfe4af9b92ac7c417f68e3390aa573e7e1bcc5`)
has not run on hardware yet. In the emulator that exact image passed
34/34 on the MKII and the MKI panel, the live-recording check, 10/10 LFO
checks, 9/9 LFO saving and stock-safety checks and 15/15 saving checks.

### 9 October 2026, MKII, bretth18 (functional report, VACEUCLID5)

Private image VACEUCLID5 (personal boot logo plus Euclid Seq, source
`3dd9ad9`, main image SHA-256
`921f7a9214f70dee7407a83d0c1b886d67b5b62ffdd84e2f40fba87d34b82fe9`), OS
1.40C, Octatrack MKII. The tester reported that every step of the
persistence checklist passed ("everything is working"):

- Settings on A01 track 1 (EUC on, PL1 5, XOR), A01 track 2 (EUC off, PL2 3,
  RO2 2) and A02 track 1 (EUC on, PL1 3), then PROJECT > SAVE.
- Later edits (track 1 PL1 7, EUC on for track 3), then PROJECT > RELOAD:
  the saved settings and their trigs came back, track 3 EUC off.
- A real power cycle (off about 10 s, on with the same project): the
  settings were restored without a project load, and knob A on track 1's
  page still regenerated the pattern.
- Loading another project and coming back: the settings came back.
- A project saved on stock firmware loaded with EUC off on every track.

Limitations: one unit and one session; Parts, bank changes, SAVE TO NEW,
copy and paste, MIDI tracks and the MKI were not exercised.

### 9 October 2026, MKII, bretth18 (functional report, VACEUCLID4)

Private image VACEUCLID4 (personal boot logo plus Euclid Seq, source
`d37b648`, main image SHA-256
`0087f078ff24b2ef61ce3e26f1757d4f1623f10e7e5971418ec0344ceb3b13ff`), OS
1.40C, Octatrack MKII. Results as reported by the tester, all passed:

- TRIG MODE (FUNC+UP/DOWN) lists EUCLID last and scrolls back to TRACKS.
- In the EUCLID mode the main-screen panel shows the track's settings and
  step bar.
- FUNC+RIGHT opens the EUCLID page on the main screen and in grid
  recording; the page is readable; NO closes it.
- EUC on lights the new trigs at once, without PLAY (the VACEUCLID2 defect
  is fixed on hardware).
- FUNC+LEFT/RIGHT in grid recording do not move an EUC track's trigs; an
  EUC-off track shifts as stock.
- Purple trigs, parameter locks on held trigs and playback as before.
- Live recording leaves an EUC track alone while another track records.

Limitations: one unit and one session; duration and project contents were not
recorded; MIDI tracks, Parts, bank changes and the MKI were not exercised.
EUC settings are not yet saved with the project.

### 9 October 2026, MKII, bretth18 (functional report, VACEUCLID2)

Private image VACEUCLID2 (personal boot logo plus Euclid Seq, source
`a2b7a85`), OS 1.40C, Octatrack MKII. Results as reported by the tester:

- The EUCLID page opens from TRACK TRIG EDIT's TRIGS row with RIGHT; NO
  returns to TRACK TRIG EDIT and a second NO closes it. Passed.
- EUC on generates the pattern and the knobs change it as on the Analog
  Rytm. **Defect:** the trig LEDs did not show the new trigs until PLAY was
  pressed. Cause found in the emulator: while the EUCLID window is open the
  firmware's grid LED painter (`0x40043fdc`) does not run, so the trig rows
  were not repainted. Fixed after this image by calling the stock trig LED
  painter `0x40034bd4` after each regeneration; the emulator now sends the
  trig rows at once (EUC on: `20 01 21 01 22 01 23 01`). Not yet re-run on
  hardware.
- Purple trigs on the MKII; red again on another track, outside grid
  recording and with EUC off. Passed.
- With EUC on, an empty step cannot be set; holding a step and turning a knob
  still sets a parameter lock. Passed.
- Live recording on an EUC track: not tested.
- Playback with swing, another track speed and a tempo change. Passed.
- PATTERN SCALE 16 → 32 → 16 regenerates. Passed.
- Project save and power cycle: the trigs remained and EUC came back OFF, as
  documented. Passed.

Limitations: one unit and one session; duration and project contents were not
recorded; live recording, MIDI tracks, Parts and bank changes were not
exercised. The tester found the EUCLID page hard to read.

## Performance

Not measured. The module runs only on key, knob and length-setter events
(one pass over at most 64 steps); nothing runs per step or per sample.
