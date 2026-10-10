# Euclid Seq testing

Proof level: **PORT** for the behaviours listed under Emulator; **untested**
on hardware. Nothing below is a hardware result.

## Host gate

`python3 modules/euclid-seq/verify.py`: `gen.c` compiled with the host C
compiler matches an independent Python formulation on 633,984 settings
(lengths 1–64, all pulse counts, sampled rotations, all four operators) and
13 hand-checked patterns, including E(3,8) `x..x..x.`, E(5,8) `x.x.xx.x` and
`XOR` of E(4,8) and E(3,8) `..xxx...`. Passed 9 October 2026.

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
  edits PL1). FUNC+LEFT still shifts trigs earlier.
- Back in TRACKS, FUNC+RIGHT in grid recording shifts the trigs one step
  later, as stock.
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

**Not verified in the emulator:** swing and track speed applied to generated
trigs (they are stock trigs played by the stock sequencer, but the
measurement attempted was unreliable), tempo changes during playback, pattern and
bank changes, Part/project save and reload, power cycle, MIDI tracks.

## Stock flows compared

With and without EUC on, in the emulator: TRACK TRIG EDIT UP/DOWN, YES, NO,
PAGE, the SLIDE and SWING rows, grid TRIG press/hold/release, PATTERN SCALE
length. RIGHT and LEFT in a stock TRACK TRIG EDIT changed nothing on 16- and
64-step patterns (stock image). Not compared: live recording, chromatic,
slots and slices trig modes.

## Hardware

The EUCLID trig mode and restyled page (from VACEUCLID3 on) have not run on
hardware. The report below is for VACEUCLID2.

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
