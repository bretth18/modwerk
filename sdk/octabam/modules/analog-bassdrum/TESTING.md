# Analog BD modulation fix — testing

Release: `0.1.3-experimental`; approved base: `0.1.2-experimental`.
Owner report, 8 October 2026: modulating TDEP and SAT produces audible zipping.
The report did not identify the device, image hash or modulation settings.
The later owner hardware result and release approval are recorded below.

## Native evidence — 8 October 2026

The isolated Linux DSP interpreter assembled and disassembled the exact candidate.
[evidence/native.json](evidence/native.json) binds source, base, tool and test
identities to the results. No stock firmware was used in these tests.

- Ten constant renders (808/909, SAT 0/64/127 and all-controls minimum/maximum) are bit-identical to the approved
  sources: 13,216 stereo samples each, all trigger offsets and rapid retriggers.
- Stepped TDEP, SAT and combined automation match the independent sample-wise
  reference with residuals from −92.39 to −106.31 dB. Actual native state checks
  verify upward/downward slews and continuity through retriggers.
- Full-range first-sample parameter-change deltas fall by 36.07–36.26 dB for
  909 TDEP, 28.02–58.35 dB for 909 SAT and 39.08–43.49 dB for 808 SAT. The probes
  compare a changed control to a held control with the same preceding state;
  these are deterministic jump measurements, not listening scores or a guarantee
  about every patch/modulation rate.
- The compact combined image renders exactly like the standalone engines at
  both native P origins (A `0x1252`, B `0x1012`). It uses 946 P words per core
  against a 1,028-word region, preserving the separate stock-helper reservation.
- Four interleaved instances per core placement use distinct patches and two
  808s/two 909s. Every audio stream is bit-identical to that voice alone. Editing
  their controls and resetting one 909 does not change the other voices. The host
  uses the native 64-word voice stride and stores knobs at voice +48, exercising
  the reused scratch slots. These are DSP-core placement/instance tests, not
  full-machine or physical-device tests.

The initial approach slewed SAT's three coefficients independently. The 808
full-range jump probe exposed gain overshoot and insufficient step reduction.
The delivered candidate slews SAT position before table interpolation; all probes
above then pass. The macOS execution sandbox failed before Python started, so
only the isolated Linux results are claimed.

## Resource accounting and limits

Combined peak executed instructions in the focused modulation/retrigger workload
are 6,176 per 16-frame 909 block (386/sample) and 4,294 per 808 block (268.375/sample).
These are measured executed instructions, **not worst-case chip cycles**. They
exceed the approved standalone harness's old instruction-growth guards, so that
old timing evidence must not be used to release this update. Full-chain budgets
and maximum audio/FX load remain untested.

P allocation: 946 words / 2,838 packed bytes per core; the 35-word stock helper
stays in its separate reservation. The existing X upload region remains
`[0x2840,0x3700)`: 3,776 words / 11,328 packed bytes per core, including tables,
voice blocks and alignment gaps. Both engine banks keep four 64-word blocks per
core, 512 words / 1,536 packed bytes in total. No X, Y or ColdFire allocation is
added. Per voice, SAT history uses previously unused X word +61. The 909's depth
histories reuse +21/+22; temporary body/pulse scratch moves to consumed MODEL
and unused-control slots +54/+59. Controls are recopied before each block. Init
clears PAD, so first-use seeding also resets the SAT history without clearing
another voice. ColdFire assignment, transport and saved control layouts are
byte-identical to the approved base (bound in [evidence/native.json](evidence/native.json)).

Relative resource estimates: ColdFire demand unchanged; DSP remains high per
active voice because synthesis plus desk now also performs per-sample smoothing
and table interpolation; memory demand is unchanged. These estimates do not
replace the missing full qualification accounting/timing.

## Reproduction

Use an existing reviewed native-toolchain image with Python, a C++ compiler,
DSP assembler/disassembler and emulator static libraries at `/opt/toolchain`.
The local run used `octamod-tapehead-qualification-tools:local`, image ID
`3a5861370c0f`. The exact assembler/disassembler hashes are in the evidence.
Keep the source mount read-only, disable network, drop capabilities, and allow
writes only to a new temporary workspace and container tmpfs:

```sh
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --pids-limit 128 --memory 2g --cpus 2 \
  --shm-size 256m \
  --mount type=bind,source=<repository>,target=/source,readonly \
  --mount type=bind,source=<new-private-workspace>,target=/work \
  --tmpfs /tmp -w /work -e PYTHONDONTWRITEBYTECODE=1 \
  octamod-tapehead-qualification-tools:local \
  python3 /source/sdk/drafts/analog-bassdrum/qualification/run.py --output /work
```

Use the original pinned 0.1.2 SDK snapshot when running these historical development scripts; the promoted module is already overlaid. The runner verifies input identities before creating the disposable SDK overlay,
compiles the two test hosts, then runs baseline, static/modulation, jump and
multiple-instance gates. Only sanitized `evidence.json` may be retained publicly;
compiled payloads, raw audio/state, firmware, projects and cards remain private.

## Firmware persistence and actual LCD — 8 October 2026

[evidence/persistence.json](evidence/persistence.json) binds the private candidate
image (`87e56b38…`) and emulator to the tested source. The existing disposable
fixture was copied, not edited in place. T1 runs 808 and T5 runs 909, with different
patches and both stock FX slots populated. Part save/reload restores a saved
baseline after unsaved edits. Panel-driven PROJECT SAVE/RELOAD restores both
tracks after later edits. A fresh explicit project load also matches.

A new emulator process retaining only the saved card and 1 MiB battery RAM
restores both tracks without posting LOAD PROJECT, including seven seconds with
frame interrupts. Machine/FX assignments, source/engine/sample settings and
source/FX main/setup controls match throughout. Editing T1 preserves T5 and
editing FX2 preserves FX1. These are **control-state passes**, separate from the
DSP instance/audio tests above. No physical device was rebooted.

The initial DSP-enabled probe exited with SIGBUS (exit −7), before usable
audio or capture readiness. The actual controller LCD captures therefore used
the working stand-in DSP path. A private copy of `scripts/capture-module-ui.py`
removed its forced `--dsp` argument and set a 20-second project-load budget; the
source LCD renderer and actual panel actions were unchanged. Both tool hashes,
exact actions, source/image/emulator identities and visually reviewed PNG hashes
are retained in [media/capture.json](media/capture.json). Those historical captures
remain labelled stand-in DSP. An initial plan left a DISARM popup on two captures;
those were rejected and recaptured after it expired.

## Full-emulator SIGBUS diagnosis and fix — 8 October 2026

[evidence/emulator-shm.json](evidence/emulator-shm.json) records the regression and
recovery on the unchanged candidate image (`87e56b38…`) and unchanged emulator.
Docker's default `/dev/shm` allowance is 64 MiB. The DSP library reserves 52 MiB
of shared-memory backing per core (104 MiB for the pair), including the
invalid-address backing block. Mapping succeeds before storage is touched;
constructing the second DSP core exhausts that pool and raises SIGBUS.

An identical `--dsp --max 1000` probe exits −7 with `--shm-size 64m`; with
`--shm-size 256m` it constructs both cores and stops normally at the intentional
instruction budget (exit 1, BUDGET). The existing isolation settings and 2 GiB
overall memory limit stay in place. No firmware or emulator source change was
needed. The capture tool now checks for at least 128 MiB free in `/dev/shm` on
Linux, reports the `--shm-size 256m` setting and refuses before creating its output
directory. Both the real 64 MiB rejection and 256 MiB acceptance passed.

With 256 MiB, the full candidate boots both DSP cores, passes the RTOS gate and
completes LOAD PROJECT with distinct T1 808 and T5 909 assignments and both FX
slots populated. The initial 64-frame playback probe reaches its frame target
and captures 623,039 eight-channel frames, but all samples are zero: it did not
reach a trigger. That probe establishes crash recovery and project loading,
not usable audio. A separate 1,024-frame probe with `--internal-clock` reached
its 180-second wall-clock cap and was killed; no usable-audio pass is claimed.
The follow-up ran Node 24 `npm run check -- --base origin/main`: all 185 test
files / 1,249 tests and lint/build/SDK/catalog checks passed.

## Open acceptance paths

- Usable full-chain audio after Part/project reload and battery-only restart:
  **owner-reported physical MKII pass**, confirmed below. The emulator audio path
  remains unverified; emulator control-state passes are separate.
- Full machine reset/model-replacement isolation and maximum audio/FX load:
  **untested**. Native voice reset/isolation tests do not replace these checks.
- Worst-case chip cycles and complete final-image memory bounds: **unmeasured**,
  accepted for this exact owner-approved experimental update. Native/browser
  composition and release packaging are checked separately below. The
  owner-attributed MKII operation/reload/reboot/audio report is recorded below.

No physical device was flashed by the agent. The owner tested the private build.
The private candidate image, cards,
raw audio/LCD/memory traces and logs are not published. The owner requested release of this exact tested update. The separate source-bound
owner approval preserves the named incomplete measurements as explicit limits. The existing approved thumbnail is retained;
this update changes modulation behavior without changing the control design.

## Owner functional hardware report and release approval — 8 October 2026

Jannik Aßfalg (`repeat98`) received `OCTATRACK_ANALOG_BD_0.1.3_TEST.bin`,
label `AB013TEST`, built from commit `207964506864dec8a71ca0bc35ca19aca46a6f48`.
Complete update SHA-256:
`48217f8b1bf2b9284fc5831a79b94f020c70f1dafc94f6a72ff6857765a83a5a`.
Decoded MAIN OS SHA-256:
`87e56b38fe45a5b10fda2129193f67946b078f4d84b07a0cb1afbc2ef0ebaa54`.
The file passed native/browser full-update byte parity, checksum and decoded
MAIN identity checks. Firmware remains local.

The owner's exact statement was: **“works great and stable, let's release”**.
This is a credited functional hardware report and release authorization for
`0.1.3-experimental`, not a measured stress or worst-case timing result. The owner then answered **“MK2 yes all”** to the question asking for the model
and whether distinct 808/909 instances, Part/project reload and normal power-off/on
all kept their settings and audible output. This records an MKII physical
functional/persistence pass, separately from the emulator evidence. Duration,
maximum instance/FX load and worst-case chip timing were not reported.

The separate `sdk/analog-bassdrum-build-approval.json` binds the release approval
to this version and final native-source fingerprint. It preserves the existing
owner-approved update path for worst-case chip cycles and complete memory bounds. These exceptions do not grant later versions
a pass; source integrity, native/browser composition, packaging, licences, UI
provenance and documentation remain required.

## Release composition and packaging — 8 October 2026

The promotion was rebased onto approved main `f7ba0d1`, including Mini Verb 0.2.0.
A clean, tracked-source-only build at `fdb94e7ab46cb9240962456594819650ec4bc1fa`
compiled the published 0.1.3 packages without stock firmware. Toolchain image:
`sha256:6711f0abb3c30dcfda4e9a8a812555f8bbceb37a0fc988918b5d624b603d4a6a`.
Source tree SHA-256:
`dabaf66190efa66d07ddd7a5cc4eed7baf7efa4980887e093d733edb3ac4e053`.
Every other generated code package is unchanged from approved main; the requested
package changes only Analog BD's engine data and associated hashes/word counts.

`npm run module:verify -- analog-bassdrum --os <owner-stock> --jobs 1
--image modwerk-source-tools:continuation` passed 112 selections: 36 native/browser
matching builds and 76 matching refusals, zero mismatches. The record is
`sdk/native-comparisons/analog-bassdrum.json`. Changed stock input is refused.
Use one worker for this native builder: its DSP assembly output paths are shared;
a two-worker probe raced those paths and failed the decode preflight.

The native Analog BD suite then refreshed all 136 DSP/utility profiles, with
both stock-FX2 menu choices: 130 builds and six expected refusals. The source-bound
fingerprints are in `src/engine/assets/analog-bd-composition-proofs.json`.
`node scripts/verify-analog-bd-native.mjs <owner-stock> <proofs>` passed all 130
module-owned MAIN comparisons and independent GNU bootloader byte comparisons,
six matching refusals and five complete browser firmware round trips. Stock input
is unchanged and no platform/logger writes overlap module-owned writes.

Four full native update packages match browser ELEK/ELUP encoding byte-for-byte:
Analog BD alone and Analog BD + Tape Echo + all five utilities, each with stock
FX2 kept and compact. Every decoded MAIN, container tail and checksum passes.
Compression is sampled here; the 136-case matrix checks composition/bootloader
bytes for every accepted profile. Firmware and native packing inputs stay private.

The standalone native MAIN is
`e5639f9f47feaaaf74d202c411409d42a021017d0067e3c5aa4f2493798fd8d3`.
Only 50 bytes differ from the owner's test MAIN: the shared builder clones the
identical stock FX1 chooser table at `0x400d6b20` and changes its three references
at `0x40037990`, `0x40052706` and `0x40059bd2`. Restoring those four chooser writes
reproduces the owner's entire MAIN hash exactly, including the appended payloads.
The test image retains the original stock FX1 references; both menus are identical.
The public worker also adds its already-approved logger/startup infrastructure.
The standalone public-worker composition, label `ELEKLOADER`, round-trips to MAIN
`80dfdd8f938daaf86f87e1332cec93a735a9c3ba00997ce70a20b9886b2fdeac`;
full update is 575,496 bytes, SHA-256
`c871fc7424404985ca2c4c1a2ee3be1fa5c68e47494c6abf66ef4e3d479dca33`.
These are software checks; the credited physical report remains bound to the
actual `AB013TEST` image and is not relabelled as a physical test of every composition.
