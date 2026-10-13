# Analog BD — 909 reference candidate

The reference-development record for `0.1.4-experimental` based on the three 70 BPM TR-909 recordings supplied by the owner. Thanks to **Skee Mask**, who kindly recorded his TR-909 so we could match Analog BD more closely. His recording-context report identifies a decay-modified instrument, with decay a little above halfway.

This overlay changes the 909 body, Attack and Tune response. Its three DSP/fit files are now copied byte-for-byte into the public 0.1.4 release folder; this development folder itself stays outside module discovery. The current private image is `AB014REF05`. It refits the pulse for the owner-confirmed **direct-out reference with LPF bypass** and reduces excessive strength variation. The body and Tune model remain unchanged from AB014REF04. Neighboring transient shapes are still more consistent than those in the recording, so faithful hit-to-hit reproduction is not established. The owner accepted the actual AB014REF05 emulator comparison and authorized release with fresh physical hardware/persistence, worst-case chip timing and complete memory bounds explicitly waived. Physical results remain untested. [Audition history](evidence/audition.json) preserves earlier feedback and its withdrawal.

## Sound changes

- Fit both harmonic magnitude and phase/asymmetry, correcting the body waveform rather than its spectrum alone. Refit the complete hit's gain, envelope droop and DC/coupling response.
- Fit low and high Attack together, at LPF bypass. Both the fast onset and longer resonant discharge now follow Attack, retaining a small minimum pulse.
- Correct both Tune endpoints, including the small measured settled-pitch shift. The final recorded hits identify the high endpoint; the recordings are not treated as evenly spaced knob positions. Intermediate control response remains a monotone design interpolation.
- Vary pulse strength from 0.92 to 1.0 using the existing free-running noise state, with the existing shaped noise burst. This is an approximation: endpoint knob motion is a confounder, and normalized transient-shape spread remains too small. Trigger timing and pitch receive no random variation.

The 808 engine, saved controls, ColdFire integration, shared desk and 0.1.3 TDEP/SAT smoothing remain unchanged. The voice allocation is still 64 words. Combined DSP code uses 997 P words/core; the matched 909 instruction increase is 6.22% on average and at most 6.27% in the tested blocks. The 808 instruction counts and tested audio are unchanged. These are executed instructions, not hardware timing.

## Files and evidence

`draft.json` pins the approved inputs and current candidate sources. `apply.py` verifies them or stages a disposable SDK copy. `run.py` assembles and checks native rendering. `calibrate.py` reproduces complex harmonic measurements and the initial differential pulse fit; `compare.py` checks complete native hits. The qualification tools check all 128 control values, matched cost, interleaved voices and actual complete-firmware source/stock AMP output on both DSP cores.

[TESTING.md](TESTING.md) records results, reproduction and missing qualification. [CHANGELOG.md](CHANGELOG.md) preserves version-matched notes, including Skee Mask's credit. Only sanitized numerical evidence belongs in `evidence/`; recordings, rendered audio, compiled DSP, raw traces and firmware remain private.

## Audition and promotion

The native 70 BPM preview uses PITCH 49, DECAY 100, TDEP 64, SAT 0, ACCNT 72, LPF 0 (bypass) and LOW/HIGH 64. Its first 13 hits change Attack with Tune fixed at 0; its last five change Tune with Attack fixed at 64. Do not present the bundled clip as a single sweep.

Separate listening clips use actual firmware-emulator track output: two original reference hits, a short pause, then two emulator hits. Conditions are TUNE/ATK 0/0, 0/127 and 127/0. One common tail-RMS gain follows fixed stock AMP compensation; no independent peak normalization is used. The Tune maximum clip uses the final two recorded Tune hits.

The original AB014REF04 comparison patch used LPF 48 (~3.4 kHz). The machine assignment default remains 127 (18 kHz); 0 bypasses LPF. The owner confirms the reference was recorded from the 909 direct out, without its main-out LPF. Bypass is therefore the current reference condition. [LPF evidence](evidence/lpf.json) preserves the historical filter investigation and corrects an analysis window that cut partway into the recorded attack. [Direct-out fit](evidence/direct-out-fit.json) and [neighbor measurements](evidence/neighbors.json) document the current pulse adjustment and its remaining limits. This follow-up adds no DSP instructions or memory.

The new exact-source exception is [the 0.1.4 owner approval](../../analog-bassdrum-build-approval.json). It does not turn missing physical results into passes. The public [testing record](../../octabam/modules/analog-bassdrum/TESTING.md) records promotion and release checks. For reproducing the original native gates, use commit `d96ae7f` with its approved 0.1.3 SDK snapshot: `apply.py` deliberately pins that base, which has since been replaced in the public module folder.

## Authorship and licence

Retains Sam Banks's original module and Maxolydian's tooling credits and their MIT terms in [LICENSE](LICENSE). Shared desk design retains the approved airwindows MackEQ reference and licensing. Skee Mask is credited for the private reference recordings; those recordings are not distributed here or covered by the source-code licence.
