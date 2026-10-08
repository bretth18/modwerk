# Analog BD — TDEP / SAT modulation fix

Pending `0.1.3-experimental` update to the approved `0.1.2-experimental` machine.
This source overlay is outside native discovery and the public catalog. It is
not a flashable release. The approved sources, packages and screenshots remain
unchanged until firmware qualification and owner review are complete.

## Overview

The owner reported audible zipping when modulating TDEP and SAT. The approved
DSP replaces their coefficients once per 16-sample block. TDEP also changes a
128-bin thump lookup. These abrupt changes can add steps to the sounding voice.

The candidate slews the 909's pitch excursion and thump level every sample.
Both engines slew a fractional SAT position, then interpolate the drive,
makeup and coupling tables at that position. All three follow the same control
curve, avoiding the gain overshoot of independent coefficient slews. Each slew
uses 1/64 of the remaining difference per sample: approximately 1.44 ms time
constant at 44.1 kHz, or 6.6 ms to cover 99% of a full step. First use seeds the
current patch directly. Retriggers retain smoothing history.

The 808 and 909 share their existing desk decode/render routines in a combined
image. Output gain stays at each engine's output. The candidate occupies 946
of the 1,028 available P words on each core, including glue. Constant-patch
renders in the tested cases remain bit-identical to the approved engines.

## Controls

All ranges are 0–127. Assignment defaults and stored control bytes are unchanged.

| Control | Assignment default | Behavior |
| --- | --- | --- |
| PITCH | 64 | Body pitch; 909 spans approximately 30–100 Hz. |
| DECAY | 80 | Body decay, with the original response for each model. |
| TONE / TUNE | 80 | 808 transient tone / 909 pitch-envelope duration. |
| ATK | 64 | Original transient strength and shape. |
| SWEEP / TDEP | 64 | Original 808 sweep; 909 excursion and associated thump now slew. |
| SAT | 0 | Original desk drive curve, now interpolated along a smoothed position. |
| ACCNT | 64 | Accent in SRC SETUP. |
| LPF | 127 | OFF at 0, ORIG at 64, 18 kHz at the assignment default. |
| LOW / HIGH | 64 / 64 | Original desk bands; 64 is neutral. |

The former MODEL knob and final SRC SETUP encoder stay inactive. Choose 808 or
909 in the engine browser. AMP and both FX pages retain their original behavior.
There is no extra smoothing control or stored parameter.

## Usage — smooth a long 909 tail

1. In a disposable project, select the track, hold FUNC and press SRC for SRC
   SETUP, choose ANALOG BD and press YES. Double-tap its TRACK key, choose 909
   with UP/DOWN or LEVEL and confirm with YES. Set LOW and HIGH to 64.
2. Press SRC to edit the main page. Set DECAY around 100, then trigger a hit
   and turn E (TDEP) and F (SAT) through the ranges that reproduced the report.
   Repeat with the existing modulation assignment. The candidate should reduce
   control steps while retaining the original endpoints and saturation character.
3. Set modulation depth to zero, return SAT to 0 and TDEP to 64, then press
   STOP and let the tail finish. Select 808 in the same browser to compare SAT;
   its knob values are retained when switching engines.

This is a hardware acceptance procedure, not a claim that the candidate has
been auditioned on a device. Preserve a separate project copy for stock firmware.

## Compatibility and limitations

The target remains Octatrack 1.40C with the existing Analog BD registration and
SPRING REV reservation. SYNTH, MACHINEDRUM and POLY registration conflicts are
unchanged. The existing stock-firmware project-clamping limitation still applies.
The fix adds DSP instructions per sample; the previous FX/load acceptance cannot
be carried forward. Eight-voice maximum FX load remains unqualified.

## Tests and measurements

[TESTING.md](TESTING.md) distinguishes native DSP evidence from firmware and
hardware acceptance. Run the overlay identity check with `python3 apply.py
--verify`; it reads files and does not execute the module. The native runner
must run in the documented isolated container, using a new private output folder.

The focused checks cover constant audio, full-range steps in both directions,
rapid retriggers, stepped automation, the assembled code at both core placements,
and four simultaneous mixed voices per placement with distinct patches and reset
isolation. They do not prove stock AMP/FX timing or physical reboot survival. The separate
firmware control-state matrix passed. The full-emulator SIGBUS was traced to
Docker's 64 MiB shared-memory default and resolved with `--shm-size 256m`; the
unchanged candidate boots both cores and loads its project. Full-chain usable
audio after reload/restart remains unverified; see the bounded audio probes in
the testing report.

## Authorship and licences

Original 808/909 engines and integration: repeat98 (Jannik Aßfalg). Composition
infrastructure: Sam Banks. The approved import remains pinned to
`sambanks/octabam` commit `363861e31ee963c478fab2b190a0fabe1d7ce37b`;
[draft.json](draft.json) binds all base and candidate inputs. Original MIT notices
are retained in [LICENSE](LICENSE). The new smoothing and qualification changes
are supplied under the same MIT licence. No firmware or private project is included.

## Screens and audio

These are actual candidate LCD pixels from the MKII controller emulator with a
stand-in DSP and stopped transport. [Capture provenance](media/capture.json) binds
them to the exact candidate source/image and records the DSP limitation. Physical
audio audition remains pending; no listening pass is inferred from these images.

Hold FUNC and press SRC to open SRC SETUP. ANALOG BD is selected; LOW and HIGH
are the shared desk bands. Set both to 64 for the neutral starting point.

![ANALOG BD selected on SRC SETUP with ACCNT, LPF, LOW and HIGH controls.](media/ot-setup.png)

Double-tap the assigned TRACK key to open the engine browser. Choose 909 with
UP/DOWN or LEVEL and press YES; NO closes it without changing the engine.

![Analog BD engine browser with 909 highlighted below 808.](media/ot-engines.png)

Press SRC for the 909 controls. E changes TDEP and F changes SAT; use the long-tail
example above, then remove modulation and return SAT to 0/TDEP to 64 before STOP.

![909 SRC main controls with PITCH, DECAY, TUNE, ATK, TDEP and SAT.](media/ot-909.png)

Choose 808 in the same browser to compare the shared SAT stage. The source page
now shows TONE and SWEEP. Model selection retains the control bytes.

![808 SRC main controls with PITCH, DECAY, TONE, ATK, SWEEP and SAT.](media/ot-808.png)
