# Digi Mono testing

## Encoder layout fix — 0.13.3-experimental, 11 October 2026

Issue [#182](https://github.com/repeat98/modwerk/issues/182) is confirmed in the published 0.13.2 build: SAW puts SUB1/SUB2 on G/H, while PULSE puts them on E/D. The PULSE SRC layout now maps A..H to TUNE, UNIL, UNIW, PW, PWAD, PWRS, SUB1 and SUB2. Only page descriptors move. `knob_slot`, `knob_p`, `mono_def`, parameter formats/ranges, LFO destination naming and all synthesis sources are unchanged, so old stored values keep their meaning. This source review is not a physical save/reload or played parameter-lock/LFO result.

[evidence/encoder-layout-0.13.3.json](evidence/encoder-layout-0.13.3.json) binds the version, source, compiler, packages, exact private images, native panel observations and limits. Runtime source SHA-256 is `6fa2c66f23d85458bd0655b40a0c2f5b820532e5e1f993cb92842fc06bf335db`. Native candidate compilation uses an isolated tracked-source snapshot based on main plus the recorded source/manifest update; the base commit alone does not identify the candidate. The PR's source-only job must reproduce both committed release packages.

- Native GCC 16.2 / binutils 2.47 compilation passes on OS 1.53 and 1.54 without firmware, credentials or network in the compiler container.
- On both releases the stock-free exported package and private recipe materialization produce byte-identical firmware. The unchanged vendored builder accepts the exact reported selection: core 2.1, DIGICHAIN 1.6, Digi EQ 1.0b and Digi Mono 0.13.3-experimental. Hash guards, patch overlap, instruction boundaries, link budgets and container checks pass.
- Final catalogue pins reference source/package commit `20ce6bcc910741ab2bc49fd288ee57dd13d7900f`. Both OS releases rebuild without overrides and save/read back the same D182 image hashes below; the captured candidate and final pinned release are byte-identical.
- Firmware-native panel input (`hle=False`) turns every SAW/PULSE encoder using successive detents. PULSE A..H change stored slots `[17,18,19,22,23,24,21,20]`; SAW stays `[17,18,19,unused,21,22,23,24]`. Before/after parameter reads confirm the seven other tracks' tested SRC values are untouched. Both OS releases pass. These are UI-kit parameter observations, not observed audio.
- The baseline OS 1.54 image confirms PULSE's old A..H slots `[17,18,19,20,21,22,23,24]`. SUB1/SUB2 remain stored at 21/20 across the update; G/H now address those slots.
- Current SAW/PULSE captures show complete dials, aligned G/H sub controls and sidebar. NOISE shows its three specific controls and TUNE but omits the common sidebar; ENS shows all seven specific controls but omits common TUNE/sidebar. These unmodified native frames are retained as limited evidence, not a complete-page redraw pass. The owner approved the exact experimental release with this documentation limit disclosed; it remains a limited capture, not a full redraw pass. Per-image plans include the slower settle route; no pixels are combined.
- All six non-PULSE PNGs freshly captured from D182 are byte-identical to the 0.13.2 gallery, including the NOISE/ENS omissions. PULSE is the only changed image; this comparison does not turn partial pages into a complete-page pass.
- Current gallery coverage and exact panel inputs are in [media/capture.json](media/capture.json). Frames are actual firmware-rendered pixels at integer scale; no menu, parameter or LCD state is injected.

Compiled memory is 23,113 B of `.run` + 9,272 B of `.bss` + 32 B of contributions = **32,417 B**, 76 B more than 0.13.2, before shared dependencies/alignment. The tested selection leaves 86,356 B of the reserved RAM region and all 2,304 B of fast RAM. These are static linker estimates; DSP timing and complete runtime memory bounds are unmeasured.

### Exact private builds and required physical checks

Use a disposable project and your stock recovery file. Select core 2.1, DIGICHAIN 1.6, Digi EQ 1.0b and Digi Mono 0.13.3-experimental; output version **D182**:

| OS | Private firmware SHA-256 |
| --- | --- |
| 1.53 | `b1650a2be1ef7e805cca325f63cc74b1f0303bcb2441aa0fc0438c7f1586a7bb` |
| 1.54 | `0d54f54eb4691530faa0b839cf0b9cfa21cdd5e5412ccd09af5eb05e8cf15f27` |

1. Load a disposable copy of a project/sound saved with 0.13.2. On PULSE verify that SUB1/SUB2 retain their old values and sound; edit them with G/H. Verify PW/PWAD/PWRS on D/E/F and TUNE/unison on A/B/C.
2. Put SAW and PULSE on separate tracks with distinct values. Alternate tracks, edit every encoder and confirm independent values/audio and consistent G/H sub controls. Confirm D/H presses and FUNC turns do not open the sample browser. Exercise the other five models and a neighboring stock ONESHOT track.
3. Play distinct parameter locks and LFO destinations for the subs and pulse-width parameters, confirming their parameter meanings and return values. Exercise repeated and double SRC, plus FLTR/AMP/LFO, without losing controls or sidebar.
4. Save sounds/project, reload, switch projects, then physically reboot. Confirm models, distinct values, locks and LFO destinations survive. Digitakt has no Octatrack Parts or dual DSP-core/FX-slot assignment; track/voice isolation applies.
5. Record audio, DSP average/peak and sustained playback/stress results with conditions. Emulator instructions and LCD captures do not establish chip timing or full memory bounds.

**No physical results have been supplied.** Hardware, audio, DSP timing, complete runtime memory bounds, persistence, physical reboot, played p-lock/LFO and stress qualification remain unverified. On 11 October the owner explicitly authorized “Approve this exact experimental release and issue closure with the limits disclosed”, binding runtime source `6fa2c66f23d85458bd0655b40a0c2f5b820532e5e1f993cb92842fc06bf335db` and both D182 hashes above. The exception also discloses the NOISE/ENS common-region capture omissions. It permits publication and closure of #182 only after saved live-download verification; it records no hardware pass. Reopen #182 if this version still assigns a control to the wrong encoder, including OS, output/module versions, model/track and reproduction steps. This is a separate current-source approval, not an extension of the historical #180 waiver.

Reproduce the parameter regression in an isolated sandbox:

```sh
python3 scripts/verify-digimono-encoder-layout.py \
  --emulator /path/to/pinned/digiemu --os 1.54 \
  --firmware /private/capture/digimono.syx --out /private/capture/new-encoder-session
```

Use `--legacy` only when measuring the published 0.13.2 baseline. Use a fresh output directory; firmware, cards and snapshots remain private. The helper verifies the emulator pin/clean tree and reads only structured parameter values after actual native panel events. HLE, audio and cycle timing are disabled.

## Historical SRC-page fix — 0.13.2-experimental, 11 October 2026

Issue [#180](https://github.com/repeat98/modwerk/issues/180) is reproduced with the pinned 0.13b package: another SRC press on MONO PULSE selects the stock sample-detail page, showing parameter names without the dials and sidebar. The fix wraps the stock SamplePageView key and tick handlers. For machine IDs 20–26 it uses the stock page-index setter and invalidation routine to retain page 0. Stock sample tracks keep their detail page. The tick also normalizes the mode when selecting a synth track from a sample-detail page. Synth code, parameter slots and saved sound layout are unchanged.

[evidence/src-page-0.13.2.json](evidence/src-page-0.13.2.json) records the exact build/source identity, image and package hashes, compiler versions, results and limits. Runtime source SHA-256 is `e3b33c2059d7daa2b589ba6f47d359dd5f2568e1123791555b3cf661138c0173`; its documented fingerprint binds this version, build.json and all src/ files. The compiler's full folder inventory additionally includes historical documentation, so that inventory hash is a separate identity.

- Native compilation succeeds for OS 1.53 and 1.54 in the pinned GCC 16.2 / binutils 2.47 toolchain, isolated without firmware or credentials.
- The unchanged vendored elekloader builder links and verifies the actual candidate with core 2.1, DIGICHAIN 1.6 and Digi EQ 1.0b, matching the reported module combination. All hash guards, instruction boundaries, overlap checks and container checks pass. Sections 2, 4, 5 and 8 are unchanged.
- The new stock-free .elemod packages produce byte-identical private firmware to local recipe materialization on both supported releases. Existing six-byte call sites now declare their known JSR operation explicitly; stock guards and targets remain identical. No stock code is exported.
- Firmware-native emulator panel inputs on both releases select track-8 MONO PULSE, change knobs, and press SRC repeatedly and in a fast double press. Controls and the track/level sidebar remain visible. Stock ONESHOT can still enter detail page 1. The stock-detail-to-synth transition returns to page 0 in the native hook trace; physical display transition remains unverified.
- A fresh OS 1.54 session captures all seven synth control pages after fast double SRC, plus the chooser and LFO. The seven gallery images were opened for review and have the same pixels as the earlier normal-page captures. The historical 0.13.2 media/capture.json in Git records those input events, selected frames, image hash and local release override; the current file documents 0.13.3. No menu state, parameter state or LCD labels were injected.

Compiled memory is 23,037 B of .run + 9,272 B of .bss + 32 B of contributions = **32,341 B**, before shared dependencies and alignment. The tested selection leaves 86,432 B of the linker's reserved RAM region and 2,304 B of fast RAM. These are static/link estimates, not complete runtime memory bounds or measured DSP headroom.

### Exact private builds and physical checks

Use a disposable project and your stock recovery file. Select core 2.1, DIGICHAIN 1.6, Digi EQ 1.0b and Digi Mono 0.13.2-experimental, output version D180:

| OS | Private firmware SHA-256 |
| --- | --- |
| 1.53 | `c4941d8eea8b2f7d12cf4ddeecad3b81c91e74b2a34bea66be5df6b092ca36ee` |
| 1.54 | `b90e05a46af97b7179e7a17123b9335bcec90db4cec20996575d036a25249130` |

1. On track 8 select MONO PULSE, turn each active SRC knob, then double-tap and repeatedly press SRC. Confirm labels, values, dials, track number and LEV remain visible and encoders still change the intended parameters.
2. Put a different synth model and distinct values on another track. Alternate tracks, change both, and confirm independent values, controls and audible voices. Exercise all seven models, FUNC+SRC chooser and FLTR/AMP/LFO.
3. On a stock ONESHOT track enter SRC detail, switch to either synth track, and return to the stock track. Confirm the synth main page and the stock sample detail controls work and the level sidebar redraws correctly.
4. Save the project and sounds, reload/change projects, then physically power-cycle. Confirm both models, separate values and playable audio persist. Digitakt has no Octatrack Parts or dual DSP-core/FX-slot assignment; track/voice isolation applies here.
5. Check DSP average/peak and long-running playback with existing monitoring tooling and record conditions and observed audio behavior. Do not treat the emulator as timing evidence.

**No physical results have been supplied.** Hardware, audio, timing, persistence, reboot, complete runtime memory bounds and stress remain unverified. This version has emulator evidence only. On 11 October 2026, owner repeat98 explicitly approved publishing this exact experimental release and closing #180 after live-download verification with all these limits disclosed. The exception binds runtime source `e3b33c2059d7daa2b589ba6f47d359dd5f2568e1123791555b3cf661138c0173` and the two D180 image hashes above; its literal authorization and scope are in the evidence JSON. It does not record a hardware pass. Reopen #180 if the updated build still loses controls on a physical unit, including the OS, build/module versions, track/model and reproduction steps.

Reproduce the documentation session with the pinned emulator and exact private image:

```sh
python3 scripts/capture-digi-module-ui.py \
  --emulator /path/to/pinned/digiemu \
  --firmware /private/capture/digimono.syx \
  --plan sdk/digitakt/modules/digimono/media/capture-plan.txt \
  --out /private/capture/new-session
```

Use the isolated sandbox in [MODULE_UI_CAPTURES.md](../../../../docs/MODULE_UI_CAPTURES.md). The corresponding historical capture record in Git pins the patched Unicorn source, six patch hashes and library identity. HLE, audio recording and cycle timing are disabled.

## Historical imported build checks

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.1 on each OS release:

- OS 1.53: core 2.1, DIGICHAIN 1.6 and Digi Mono 0.13b, built and verified; result SHA-256 starts `0398b1d7a05f4381`.
- OS 1.54: core 2.1, DIGICHAIN 1.6 and Digi Mono 0.13b, built and verified; result SHA-256 starts `30f8c005bf648133`.

This is a build check against the owner’s stock files, which are kept locally. It is not a hardware test.

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.53: combines with digihealth, Digi EQ, Digi Matrix, Digi Poly and Digi utilities; refused beside NEIGHBOR, DIGISLICER and SOPHIE, whose patch sites overlap (the builder names the sites).
- OS 1.54: combines with digihealth, Digi EQ, Digi Matrix, Digi Poly and Digi utilities; refused beside NEIGHBOR and DIGISLICER, whose patch sites overlap (the builder names the sites).

## Upstream

Digi Mono is not yet tested on a unit, its author reports; it passes their emulator tests on OS 1.53 and 1.54. The author’s design notes in [upstream/DESIGN.md](upstream/DESIGN.md) describe those checks: the engine measured on a PC build (`tests/mono_signal.py`), the ColdFire build compared bit for bit with the PC build (`tests/emu_mono.py`), every machine played in the real firmware in the digiemu emulator and compared bit for bit with the engine (`tests/digiemu_mono.py`), and the FLTR, AMP and LFO pages on a Digi Mono track (`tests/digiemu_mono_fx.py`). Those results belong to the author’s 0.13b builds with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digimono-0.13b.elemod` release object for OS 1.53 (SHA-256 `79b51a364b1b7fd8ca13ac6aacba15bd1439bb46569b11d1ad5b3a35b1cec3ec`) contains 22,931 B in `.run`, 9,272 B in `.bss` and 32 B of table contributions: **32,235 B** in total.

The author’s `digimono-0.13b-os1.54.elemod` release object for OS 1.54 (SHA-256 `bbd79b944ab7a2176d933d671cc3019e2f55748412c37e1b9c64779348137dbc`) contains 22,931 B in `.run`, 9,272 B in `.bss` and 32 B of table contributions: **32,235 B** in total.

This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment, which the browser estimate reserves separately, and DIGICHAIN, which counts as its own module. This is an upstream object measurement, not a measured Modwerk build or hardware load report.

## Historical documentation capture — 7 October 2026

Documentation version: `0.13.1-experimental`. Source revision: `35bacb3730d108e4dc48a7bd6de4c99ae9b161e6` (`mods/digimono`). Native source, build declaration and pinned release objects were not changed.

The unchanged vendored elekloader kit 0.4.0 linked and verified the pinned release modules listed in the October 7 capture record (retained in Git history) with the owner’s private stock OS 1.53 file. Built-image SHA-256: `734d97eee93237736fbeea07a756ed04af28ad6840b2e6fb9953e69423b8274e`. Module metadata version is separate from the native release versions listed in that record. Firmware and derived images remain private.

Pinned digiemu `c1b5735835923e328f8b4950d6ba927875e5b669` ran firmware-native drawing with `hle=False`, a reviewed patched Unicorn 2.1.4, Python 3.12.13 and a disposable first-boot project in a network-denied macOS sandbox. The record pins the Unicorn source, six patch hashes and local library hash. Only complete, unmodified LCD frames were retained at 6× integer scale and every retained image was opened for review.

- MONO SIN in the machine chooser.
- MONO SIN controls.
- MONO NOISE controls.
- MONO SAW controls.
- MONO PULSE controls.
- MONO ENS controls.
- MONO VO controls.

UI-only documentation; no hardware, audio, timing, persistence or stress qualification.

Reproduce after building the same module selection using the browser’s vendored elekloader builder and your own OS file, keeping all firmware and emulator outputs outside the checkout:

```sh
python3 scripts/capture-digi-module-ui.py \
  --emulator /path/to/pinned/digiemu \
  --firmware /private/capture/custom.syx \
  --plan sdk/digitakt/modules/digimono/media/capture-plan.txt \
  --out /private/capture/new-session
```

The October 7 plan and capture record are retained in Git history; current media files describe the version named in media/capture.json. Run captures inside the isolated sandbox described in [MODULE_UI_CAPTURES.md](../../../../docs/MODULE_UI_CAPTURES.md). The capture CLI was smoke-tested from a fresh Digitakt digihealth first boot; these module captures use the same pinned emulator panel APIs. No menu state or LCD labels were injected.

Passed repository validation on 7 October 2026: `npm run modules:generate`, `npm run check`, `npm run module:doctor -- digimono`, and `npm run modules:check -- --base origin/main`. UI documentation keeps the existing evidence tier and imported resource estimates; hardware, sound quality, persistence, stress behaviour and cycle-accurate performance remain untested in this update.
