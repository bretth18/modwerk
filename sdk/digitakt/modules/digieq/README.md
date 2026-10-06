# Digi EQ

Digi EQ is a 4-band EQ on the master mix, before the render hands it to the analog outputs and to the USB stream, so main outs, headphones and USB audio all carry it, as they do the compressor. It is a master page (FUNC + LFO) between Compressor and Internal Mixer: knobs A-D set the bands’ levels and E-H their frequencies, and a press switches a knob to its band’s Q or type. The response curve is drawn above the knobs. The settings live in the pattern’s kit, so every pattern has its own EQ, saved with the project and kept over a power-off. SETTINGS > GLOBAL FX/MIX > MASTER EQ makes the EQ you can hear override every pattern’s own.

By gdeo607 (@gdeo607) · MIT · Digitakt OS 1.53, 1.54 · imported from [gdeo607/digi1_mods](https://github.com/gdeo607/digi1_mods/tree/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6) (`mods/digieq`) at 1.0b.

Modwerk metadata version: `1.0.0-experimental`.

## Where to find it

Master pages (FUNC + LFO): Master EQ (2/4), between Compressor and Internal Mixer.

1. Press FUNC + LFO for the master pages; FUNC + LFO steps through Compressor (1/4), Master EQ (2/4), Internal Mixer (3/4) and External Mixer (4/4).
2. Turn knobs A-D for the bands’ levels and E-H for their frequencies; bands 1-4 are the columns A/E, B/F, C/G and D/H.
3. Press a knob to switch it to its band’s Q (A-D) or type (E-H); press it again to go back.
4. For one EQ on every pattern, turn on SETTINGS > GLOBAL FX/MIX > MASTER EQ.

The graph shows the EQ’s response (0 dB dotted, ±12 dB at the top and bottom), the band points 1-4 with the band last touched filled, and ticks at 100 Hz, 1 kHz and 10 kHz. The knob turned last is underlined. The LEVEL knob works as on every page.

## Controls

| Control | What it does |
| --- | --- |
| Knobs A-D | Band 1-4 level, -12 to +12 dB in 0.5 dB steps (band 1 on A, band 4 on D); every band starts at 0 dB. For BELL and the shelves it is the boost or cut; for HP, LP, BP and NTCH it is that band’s output level, and the band is always on. Press the knob for the band’s Q. |
| Knobs A-D, pressed | Band 1-4 Q, 0.3 to 8 in 16 steps; for HP, LP, BP and NTCH it is the resonance. A switched knob is shown inverted. Press the knob again to go back to the level. |
| Knobs E-H | Band 1-4 frequency, 20 Hz to 20 kHz in 128 steps, about a semitone a notch (band 1 on E, band 4 on H). Defaults: band 1 78 Hz, band 2 398 Hz, band 3 2.5 kHz, band 4 9.9 kHz. Press the knob for the band’s type. |
| Knobs E-H, pressed | Band 1-4 type: HP, LSHF (low shelf), BELL, NTCH (notch), BP (band pass), HSHF (high shelf) or LP. HP, LP, BP and NTCH are 12 dB/octave. Defaults: band 1 low shelf, bands 2 and 3 bell, band 4 high shelf. Press the knob again to go back to the frequency. |
| MASTER EQ | SETTINGS > GLOBAL FX/MIX > MASTER EQ, beside the firmware’s own entries. On: the EQ you can hear overrides every pattern’s own, and each pattern you reach is given these settings, so save the project if you want them kept. Off: every pattern goes back to its own saved EQ. |

The controls are described in the author’s [docs/USAGE.md](https://github.com/gdeo607/digi1_mods/blob/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6/docs/USAGE.md). The EQ is off until a band is changed. A pattern whose kit was made before Digi EQ starts flat. Loading a sound onto a track does not change the EQ; loading a project brings back each pattern’s own EQ at once.

## Compatibility

Digi EQ requires no other mod; it needs core 2.1, which the builder brings. The builder refuses no pairing: in elekloader’s check Digi EQ combines with every other Modwerk mod for its OS, NEIGHBOR, DIGISLICER and SOPHIE among them. elekloader’s check decides at build time.

## Limitations

- The builder refuses no pairing: in elekloader’s check Digi EQ combines with every other Modwerk mod for its OS, NEIGHBOR, DIGISLICER and SOPHIE among them.
- Built for OS 1.53 and 1.54.
- Four active bands cost about 5 % of the audio time, by the author’s estimate; in a very busy project that could push the audio over its budget and cause clicks. Bell and shelf bands at 0 dB cost nothing; HP, LP, BP and NTCH bands are always on.
- Boosts can clip the main output, which is limited to full scale.
- The settings are kept in bytes of the first four tracks’ sound records that the firmware saves and loads but does not use itself. If the firmware used them somewhere the author’s emulator tests did not reach, a setting could be lost or a sound could change.
- With MASTER EQ on, every pattern the unit reaches is given the current EQ settings, which changes those patterns’ kits; the change becomes permanent only when you save the project.
- The page is an extra entry in the firmware’s master view (its unused “None” page, renamed); the author notes that an untested path of that view could treat it differently.
- Its author reports Digi EQ 1.0b is not yet tested on a unit; it passes their emulator tests on OS 1.53 and 1.54.

## Credits

- gdeo607 (@gdeo607) — Digi EQ design and code, part of [digi1_mods](https://github.com/gdeo607/digi1_mods)

The author’s full documentation is kept in [upstream/REPOSITORY.md](upstream/REPOSITORY.md). Screenshots and a tutorial are still to come.
