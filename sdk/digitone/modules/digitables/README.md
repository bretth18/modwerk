# digitables

M8-style pitch tables for the Digitone mk1. The project holds 16 tables of up to 16 semitone steps, each with a length and a loop point. A sound with a table on plays every note through it: each note restarts the table and the sequencer’s clock steps it, from a slow walk to 1500 steps a second, so one trig plays an arpeggio, a trill, a pitch drop or a riff. A step can ADD a note instead of moving the pitch, so one trig can strum a chord. The TBL page has two knobs, TBL and SPD; hold a track key there for the table editor.

By irpina (@irpina) · GPL-2.0-or-later · Digitone OS 1.43 · imported from [irpina/digitables](https://github.com/irpina/digitables/tree/5bbd9adffbd0f2d97fa0553613c507b43fca3bda) at v1.3.

Modwerk metadata version: `1.3.0-experimental`.

## Where to find it

The TBL page: AMP’s third page, or TABLES in the Mod Menu.

1. Hold a track key (T1–T4) on its own for about half a second to open the Mod Menu, and pick TABLES with YES (or trig key 1).
2. Or press AMP until its third page, TBL, shows.
3. On the TBL page, hold a track key to open the table editor; NO, or holding a track key again, goes back to the TBL page.

## Controls

On the TBL page:

| Control | What it does |
| --- | --- |
| A: TBL | The sound’s table: OFF, or 1–16. A sound parameter: saved with the kit, shown and edited like the stock ones, and p-lockable per trig (hold a trig in grid recording and turn the knob). |
| B: SPD | The table’s speed: ticks of the 24 PPQN clock a step, 1–24 (6 is a 16th, 24 a quarter note), and faster to the left of 1: a step every 1/2, 1/3, 1/4, 1/6, 1/8, 1/12, 1/16, 1/24 or 1/32 of a tick, and MAX, a step every audio block (1500 a second, at any tempo). At 120 BPM, 1 is 48 steps a second and 1/16 is 768. P-lockable; turning it while a note plays changes its speed from the next step. |
| TABLES (Mod Menu) | Opens the TBL page. Hold a track key (T1–T4) on its own for about half a second for the Mod Menu, then pick TABLES with YES or trig key 1. |
| Hold a track key (TBL page) | Opens the table editor on the table the track’s sound plays. The editor shows the table’s 16 steps as bars around a zero line; a marker under a step follows a note playing that table. PLAY, STOP, FUNC and the track keys still work while it is open. |

In the table editor:

| Control | What it does |
| --- | --- |
| Editor: trig keys 1–16, LEFT/RIGHT | Pick a step. |
| Editor: A, UP/DOWN | The step’s offset, -48 to +48 semitones; FUNC + UP/DOWN moves it an octave. Edits sound at once, even on a note already playing. |
| Editor: B | The step. |
| Editor: C | The table’s length, 1–16. |
| Editor: D | The loop point: OFF (the last step holds), or 1 up to the length. |
| Editor: H | Which table, 1–16. |
| Editor: YES | The step adds a note (ADD), or not; an ADD step is drawn hollow. When the table reaches an ADD step, the note keeps its pitch and a copy of the trig’s note (its sound, p-locks, velocity and length) starts at the note’s pitch plus the step’s offset, released together with the note that added it. Step 1 always sets the note’s own pitch; marked ADD, it adds a note only when a loop comes back to it. |
| Editor: NO, or hold a track key | Back to the TBL page. |
| Editor: a page key | TRIG, SYN1, SYN2, FLTR, AMP or LFO: leaves the editor for that page. |

A note starts at step 1, its own pitch plus step 1’s offset, and moves on one step at the SPD speed up to the length, then from the loop point to the length over and over, or holds the last step when the loop is OFF. The clock runs at the tempo whether the sequencer plays or not, so notes played live from the trig keys step the same way. Table 1 starts as an arpeggio (0, +12, +7, +3); the others start empty.

The tables are part of the project: SAVE PROJECT and SAVE PROJECT AS save them, LOAD PROJECT loads them, and a new project starts with the defaults. They live in 480 bytes of the project file that the Digitone OS leaves alone, so a project saved with digitables loads on the stock OS, which ignores them and keeps them through a save.

## Compatibility

digitables needs the Digitone core 2.2 (core-dn1 2.2) for its parameter slots, mod page, project data and Mod Menu entry; it requires no other mod. The builder refuses no mod beside it. elekloader’s check decides at build time, and in that check it combines with every other Modwerk mod for Digitone OS 1.43.

## Limitations

- The builder refuses no mod beside it: in elekloader’s check it combines with every other Modwerk mod for Digitone OS 1.43. The author checked that it links with digihealth 1.1, but has not run the two together.
- It needs the Digitone core 2.2 (core-dn1 2.2) for its parameter slots, mod page, project data and Mod Menu entry; core 2.2 is then the one every Digitone OS 1.43 build uses.
- Built for Digitone OS 1.43 only; the author has not ported it to OS 1.44. The Digitone Keys runs the same OS file but has not been tried.
- The tables restored at power-up are unchecked: the Digitone keeps a working copy of the project for power-up, which the author’s emulator cannot show.
- The arpeggiator and portamento have not been tried with tables. On a note the arpeggiator plays, ADD steps add nothing.
- ADD steps use voices: the Digitone has 8, shared by the four tracks, and an added note takes one like any note, stealing the oldest when none is free. A loop over ADD steps adds notes over and over. An added note is skipped when the firmware’s note pool is short.
- The author reports testing v1.3 on a Digitone mk1 (3–4 October 2026): the TBL page, the table editor, the fast speeds, the Mod Menu and ADD steps. Not yet checked: the tables restored at power-up, and the arpeggiator with tables. That report is for the author’s own build.
- SPD MAX steps once every audio block, 1500 times a second at any tempo: the one setting that does not follow the sequencer's tempo, by design. Every other SPD value counts ticks of the 24 PPQN clock.

## Credits

- irpina — digitables design and code

The author’s full documentation is kept in [upstream/README.md](upstream/README.md). Screenshots and a tutorial are still to come.
