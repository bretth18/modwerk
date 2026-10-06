# Digi Poly

Digi Poly adds a POLY machine to the FUNC+SRC list. A POLY track plays like ONESHOT, but its TRIG page becomes the MIDI tracks’ page, so every trig can carry a chord: NOT1 plays on the track’s own voice and NOT2-NOT4 each borrow the voice of another track. A borrowed voice plays the POLY track’s whole sound, follows its knobs and level, and gets its own sound back at its own next trig. The track’s key plays the chord, notes on its own MIDI channel play polyphonically, and SETTINGS > POLY chooses, per pattern, which tracks lend their voice.

By gdeo607 (@gdeo607) · MIT · Digitakt OS 1.53, 1.54 · imported from [gdeo607/digi1_mods](https://github.com/gdeo607/digi1_mods/tree/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6) at version 2.0.

Modwerk metadata version: `2.0.0-experimental`.

## Where to find it

SRC machine list, after SLICE.

1. On any audio track press FUNC + SRC and choose POLY, after SLICE, with a three-note icon.
2. Set the chord on the track’s TRIG page: NOT1 and NOT2-NOT4.
3. Choose which tracks lend their voice in SETTINGS > POLY.

The track keeps its sample, filter, amp and LFO settings as with any machine; its SRC page is ONESHOT’s.

## Controls

The extra notes take a voice from another track: the one whose last note started longest ago, never a track taken out of the pool in SETTINGS > POLY, a muted track, a track with a trig at the same moment or a voice holding a live note.

| Control | What it does |
| --- | --- |
| NOT1 | On a POLY track’s TRIG page: the note, played on the track’s own voice. Set it for the track, or hold a trig in grid recording and turn the knob to lock a step’s own value. |
| NOT2-NOT4 | Extra notes as semitone offsets from NOT1; the centre value is off. Each plays on a voice borrowed from another track, and with no voice left the note is skipped. Set them for the track, or lock a step’s own chord. |
| VEL, LEN, PROB, LFO.T | The rest of the MIDI tracks’ TRIG page, which a POLY track shows in place of the audio one. Set them for the track, or lock them per step. |
| LEVEL | On a POLY track’s TRIG page the LEVEL knob sets the track level; the LEV fader beside NOT1 shows it, with the value for a moment after a turn. The track’s LEVEL and every SRC, FLTR, AMP and LFO knob apply to the whole chord, borrowed voices included, while they play its notes. |
| Trig key / FUNC+TRK keyboard | Pressing the POLY track’s key, its trig key or a key of the FUNC+TRK keyboard, plays the whole chord. Only the note you played is recorded; the chord’s other notes go straight to the audio engine and are not sent to MIDI OUT. |
| MIDI in on the track’s channel | Notes on the POLY track’s own MIDI channel play polyphonically, one voice per note: the track’s own voice if it is free, else a borrowed one, and the note-off releases that voice. With the sequencer recording, notes arriving at one step are written as a chord: the lowest in NOT1 and the next three in NOT2-NOT4 as offsets from it. A step that gets a single note plays a single note. No MIDI track or cable setup is needed. |
| LEFT / RIGHT (SETTINGS > POLY) | Choose a track; a bar marks it. The checkbox on the left is ticked while the chosen track is in the pool, and tracks in the pool are shown inverted. |
| YES (SETTINGS > POLY) | Take the chosen track out of the POLY voice pool, or put it back. The pool is part of the pattern’s kit: every pattern can lend different voices, and it is saved with the project and comes back after a power-off. Patterns that share a kit share it, loading a sound onto a track does not change it, and every track starts in the pool. |

Several tracks can be POLY; each plays its own chords. The author’s [docs/USAGE.md](https://github.com/gdeo607/digi1_mods/blob/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6/docs/USAGE.md) describes the controls in full.

## Compatibility

- Requires DIGICHAIN (`digichain`) and core 2.1. elekloader ticks DIGICHAIN with Digi Poly.
- The builder refuses it beside NEIGHBOR, DIGISLICER and SOPHIE: elekloader refuses these together because their patch sites overlap.
- Built for OS 1.53 and 1.54.
- elekloader’s check decides at build time whether a selection of mods combines.

## Limitations

- elekloader refuses it in one build with NEIGHBOR, DIGISLICER or SOPHIE, because their patch sites overlap.
- Built for OS 1.53 and 1.54.
- Each extra note borrows another track’s voice: it cuts what that track was playing, and that track’s own next trig cuts the chord note. With no voice left, the extra note is skipped.
- POLY is machine 6 since 2.0 (it was 4): a POLY track saved with 1.0f loads as NEIGHBOR or ONESHOT, so choose POLY on it again.
- On the stock OS, kits saved with POLY load as ONESHOT. Before reverting, the author advises setting POLY tracks back to ONESHOT and saving again, or restoring a backup.
- A lost MIDI note-off leaves a borrowed voice held, and that track’s sequencer trigs are blocked while it is; send the note-off or stop the notes from the sender.
- The voice pool is kept in bytes of each sound record that the firmware saves but does not use. The author asks you to back up projects before flashing and to check once, after a power cycle, that a pattern’s pool came back.
- The POLY track’s TRIG page is the MIDI tracks’ page shown for an audio track; the author notes that an untested edit path could behave differently from a MIDI track.
- The author’s mod also declares a conflict with dt8poly, their earlier POLY mod, which is not in Modwerk.
- Not yet tested on a unit, the author reports; it passes their emulator tests on OS 1.53 and 1.54.

## Credits

- gdeo607 — Digi Poly, the POLY machine of digi1_mods

The author’s full documentation is kept in [upstream/REPOSITORY.md](upstream/REPOSITORY.md). Screenshots and a tutorial are still to come.
