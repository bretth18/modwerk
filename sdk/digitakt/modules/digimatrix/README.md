# Digi Matrix

Digi Matrix is a modulation matrix for the LFOs of the original Digitakt. Stock, each of a track’s two LFOs modulates one parameter of its own track. SETTINGS > MOD MATRIX adds a page of 8 routing slots; each sends any track’s LFO1 or LFO2 to any parameter of any track, with its own depth from -64 to +64, so one LFO can drive several parameters across several tracks by different amounts. Per slot, OWN says whether the LFO still modulates its own track’s DEST as well. The matrix lives in the pattern’s kit, so each pattern has its own and it is saved with the project.

By gdeo607 (@gdeo607) · MIT · Digitakt OS 1.53, 1.54 · imported from [gdeo607/digi1_mods](https://github.com/gdeo607/digi1_mods/tree/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6/mods/digimatrix) at 1.0b.

Modwerk metadata version: `1.0.0-experimental`.

## Where to find it

SETTINGS > MOD MATRIX.

1. Open SETTINGS and go to the MOD MATRIX row; it shows how many of the 8 slots are on.
2. Press YES on the row to open the page of 8 routing slots.
3. Choose a slot with UP/DOWN or the LEVEL knob and press YES to turn it on.
4. Set the slot with knobs A–F; NO leaves the page.

The page shows one slot a row: source track and LFO, destination track and parameter, DEP and OWN, for example `1 T1 L2 > T4 FLT.FREQ 32`.

## Controls

From the author’s [docs/USAGE.md](https://github.com/gdeo607/digi1_mods/blob/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6/docs/USAGE.md).

| Control | What it does |
| --- | --- |
| UP / DOWN or LEVEL | Choose one of the 8 slots; the slot under the cursor is shown inverted. |
| YES | Turn the slot under the cursor on, or off again. A slot switched on for the first time starts on the cursor’s own track: slot 3 routes track 3’s LFO1 to track 3. The knobs edit only a slot that is on. |
| NO | Leave the MOD MATRIX page. |
| Knob A | Source track, 1–8. |
| Knob B | Source LFO, 1 or 2 (L1 or L2 on the page). |
| Knob C | Destination track, 1–8. |
| Knob D | Destination parameter, named by its page: SRC.A to SRC.H (the track’s SRC page, whatever its machine calls them); FLT.TYPE, FREQ, RESO, ENV, ATK, DEC, SUS and REL; FLT2.A to FLT2.E (the second filter page); AMP.ATK, HOLD, DEC, OVER, DEL, REV, PAN and VOL; and L1.\* and L2.\*, so an LFO can modulate the other one’s speed, depth and so on. |
| Knob E | Depth, -64 to +64, 2 a notch. Each slot has its own depth, independent of the source LFO’s own DEP, which keeps controlling only its own track’s modulation. |
| Knob F | OWN: whether the source LFO still modulates its own track’s DEST as well (blank), or only what the matrix routes it to (X). |

The source LFO runs as it always did: its SPD, MULT, WAVE, PHAS, FADE and trig MODE are on its own track’s LFO page.

## Compatibility

Digi Matrix needs core 2.1 and no other mod. Modwerk’s builder refuses no mod beside it: in elekloader’s check it combines with every other Modwerk mod for its OS, NEIGHBOR, DIGISLICER and SOPHIE included (SOPHIE is built for OS 1.53 only). elekloader’s check decides at build time.

## Limitations

- Modwerk’s builder refuses no mod beside it: in elekloader’s check it combines with every other Modwerk mod for its OS, NEIGHBOR, DIGISLICER and SOPHIE included (SOPHIE is built for OS 1.53 only).
- Built for OS 1.53 and 1.54.
- SRC.A to SRC.H follow whatever the destination track’s machine puts on those knobs; the page names them by page and knob, so the author advises picking them with that track’s SRC page in front of you.
- A trig-mode source LFO moves only when its own track trigs.
- The matrix is kept in six bytes of each sound record that the firmware saves and loads but does not use itself; the author asks owners to check once, after a power cycle on a unit, that a pattern’s matrix came back.
- Not yet tested on a unit, its author reports; it passes their emulator tests on OS 1.53 and 1.54.

## Credits

- gdeo607 — Digi Matrix design and code (digi1_mods)

The author’s full documentation is kept in [upstream/REPOSITORY.md](upstream/REPOSITORY.md). Screenshots and a tutorial are still to come.
