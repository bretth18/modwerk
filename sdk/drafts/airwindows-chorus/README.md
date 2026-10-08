# Air Chorus

Air Chorus is an Octatrack FX2 port of **Chris Johnson's Airwindows Chorus**,
licensed under MIT. Chris wrote the original algorithm; Jannik Assfalg
(`repeat98`) maintains this DSP56300 port. The original source and licence are
retained under `upstream/`, pinned to Airwindows commit
`e718c9bcfcdd736deeddb08bffe6bce2aa8e0eea`.

Version: **0.1.0-experimental**. This is a development candidate outside the
public catalogue while integration is completed. The owner reports a successful
50-minute MKII test with several instances and full knob sweeps on the first
image, and explicitly waived fresh hardware testing of the initialization update.
Unreported persistence, modulation and eight-track hardware checks remain open.
See [TESTING.md](TESTING.md) and [the hardware report](evidence/hardware-report.md).

## Overview

Stereo sine-modulated delay with Airwindows' alternating even/odd high-frequency
“air” compensation and three-point interpolated read. Both channels share the
original LFO phase but keep independent delay and filter states. A mono input
therefore remains mono; this is not a stereo-width generator. MIX also changes
modulation depth and air compensation, as in the source.

The chorus LFO advances from the instrument's 44.1 kHz audio samples. It is
free-running, matching the original effect; it is not a sequencer clock or
musical subdivision. Step locks, scenes and the Octatrack's own LFOs provide
control targets through the existing dispatcher. The port creates no rhythm
scheduler and does not override the instrument's tempo, track speed or swing.

## Controls

| Encoder | Control | Range / default | Behavior |
| --- | --- | --- | --- |
| A | SPD (Speed) | 0–127 / 64 | Fourth-power speed curve, 0–7.019 Hz; 64 ≈ 0.439 Hz. Zero freezes the internal phase. |
| B | RNG (Range) | 0–127 / 64 | Fourth-power centre-delay curve, 0–92.513 ms; 64 ≈ 5.782 ms. At fully wet, the sweep spans zero to twice this delay. |
| F | MIX | 0–127 / 0 | Dry/wet balance plus original depth/air interaction. Zero settles to bit-exact dry; 127 is wet only. Try 64 for the original plugin's mix default. |

Other encoders and the second effect page are unused. Endpoint 127 maps to
1.0; other bytes map to value/128, so 64 is exactly the original 0.5.

All three controls slew **per sample in 48-bit state**. SPEED uses one
23.2 ms pole. RANGE and MIX use two cascaded 23.2 ms poles, reaching about
95% of a step in 110 ms. A large change starts with almost zero velocity,
avoiding a first-sample jump across several delay taps. There is no block-end
snap, including trig-split calls. Audible pitch movement while the delay
changes remains part of the effect. Extreme pitch modulation can alias.

## Usage

Air Chorus appears in the audio-track FX2 chooser. Its dry default is safe;
raise MIX to hear the effect.

## Tutorial: a slow chorus

1. On a disposable audio project, select a Flex or Static track playing a
   sustained sound. Hold FUNC and press FX2, use UP/DOWN to highlight **Air Chorus**, and
   press YES to assign it. This is an FX2 effect; it is not offered in FX1.
2. Press FX2 for the controls. Set SPD 64 and RNG 64 with encoders A/B.
   Raise MIX with encoder F from its dry default to 64. Expect a slow,
   short-delay chorus; sweep MIX and RANGE to listen for control crackle.
3. Return MIX to 0 to hear the dry sound after the short smoothing tail.
   To remove the effect entirely, select NONE in FX2 SETUP. Stop transport
   before changing or saving the private test configuration.

## Screens and audio

![Air Chorus highlighted in FX2 SETUP](media/ot-location.png)

Confirm with YES, then press FX2. SPD is encoder A, RNG is B, MIX is F.

![Air Chorus at SPD 64, RNG 64, MIX 64](media/ot-example.png)

Set MIX 0 for dry after its smoothing tail, or select NONE to remove the effect.
These stopped emulator screenshots document the controls. The user reports
a successful 50-minute test with several distinct instances and full knob
sweeps on the earlier image. The initialization update has a current-image
hardware waiver; its software renders match the tested version.

## Compatibility and limitations

- Development target: original Octatrack OS 1.40C, MKI/MKII architecture;
  a 50-minute MKII functional test was reported for the earlier image.
  Fresh hardware testing of the initialization update is explicitly owner-waived. Use only the exact private image
  identified in the test report for qualification.
- Each FX2 instance owns its stock 16,384-word Y buffer: two 8,192-word
  rings. Unwritten history returns zero without a synchronous buffer clear;
  after 8,192 samples each ring is fully valid. The greatest read age stays within the ring. Four instances per
  DSP core / eight audio tracks fit the allocator layout; maximum-load
  hardware deadlines have not been established.
- FX1 has only 3,072 buffer words. It is excluded from the chooser. A stale
  project that nevertheless dispatches this ID in FX1 passes dry and does
  not clear or write an FX2-sized buffer.
- Bus engines which claim fixed/shared FX2 memory need composition rejection;
  their coexistence has not been qualified. Other module combinations and
  loader persistence remain pending. The compact private test image retains stock FX1; FX2 offers NONE and Air Chorus only. Existing project FX2 IDs may fall back to NONE. Use a disposable project.
- This is a fixed-point adaptation, not a bit-identical floating-point copy.
  It uses a 1,025-point interpolated quarter-sine table, 48-bit air/filter
  state and a 48-bit phase. Delay samples use eight guard bits (approximately
  16-bit buffer precision) to contain high-frequency air peaks. Dry bypass
  retains all 24 input bits. Float denormal noise and dither are omitted.
- The original 8,176-sample double-write buffer is replaced by a wrapped
  8,192-sample ring, retaining all three-point reads and the complete delay
  range. Initial phase is π/2. Removing/reassigning the effect resets its
  private buffer and LFO; tail/phase persistence is not promised.

## Authorship and licences

Original: [Chris Johnson / Airwindows](https://www.airwindows.com/),
[Chorus source](https://github.com/airwindows/airwindows/tree/e718c9bcfcdd736deeddb08bffe6bce2aa8e0eea/plugins/WinVST/Chorus).
The MIT licence permits adapting and distributing the source with its notice;
full text is in [LICENSE](LICENSE). The user's desktop DLL/AU/VST files are
not redistributed. This port uses published source and original assembly.

## Tests and measurements

`verify.py` assembles the actual DSP and compares synthetic-memory renders
with `reference.py`, a transcription of the pinned source. `verify_controls.py`
uses the repository's unmodified click metric and its known-bad/known-good
self-test, without importing its firmware-dependent published rig driver.
Both need the locally built DSP toolchain (`DSP_TOOLS` overrides its path).
Keep every firmware image, extracted stock byte, raw memory dump and audio
fixture private. Only sanitized text evidence and actual UI exports belong here.

See [TESTING.md](TESTING.md) for full cycle, memory, stock-comparison and sound-quality results. No shareable hardware audio recording was supplied.

[Initial dry controls](media/ot-controls.png) · [Return to dry](media/ot-dry.png)
