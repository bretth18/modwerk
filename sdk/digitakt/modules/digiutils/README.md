# Digi utilities

Digi utilities opens a live utility page over the main screen when you hold the "..." key. Pressing "..." on the page steps through a waveform scope, a spectrum analyser (30 Hz to 20 kHz) and a stereo X-Y view, then closes it. The waveform and spectrum views also show a tuner and activity boxes for all 8 audio tracks. The top bar, mutes, pattern and bank changes, page keys and knobs keep working while the page is open, so you can change a sound and watch it change. A short press of "..." is still the stock Song mode popup. The master EQ that earlier versions carried is now its own mod, Digi EQ.

By gdeo607 (@gdeo607) · MIT · Digitakt OS 1.53, 1.54 · imported from [gdeo607/digi1_mods](https://github.com/gdeo607/digi1_mods/tree/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6) at 1.9a.

Modwerk metadata version: `1.9.0-experimental`.

## Where to find it

A utility page over the main screen, opened by holding the "..." key.

1. Hold the "..." (three dots) key for about half a second; a short press is still the SONG MODE popup.
2. Press "..." again to go from the waveform to the spectrum and to X-Y; the next press closes the page.
3. Press YES for fullscreen; NO closes the page.

## Controls

| Control | What it does |
| --- | --- |
| Hold "..." | Holding the "..." (three dots) key, without FUNC, for about half a second opens the utility page on the waveform view. A short press is the stock SONG MODE popup, so Song mode works as on the official OS (popup, EDIT, double press). |
| "..." on the page | Steps from the waveform to the spectrum, then to X-Y; the next press closes the page. |
| YES | Fullscreen on and off: the main view only, with no overlays; the top bar is hidden. |
| NO | Closes the page. |
| PTN / BANK + trig | Changes pattern; the page stays open and the green LEDs show the patterns with data. |
| Knobs | Edit the parameters of the page selected underneath (TRIG, SRC, FLTR, AMP or LFO) while the utility page covers it, so you can change a sound and watch it; close the page to read the values. |
| Mutes, page keys, PLAY/STOP, FUNC | Mutes, page keys, PLAY/STOP and FUNC combinations work as on the main screen while the page is open. |

## Compatibility

Digi utilities needs only core 2.1, which Modwerk’s builder brings; it requires no other mod. The builder refuses it beside no other mod: in elekloader’s check it combines with every other Modwerk mod for its OS, NEIGHBOR, DIGISLICER and SOPHIE included (SOPHIE is built for OS 1.53 only). With Digi Poly in the same build, a track’s box stays filled while a POLY note is held on its voice, and a small line above a box marks a POLY track. elekloader’s check decides at build time.

## Limitations

- Modwerk’s builder refuses no mod beside it: in elekloader’s check it combines with every other Modwerk mod for its OS, NEIGHBOR, DIGISLICER and SOPHIE included (SOPHIE is built for OS 1.53 only).
- Built for OS 1.53 and 1.54.
- The tuner hears the main output, so solo a track to tune it; it shows -- when there is no clear pitch or the sound is too quiet.
- With the page open, the knobs edit the page hidden behind it; close the page to read the values.
- The spectrum (6 KB) and the tuner (1 KB) each take a buffer from the firmware’s memory once; if that fails, the spectrum stays blank or the tuner is disabled. Both run in the UI task, so the screen may feel slightly slower with the page open.
- The page is built from the firmware’s Song edit screen. The author notes that a firmware path treating it as the real Song edit screen could act on it; the Song edit screen opened from the popup stays stock (checked in emulation).
- Its author reports the stand-alone 1.5d tested on a Digitakt mk1, and 1.9a not yet; it passes their emulator tests on OS 1.53 and 1.54.

## Credits

- gdeo607 — Digi utilities design and code: scope, spectrum, X-Y view, tuner and track activity

The author’s full documentation is kept in [upstream/REPOSITORY.md](upstream/REPOSITORY.md). Screenshots and a tutorial are still to come.
