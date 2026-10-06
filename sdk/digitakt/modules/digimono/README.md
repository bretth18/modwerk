# Digi Mono

Digi Mono adds seven synth machines to the FUNC+SRC list, after the Monomachine’s GND and SWAVE machines: MONO SIN, MONO NOISE, MONO SAW, MONO PULSE, MONO ENS, MONO VO and POLY SIN. They need no sample: the engine’s output takes the sample’s place in the voice, so the track’s filter, amp, LFOs, sends, p-locks and level work on it as on a sample. Knob A stays TUNE; B to H are the machine’s own parameters, named and shown in their units. The engine is a clean-room rewrite from the Monomachine manual, with no Monomachine code or data.

By gdeo607 (@gdeo607) · MIT · Digitakt OS 1.53, 1.54 · imported from [gdeo607/digi1_mods](https://github.com/gdeo607/digi1_mods/tree/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6) at 0.13b.

Modwerk metadata version: `0.13.0-experimental`.

## Where to find it

SRC machine list, after SLICE and any other mod’s machines.

1. Select an audio track, press FUNC + SRC and scroll past SLICE (and any other mod’s machines).
2. Choose MONO SIN, MONO NOISE, MONO SAW, MONO PULSE, MONO ENS, MONO VO or POLY SIN and press YES.
3. On the SRC page, knob A is TUNE and B to H are the machine’s own parameters; a knob the machine does not have is blank.
4. Play it from trigs, the track key, the keyboard (FUNC + TRK) or MIDI.

The machines:

- **MONO SIN**: a sine.
- **MONO NOISE**: noise, with sample and hold, darker (red) noise and pitched noise.
- **MONO SAW**: a band-limited saw, one to three detuned unison saws and two sub-oscillators.
- **MONO PULSE**: a band-limited pulse with PWM, detuned unison pulses and subs.
- **MONO ENS**: four oscillators at set intervals, saw to pulse, with a chorus.
- **MONO VO**: a formant voice, one vowel gliding to another, with consonants at the note’s start.
- **POLY SIN**: three sines at set notes, a chord on one track, with a pitch envelope. It has one filter and amp envelope for all three.

## Controls

Knobs B to H mean something different on each machine. Each shows its short name and its value in its units; the pop-up gives the long name.

| Control | What it does |
| --- | --- |
| Knob A | TUNE on every Digi Mono machine. With the note it sets the pitch; note locks, TUNE locks and pitch LFOs work. |
| Knob B | NOISE: ST (Sample Hold Rate), sample and hold, 0 = white, higher = fewer new values a second. SAW and PULSE: UNIL (Unison Level), the unison oscillators’ level. ENS: PCH2 (Pitch Osc 2), oscillator 2 in semitones from oscillator 1, -36..+36. VO: VOC1 (Vowel 1): OO, U, AW, AH, UH, AE, EH, IH, EE or ER. POLY SIN: NOT1 (Note 1), the first sine in semitones from the note, -36..+36. Blank on SIN. |
| Knob C | NOISE: RED (Red Noise), darker noise. SAW and PULSE: UNIW (Unison Detune), the unison detune, 0..50 cents. ENS: PCH3 (Pitch Osc 3), oscillator 3 in semitones. VO: VOC2 (Vowel 2), the vowel V-SW glides to. POLY SIN: NOT2 (Note 2), the second sine in semitones from the note. Blank on SIN. |
| Knob D | Does not open the sample list on these machines. PULSE: SUB2 (Sub 2 Oct Lev), the sub two octaves down. ENS: PW (Pulse Width), duty %, 0 = square. VO: VOIC (Breath), breath noise mixed into the source. POLY SIN: NOT3 (Note 3), the third sine in semitones from the note. Blank on SIN, NOISE and SAW. |
| Knob E | NOISE: STON (Tuned Noise), a sample and hold at twice the note’s pitch, which makes the noise pitched. SAW: UNIX (Unison Voices), 1 to 3 unison saws. PULSE: SUB1 (Sub 1 Oct Lev), the sub one octave down. ENS: PCH4 (Pitch Osc 4), oscillator 4 in semitones. VO: V-SW (Vowel Glide), the glide from VOC1 to VOC2, 5 ms..2 s; 0 keeps VOC1. POLY SIN: EDEP (Env Depth), the pitch envelope’s depth in semitones, + or -. Blank on SIN. |
| Knob F | SAW: SUBX (Sub Shape), the subs from square to saw, in %. PULSE: PW (Pulse Width), duty %. ENS: WAVE (Saw-Pulse), saw to pulse, in %. VO: CONS (Consonant): none, S, SH, F, H, T, K or P at the note’s start. POLY SIN: ESPD (Env Speed), the pitch envelope’s speed: + glides back to the notes, - glides away, OFF in the middle. Blank on SIN and NOISE. |
| Knob G | SAW: SUB1 (Sub 1 Oct Lev), the sub one octave down. PULSE: PWAD (PWM Depth), the pulse width modulation depth. ENS: CHRL (Chorus Level); it starts at 0, the chorus off. VO: CLEN (Cons. Length), the consonant’s length, 2..400 ms (T, K and P at most 30-40 ms). Blank on SIN, NOISE and POLY SIN. |
| Knob H | SAW: SUB2 (Sub 2 Oct Lev), the sub two octaves down. PULSE: PWRS (PWM Rate), 0.05..20 Hz. ENS: CHRW (Chorus Width). VO: CVOL (Cons. Level), the consonant’s level. Blank on SIN, NOISE and POLY SIN. The volume is the track’s LEVEL, AMP page and VOL, not this knob. |

The same knobs by machine, as the author lays them out (a dash is a blank knob):

| Machine | B | C | D | E | F | G | H |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MONO SIN | - | - | - | - | - | - | - |
| MONO NOISE | ST | RED | - | STON | - | - | - |
| MONO SAW | UNIL | UNIW | - | UNIX | SUBX | SUB1 | SUB2 |
| MONO PULSE | UNIL | UNIW | SUB2 | SUB1 | PW | PWAD | PWRS |
| MONO ENS | PCH2 | PCH3 | PW | PCH4 | WAVE | CHRL | CHRW |
| MONO VO | VOC1 | VOC2 | VOIC | V-SW | CONS | CLEN | CVOL |
| POLY SIN | NOT1 | NOT2 | NOT3 | EDEP | ESPD | - | - |

The FLTR, AMP and LFO pages, p-locks on these knobs, the sends and the track level work as usual. On the LFO page, DEST names the machine’s own knobs, for example MSAW:Unison Level.

## Compatibility

- Digi Mono requires DIGICHAIN (1.6 in the author’s build), which elekloader ticks with it, and core 2.1.
- Modwerk’s builder refuses it beside NEIGHBOR, DIGISLICER and SOPHIE: their patch sites overlap DIGICHAIN’s.
- elekloader’s check decides at build time which mods combine.

## Limitations

- Modwerk’s builder refuses Digi Mono beside NEIGHBOR, DIGISLICER and SOPHIE: elekloader finds that their patch sites overlap those of DIGICHAIN, which Digi Mono needs. The author pairs them through -chain builds of those mods, which are not the releases Modwerk carries.
- Built for Digitakt OS 1.53 and 1.54.
- On a unit the stock audio engine already uses about 80 % of each block, so keep to a few playing Digi Mono tracks. The author’s design notes give two to four at once as the safe range until it is measured on a unit; VO, ENS and PULSE cost the most.
- A project saved with Digi Mono machines loads them as ONESHOT on the stock OS, or on a build without Digi Mono.
- A POLY SIN sound saved with 0.13 or 0.13a reads its old NOT3 as EDEP and its EDEP as ESPD; set them again.
- The engine follows the Monomachine manual’s descriptions; it is not sample-exact to a Monomachine.
- Not yet tested on a unit, its author reports; it passes their emulator tests on OS 1.53 and 1.54.

## Credits

- gdeo607 (the digi1_mods authors) — Digi Mono’s clean-room synth engine and elekloader mod
- Machine and parameter names after the Monomachine manual; vowel formants from Peterson and Barney (1952)

The author’s full documentation is kept in [upstream/DESIGN.md](upstream/DESIGN.md) and [upstream/REPOSITORY.md](upstream/REPOSITORY.md). Screenshots and a tutorial are still to come.
