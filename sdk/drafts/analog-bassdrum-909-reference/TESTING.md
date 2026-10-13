# Analog BD 909 reference candidate — testing

Candidate `0.1.4-experimental`, approved base `0.1.3-experimental`; 9 October 2026. Current private image: **AB014REF05**. `draft.json` pins current sources; `evidence/` contains numerical results and fingerprints. Reference audio, compiled DSP, raw traces and firmware remain private.

## Reference and fitting

Skee Mask supplied **Attack Rise**, **Tune Rise**, and **Tune + Attack Rise**, each 44.1 kHz stereo 24-bit PCM on a 70 BPM quarter-note grid (48/64/48 segments). Channels are effectively identical; no reference sample reaches full scale. The owner confirms **909 direct-out capture**, which excludes the 909 main-out LPF. The voice report says knobs moved after hits and the final two to four hits sometimes repeated an endpoint. The loop/clock/grid stayed the same. The Tune high endpoint comes from the final recorded hits, not an assumed uniformly spaced sweep. The instrument is decay-modified, recorded with decay a little above halfway. Other fixed controls, exact intermediate positions and external processing remain unspecified. The report provides recording context, not task instructions; transcription stayed local.

`calibrate.py` fits common decay with nuisance DC and complex harmonics. Low-Attack hits 2–13 train a degree-11 even-phase polynomial plus `u*(1+x)` times a degree-4 quadrature polynomial. Separate bounded whole-hit fits refine gain, hold/droop, DC response and both Tune endpoints. The small settled-pitch endpoint difference comes from the Tune recording, not random pitch. [full-hit-fit.json](evidence/full-hit-fit.json) preserves this historical AB014REF04 fitting record; its pulse values are superseded by [direct-out-fit.json](evidence/direct-out-fit.json).

AB014REF05 holds the complete body and Tune model fixed and refits only pulse coefficients and the minimum pulse gain (`body.k0`) for LPF bypass. Low/high Attack are fitted jointly over 30 ms, with a weighted high-pass residual and full-onset band-energy targets. Input gains divided by 16 and filter gains multiplied by 16 preserve fixed-point headroom; the existing quarter-scale mixer and long/fast discharge structure remain. These fitted filter values are model choices, not measured components. The existing DECAY mapping outside the recorded setting is retained; the modified instrument's full decay range is not reproduced. Intermediate Tune/Attack controls remain a design interpolation.

Pulse strength now ranges from 0.92 to 1.0 instead of 0.88 to 1.0. Existing shaped noise is retained. No random trigger delay or pitch is introduced. The limited endpoint data do **not** establish a physical noise mechanism or a faithful statistical distribution.

## Full onset and neighboring hits

The original upper-band analysis cut the reference at its steep negative slope, partway into the attack (approximately −0.12 at the first sample). Filtering that discontinuity from zero introduced artificial high-frequency energy. Those upper-band conclusions are withdrawn. Listening WAVs contained complete hits and were unaffected.

`qualification/reference.py` now includes 512 samples of natural pre-roll plus 4,096 post-edge samples. Fourth-order causal bandpass filters start at the initial DC level. Reference energy is the median of the final four Attack hits; emulator energy is the median of seven carried-state hits after the first. A single fixed tail-RMS gain follows measured stock AMP compensation; spectral comparison uses no separate peak normalization. [neighbors.json](evidence/neighbors.json) records actual AB014REF05 firmware output and the script fingerprint.

| Band | AB014REF04, bypass | AB014REF05, bypass |
| --- | ---: | ---: |
| 2–4 kHz | +3.12 dB | +1.24 dB |
| 4–8 kHz | +4.12 dB | −1.34 dB |
| 8–12 kHz | −2.76 dB | −3.46 dB |
| 12–18 kHz | +4.72 dB | −4.13 dB |
| 18–21.5 kHz | +12.56 dB | −0.10 dB |

Values are energy differences from the real direct-out reference. The historical column uses the second actual emulator hit with pre-roll, while the current column uses seven hits; this is a diagnostic comparison, not an independent fit-validation set. Residual middle/upper-band mismatch remains.

The final eight reference peaks have 2.24% tail-normalized spread after detrending, but the final four still have a rising trend: 2.31% spread, falling to 0.81% after detrending. The final two differ by about 0.71% of their mean. Possible remaining knob movement means these are not a clean random-variation target.

Eight equal-control **native** high-Attack hits have 2.23% peak spread, down from 3.42% in AB014REF04. Seven carried-state **complete-image** hits have 1.81% tail-normalized peak spread. Sample count and noise phase affect these small estimates. After removing fitted transient gain and sub-sample alignment, the final four reference hits have 3.12%/3.01% RMS shape spread over 0–10/10–30 ms. Current complete-image hits have only 0.86%/0.24%. Capture noise, residual knob movement and interpolation remain confounders, but the model's transient shapes are clearly more consistent. **Faithful neighboring-hit shape reproduction is not established.** These measurements describe an open mismatch; they do not justify adding random pitch/timing or indiscriminate noise.

## Complete-hit comparison

`compare.py` uses native 24-bit PCM and original reference medians. The current preview uses LPF bypass. One fixed tail-RMS factor per engine comes from its first native hit and one low-Attack reference hit (candidate: 1.03923). Low medians use hits 2–9 and high medians the final four; both informed fitting. Time residual aligns the reference by its steep attack edge, which is **not true trigger alignment**. Use the full-onset method above for spectral energy.

| Measurement | Approved 0.1.3, bypass | AB014REF05, bypass |
| --- | ---: | ---: |
| Low Attack RMS error, edge-aligned 0–10 ms | 0.13536 | 0.01866 |
| High Attack RMS error, edge-aligned 0–10 ms | 0.18220 | 0.02077 |
| Low Attack RMS error, 20–700 ms | 0.15173 | 0.00510 |
| High Attack RMS error, 20–700 ms | 0.15201 | 0.00791 |
| Mean absolute H2–H5 magnitude error, four held-out Attack hits | 6.98 dB | 0.59 dB |
| Mean absolute H2–H5 quadrature coefficient error | 0.02112 | 0.00211 |
| Native preview peak / limited samples | 1.0 / 52 | 0.65971 / 0 |

Held-out harmonic profiles use hits 25/33/41/48. This does not establish agreement for every pitch/decay/accent or another hardware 909. [comparison.json](evidence/comparison.json) retains profiles and methods. Previous LPF48 preview scores are different conditions and must not be presented as a bypass baseline.

Separate listening clips play two original reference hits, then two actual emulator hits at TUNE/ATK 0/0, 0/127 and 127/0. Attack maximum uses recorded hits 47/48; Tune maximum uses 63/64. One common tail-RMS gain follows stock AMP compensation. [endpoint-comparison.json](evidence/endpoint-comparison.json) records hashes and metrics: low/high Attack 20–700 ms RMS error is 0.00510/0.00791; Tune maximum is 0.00899. Reference/candidate Tune-high tail frequencies are 46.2888/46.2994 Hz under the same 130–500 ms profile window, which includes residual pitch envelope. A separate repeated-hit clip contains four original final Attack hits, a pause, then four actual emulator hits; hashes are in [audition.json](evidence/audition.json).

## Native ranges and complete-image integration

- Assembly/disassembly guards, SAT 0/64/127, min/max controls, rapid retriggers and moving TDEP/SAT pass. Normal native/model error is −76.93 to −106.40 dB. Quiet all-minimum cases use explicit absolute quantization bounds instead of a relative-error pass: 909 RMS 1.29e−6 / peak 1.43e−5, within 5e−6 / 2e−5; 808 also passes the absolute gate.
- Both engines stay silent before the first trigger. All 16 trigger offsets have no early output and begin at the requested sample. Native replay is deterministic.
- Tested 808 constant/moving-control streams remain bit-identical to the approved base. Combined code at both P origins (A 0x1252 / B 0x1012) matches standalone audio. Four interleaved distinct voices per core, with changed controls and one voice reset, match their standalone streams.
- All **128 values of ten audible controls** pass native/model stress walks (64 blocks/value, retrigger at each step), with errors −71.44 dB or better. Tables are monotone where required and signed-fraction bounded; fast gain is positive and bounded at every Attack value. These are rapid control walks, not 1,280 isolated full decays.
- In the current bypass patch, ACCNT 108–127 and LOW 97–127 can reach the existing output limiter. Other tested walks, including TUNE/ATK, do not. Existing gain/desk laws remain; no universal clipping-free claim is made.

[native.json](evidence/native.json) and [ranges.json](evidence/ranges.json) bind the native results to their sources. Their input snapshots are immutable. The analysis-only comments in calibrate/compare changed afterward and reference.py was subsequently added; current tools are pinned separately in `draft.json`. All three DSP/fit hashes still match the current candidate and exact private image.

The complete firmware MAIN OS passes focused LPF-bypass runs at TUNE/ATK 0/0 and 0/127 on core A, and 127/0 on core B; the other core runs 808. The high-Attack run covers eight complete 70 BPM hits. Control transport, both post-AMP tracks, stored model selection and main stereo output pass. Actual DSP source/model error is −72.1 to −72.7 dB. Stock AMP gain is approximately 0.253931 with 48 samples' delay; source/AMP residual is −118.1 to −118.6 dB. Controls are sampled at engine entry before scratch writes, audio at source continuation. [port.json](evidence/port.json) binds the runs to the exact image and current transport probe. FX slots are off. Emulator project loading and stored Part selection do not prove physical save/reload/reboot persistence.

## Historical LPF investigation

The owner described AB014REF04 as close, with Attack cut off in the high end. Its listening patch used LPF 48 (~3.414 kHz). Assignment default remains 127 (18 kHz); 64 is the existing nominal ~6.565 kHz network and 0 bypasses it. Exact-image runs at 64/127/0 passed integration checks without changing DSP source. The owner then confirmed direct-out capture and rejected a 1:1 match.

[lpf.json](evidence/lpf.json) preserves the AB014REF04 sources and corrected full-onset measurements. LPF48 reduces 8–12 kHz by 10.48 dB relative to the recording. Opening it restores much of that band, but bypass exposes excess 12–21.5 kHz energy, especially at the top. This supports refitting the pulse for direct-out capture, rather than treating the main-out network as part of the recording. The current probe's default is bypass; the machine's assignment default and LPF curve remain unchanged. Pass `--lpf 0|48|64|127` for comparisons.

## Efficiency and private build

Matched old/new runs on **both DSP cores** use identical 2,048-block streams per engine, moving controls, min/max patches and all 16 trigger splits. 909 grows from 6,141.77 to 6,524.07 mean executed instructions per 16-sample block (**+6.22%**); maximum matched-block increase is **6.27%**, with peaks 6,563 versus 6,176. 808 remains 4,268.47 mean / 4,294 peak with identical instruction counts. These are exactly the same counts as AB014REF04: this follow-up adds **zero instructions and zero memory**. [costs.json](evidence/costs.json) records the new source fingerprints. The 10% investigation threshold is a regression check, not a hardware headroom guarantee. Counts are executed instructions, **not modeled chip cycles or hardware timing**.

Combined code remains **997 P words/core** (approved: 946), within the 1,028-word engine reservation; the separate 35-word stock helper is preserved. X upload is `[0x2840,0x3700)`, 3,776 words / 11,328 packed bytes/core, including gaps. Four 64-word voice blocks/core, Y and ColdFire allocation remain unchanged. Existing unused +62/+63 hold FAST/GS; init clears them. The old pulse ramp word holds output-filter history. Quadrature shaping uses five table words within the existing upload and no extra oscillator history.

The owner's local stock 1.40C image produces a private complete native image with Analog BD and retained stock FX except harvested SPRING REV. Both DSP blobs are byte-identical to native qualification. The saved **AB014REF05** upgrade decodes exactly to the tested MAIN OS; [private-build.json](evidence/private-build.json) records fingerprints. Physical audio, persistence, demanding FX loads and hardware timing remain pending.

## Reproduce

First verify the overlay:

```sh
python3 sdk/drafts/analog-bassdrum-909-reference/apply.py
```

Use the reviewed local `octamod-tapehead-qualification-tools:local` image (local ID `3a5861370c0f`; tool hashes in native evidence). Mount the repository read-only and a fresh private output parent writable. Execute pending native DSP only in isolation:

```sh
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --pids-limit 128 --memory 2g --cpus 2 \
  --shm-size 256m \
  --mount type=bind,source=<repository>,target=/source,readonly \
  --mount type=bind,source=<private-output-parent>,target=/work \
  --tmpfs /tmp -e PYTHONDONTWRITEBYTECODE=1 \
  octamod-tapehead-qualification-tools:local \
  python3 /source/sdk/drafts/analog-bassdrum-909-reference/run.py \
  --sdk /source/sdk/octabam --output /work/new-native-run
```

Using that staged SDK, run `qualification/ranges.py --sdk <staged-sdk> --output <fresh-output>` and `qualification/costs.py --sdk <staged-sdk> --baseline <approved-module-copy> --output <fresh-output>` in the same isolation. Complete-image checks additionally require the native ColdFire toolchain on PATH, a locally prepared image/runtime symbols, an owned project fixture and `/opt/toolchain/emu-build`. Mount the fixture read-only, then run `qualification/port.py --sdk <staged-sdk> --project <fixture> --output <fresh-output> --attack <0-or-127> --tune <0-or-127> --lpf 0 [--reverse]`. High-Attack neighboring-hit runs use `--frames 20000`. No sample playback supplies generated audio.

Analysis requires numpy/scipy (local Python 3.14, numpy 2.4.6, scipy 1.18.1). Keep all audio and outputs private:

```sh
python calibrate.py --reference-dir '<private-909-folder>' --output <new-calibration.json>
python compare.py --reference-dir '<private-909-folder>' \
  --calibration <calibration.json> --audition-dir <native-run> --output <new-comparison.json>
python qualification/reference.py --reference-dir '<private-909-folder>' \
  --calibration <calibration.json> --emulator <level-matched-emulator-909.wav> \
  --gain <common-tail-rms-gain> --output <new-neighbor-report.json>
```

`calibrate.py` reproduces the complex harmonic and initial differential-pulse stages, not every subsequent private optimization. Fitting inputs, bounds and implemented outputs are recorded in full-hit-fit/direct-out-fit evidence.

## Owner acceptance and physical qualification limits

The earlier “Yes, keep this attack” applied to AB014REF02 and was withdrawn. AB014REF04 was described as close, then the direct comparison was rejected as a 1:1 match. The owner accepted the AB014REF05 four-reference/four-emulator clip: “it's ok, let's release it”. They then explicitly waived fresh physical hardware/persistence, worst-case chip timing and complete memory bounds for this exact source: “Yes—waive those limits and release”. No physical results are inferred. The following hardware steps remain an unexecuted test plan for the exact saved upgrade matching private-build evidence.

1. At 70 BPM use PITCH 49, DECAY 100, TUNE 0, TDEP 64, SAT 0, ACCNT 72, LPF **0**, LOW/HIGH 64. Sweep ATK alone, then TUNE alone, including endpoints and repeated equal-control hits. Compare direct-out references; test LPF separately and normal musical settings.
2. Use distinct 808/909 tracks on both cores. Exercise locks/LFOs/scenes, TDEP/SAT changes and retriggers; edit/reset/replace one instance while checking the others. Test stock AMP, retained FX including PLATE/DARK and demanding loads.
3. Save distinct engines/parameters, make unsaved edits, and verify Part/project reload independently. Power-cycle the physical unit and verify restoration separately; emulator loading is not reboot evidence.
4. Record unit model, exact build hash, duration, audio, isolation/load and each persistence result. Keep missing results explicit. Promote through the module guide only after version-matched qualification or an explicit owner exception naming the exact source and limits.

The new approval is in `sdk/analog-bassdrum-build-approval.json`; prior 0.1.3 hardware results remain historical. Skee Mask's credit and the current limitations are in the public 0.1.4 changelog. Private recordings are not distributed. Reproduce these original native gates from commit `d96ae7f` and its approved 0.1.3 base snapshot, because the public folder now contains the promoted DSP files.

## Repository validation

Node 24.21.0 `npm run check -- --base origin/main` passed in 41.27 seconds: 197 test files / 1,377 app tests, SDK checks, catalogue/licence checks, lint, types and production bundle. Existing lint/build warnings remain. Approved public Analog BD module doctor is green at 0.1.3. This paragraph records the pre-promotion draft check. Current public release checks are recorded in the public module TESTING.md; the new owner exception is required independently of these software checks.
