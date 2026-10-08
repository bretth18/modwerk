# Mini Verb 0.2.0-experimental testing

This is a source draft, excluded from the public module catalog and packages.
The published 0.1.2-experimental folder, catalog pin and qualification remain
unchanged. The existing baseline exemption does not qualify this new DSP.

## Native DSP regression

The verifier uses the existing `build_bus.assemble` assembler/disassembler
round-trip audit, stock-payload frame context and `benchmark_reverbs` DSP host.
It injects each independently assembled module at P:0x2000 into temporary
private payload dumps for a controlled DSP comparison. This does not prove
placement in a complete release image. No firmware or memory dumps are committed.

Reproduce with a disposable native SDK copy and the private MAIN OS extraction:

```sh
DSP_HOST=/absolute/path/to/current-checkout/dsp_host \
python3 -B sdk/drafts/miniverb/verify.py \
  --sdk /absolute/path/to/disposable/octabam \
  --stock /absolute/path/to/private/section_3_MAIN_OS.bin \
  --output /absolute/path/to/private/miniverb-tone-results
```

Build `dsp_host` from this checkout's `tools/harness/dsp_host/dsp_host.cpp` against
the patched toolchain, not a stale shared host. Both emulated cores need more
than Docker's default 64 MiB shared-memory allocation; the local offline run
uses `--shm-size 512m`. Raw commands, parameters, meters, logs and WAVs remain
in the private output directory. The committed report contains only source
hashes, measurements and verdicts.

## Results — 8 October 2026

All **46 native DSP checks passed**. Current source hashes and exact verdicts
are recorded in [evidence/dsp-regression.json](evidence/dsp-regression.json). The baseline is the unchanged published source at main commit
`2899ff214b51004ecb70b10dba519556740a0f65`.

Verified so far: 532 assembled program words; a static 411-word/cycle sample-loop
bound (baseline 457 program words / 360 static cycles), with marker insertion
proven byte-identical. The bound excludes chip contention and does not sum
ColdFire work, dispatcher or voice engines. The DSP host executes the actual
assembled code at 44.1 kHz, 16-sample blocks.

| Measurement | Actual result |
| --- | --- |
| Eight moving instances, mixed splits, four per core | 23,360 instructions/core/block; baseline 20,296; +15.10% |
| Eight neutral instances | 21,092 instructions/core/block; baseline fixed peak 20,132; +4.77% |
| Dark endpoint, 70 Hz / 4 kHz relative to neutral | -0.10 dB / -18.85 dB |
| Bright endpoint, 70 Hz / 4 kHz relative to neutral | -16.60 dB / -0.34 dB |
| TONE 64 with moving original controls, splits 0/1/7/15 | Bit-identical to the accepted previous voice |
| MIX 0 at TONE 0/64/127 | Bit-exact bipolar dry passthrough |
| Eight instances vs isolated renders, both cores and interleaved scheduling | Bit-identical; no cross-instance influence |
| One excited instance, repeated at all eight positions | Other seven outputs exactly silent |
| Dirty scalar and delay state, active private/shared Y and loaded P guards | Passed short regression runs |
| 30-second moving eight-instance guarded render | 82,688 blocks, 23,360 instructions/core/block peak; zero clipping, stray writes or clobber |

Private common-builder composition succeeded with only Mini Verb and the two
existing stock DSP loader modules. MAIN OS SHA-256:
`fd42fa81ee3cf23a47381a96d2e70be3efbaab250f5c3aedb5a1e11cd4a2529e`.
[evidence/private-composition.json](evidence/private-composition.json) binds the
runtime sources, image and isolated toolchain; the firmware remains private.
This proves composition of that selection, not exhaustive native/browser parity.

The real six-control LCD was captured on this image through the maintained
capture script, viewed and matched to the declaration. See
[media/capture.json](media/capture.json) for the exact panel sequence and hashes.
No fresh hardware test is implied.

Tone endpoints and percussion tails are stereo, unclipped and decaying. Both
full-range jumps follow the per-sample smoother, and the actual state settles
back to exactly zero at Tone 64. The long render is DSP-only; it does not run
eight actual voice engines, project LFOs or saved locks.

Repository validation used Node 24.21.0 and `npm ci`.
`npm run check -- --base origin/main` passed: 188 test files / 1,266 tests,
plus SDK, lint, typecheck, bundle, catalogue, licence and media checks.
`npm run module:doctor -- miniverb` is green for the unchanged published module;
it does not qualify this staged draft.

Aliasing audit: not tested. Native endpoint and musical renders check unclipped
output and spectral attenuation; they do not constitute listening acceptance.
Idle behavior is covered by eight silent instances after dirty initialization.

## Release qualification still pending

- Current-source common-builder composition, browser/native package parity and refusals.
- Worst-case chip cycles including memory contention, ColdFire publication and complete load.
- A 30-second full project stress workload with eight tracks, three LFOs per track and parameter locks.
- Full first-time-use walkthrough beyond the captured selection and six-control main page.
- Listening acceptance of dark/neutral/bright percussion and musical samples.
- Actual parameter locks, LFOs, scenes and crossfader on both sides of Tone neutral.
- Multiple distinct instances on both DSP cores, including editing/resetting/replacing one in isolation.
- Part save/reload, project save/load/reload and a physical reboot with usable audio restored.
- Original-project migration of old Mix values, locks, scenes and LFO destinations.

Hardware status: **not tested**. No unit was flashed or rebooted. An emulator
DSP render cannot establish physical reboot persistence or whole-instrument
headroom. The owner reviews any release exception for this exact source/version;
no old version's waiver or qualification is extended.
