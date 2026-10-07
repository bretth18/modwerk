# Recorder Loop Fix

## Overview

Fix recorder-buffer voice reprime, counter resets, alternating recording lengths and sound-on-sound zero samples at the loop boundary.

Source-only draft, version `0.1.0-experimental`. It is not offered by the configurator while shared-builder integration and release qualification remain incomplete.

## Controls

There are no new controls. Use the stock Flex recorder-buffer assignment, recorder RLEN, SRC3 and recording/playback trigs. Fixed lengths, reverse playback, crossfade, stop/restart and recorder-memory reallocation are separate test cases.

## Usage

The fix runs automatically on recorder-buffer playback. At 128 BPM, a 16-step bar spans 82,687.5 samples at 44.1 kHz, so successive recording arms alternate between 82,687 and 82,688 samples. The patch retains a running voice, preserves the same-sample counter, attempts to match each recording length to the next arm and repeats the last valid sample instead of reading zero at END.

### Quick tutorial: compare a self-recording loop

1. Use a disposable project and assign a Flex track to its own recorder buffer.
2. Set RLEN to 16 at 128 BPM and place recording and playback trigs at the start of the bar; for sound-on-sound set SRC3 to that track.
3. Record a sustained tone and listen across successive wraps, then repeat after stopping and restarting transport.
4. Compare with stock using the same project, tempo and sample. A fractional-sample loop can still repeat or skip one sample at a wrap.

## Compatibility and limitations

**Measured limitation:** The native spacing algorithm can choose a loop length one sample off after several minutes at short RLEN values: 953/13,279 ideal consecutive-arm cases failed. At 197 BPM and RLEN 1, the first tested failure was five minutes. RLEN 16 had no failures in the tested integer-BPM sweep through four hours; arbitrary fractional tempo or arm histories are not qualified.

OS 1.40C only, MKI and MKII source support; current Modwerk hardware testing is pending.

- Automatic when included in a qualified image; there is no menu, knob or effect slot. Remove the module when building to restore stock behavior.
- Applies to Flex playback of recorder buffers, including sound-on-sound. Ordinary sample playback fallback paths are retained.
- Uses the stock tempo, arm sample and recorder length. It does not run a separate clock.
- At fractional bar lengths, a wrap can still repeat or skip one sample; this does not guarantee a perfectly seamless loop at every tempo.
- Eight hook sites and eleven pool-base literals must participate in the common builder allocation ledger; catalog publication and native/browser composition remain pending.

## Tests and measurements

Source identity, actual native-code probes, instruction counts, conservative core-cycle bounds and stack peaks are recorded in [TESTING.md](TESTING.md). Stock callbacks and chip wall-clock behavior are explicit exclusions. The qualification template contains pending fields and does not qualify this release.

## Authorship and licences

Sam Banks: all eight recorder patches, source oracles and octabam declaration. Original MIT notices are retained in [LICENSE](LICENSE). See `../../imports/recorder-loop-fix-6f9e5bc.json` for exact repository pins and per-file transformations. Original Modwerk probes use GPL-3.0-or-later; authored source is unchanged. No stock firmware, extracted tables/routines, compiled image or card is distributed here.

## Screens and audio

Actual native LCD captures were reviewed in monochrome. Their image, emulator, panel plan and PNG hashes are recorded in [media/capture.json](media/capture.json). These use a locally composed standalone image and a DSP host stub; they do not establish audio continuity, a valid loaded project, common-builder parity or physical hardware behavior.

![SRC SETUP: FLEX highlighted](media/ot-flex-setup.png)
![RECORDING 1 SETUP 1: RLEN 16 and SRC3 T1](media/ot-recorder-setup.png)
