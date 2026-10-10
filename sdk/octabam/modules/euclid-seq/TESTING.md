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
