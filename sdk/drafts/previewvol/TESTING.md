# Preview Vol testing

Draft version: `0.1.1-experimental`. Authored source pin:
`906fc354536d9a1d6ccd90a87fcf3c1f6edb6488`
([repeat98/octamad](https://github.com/repeat98/octamad/tree/906fc354536d9a1d6ccd90a87fcf3c1f6edb6488/modules/previewvol)).
Capture date: 2 October 2026; contributor handle: @repeat98.

## Current evidence and release status

A private isolated native build passed readback of both preview detours and
produced the actual MKII emulator LCD captures in `media/`. The capture preflight
confirmed the requested project loaded and its bank parsed, dismissed the date
prompt using NO, and required closed startup dialogs. The original thumbnail,
README tutorial and actual black-and-white PNGs have ordinary static checks.
These results establish source integrity, hook wiring and the documented UI
navigation. They do not establish audio level/restoration, full native/browser
parity, worst-case resources or real-hardware qualification.

`tests.hardwareStatus` remains `untested`; `tests.qualification` stays absent.
Publication must still fail. The module stays outside native discovery, public
catalog, compiler source inventory and the frozen eleven-module baseline. The
`qualification.example.json` documentation fields are populated; its null
measurements and pending hardware fields deliberately fail strict parsing.
The image identity there refers to the UI build, not a passed hardware run.

`npm run check` runs source identities/AST checks, draft exclusion and publication
rejection, README/PNG checks, synthetic protocol startup regressions and the
ordinary application checks/build. It never imports the draft native manifest
or runs firmware, DSP, audio, emulator or hardware qualification suites. The
synthetic capture tests use original fake input/card data and a small fake
protocol process; no Elektron firmware is involved.

## Capture build identities and isolation

| Input/result | SHA-256 or identity |
| --- | --- |
| Native source inventory | `86deed960c094df1d0d2a4a9d3a955a62e804175f2f22d8ac53f5eff141aeaca` |
| Locally verified base MAIN OS | `164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e` |
| Local capture MAIN OS | `a19a0bf4352a6ebf98546cf33f68e44cbd101757ec16b17ca44efdfa49215302` |
| Reviewed local `ot_emu` binary | `93484e4b71c70f48f795825103146a36ef95ef9ac06ee627e28608ae3e3bb3eb` |
| Reviewed SDK checkout | `504b602a770a085016a8a1b9fd1d5a4a3ba19981` |
| Local container image | `sha256:b6d07c32790744c38874da842380e766349a699103d2c1b88ff9d986b7a827fb` |

The native source hash uses `moduleNativeSourceSha256`: sorted relative native
file hashes, excluding documentation, licences, media, the website manifest and
the incomplete qualification template. Assembly is unchanged from upstream;
the textual import replaces two embedded stock spans with lazy local
address/length/SHA-256 guards. See the original/vendored file identities in
[the import record](../../imports/previewvol-906fc354.json).

Only Preview Vol and reviewed SDK tooling were staged into the private build
workspace. The draft manifest/assembly were evaluated and compiled inside the
existing local source-tools container, with no network, dropped capabilities,
no new privileges, a read-only container root, unprivileged UID/GID, CPU/memory/
PID limits and a temporary filesystem. No unreviewed source ran on the trusted
host. The reviewed host emulator operated the resulting private image.

Build profile: stock effects retained, fallback NONE, static stock enabled,
no dynamic loader, `XBUS=0`, `SPEC=0`, `DEV=0`, `BUILD=84`, `STATIC_STOCK=1`.
The local capture driver limited native discovery to Preview Vol plus reviewed
stock definitions, called the native `build_bus` oracle and read back both
six-byte detours. Each resolved to the linked authored stub that queues AMP VOL
64 and returns to its expected continuation: Static `0x4009429c`, Flex
`0x40096eb8`. The stock guards matched the user's verified local image.
This is a two-hook wiring check, not full composition/rejection or byte parity.

Only hashes and authored sources are retained. Firmware, built images,
project/card fixtures, generated sample files, raw LCD/RAM data and private logs
are temporary local inputs and do not enter this PR.

## Reproducing the LCD session

Use the reviewed SDK `tools/verify/verify_repitch.py` helpers `make_loop` and
`build_project`; do not run that module's qualification gates for UI capture.
Start with a disposable valid local project template and retain its fingerprint.
Generate an original two-second 440 Hz stereo sine: 44,100 Hz, signed 16-bit,
identical channels, `round(16000 * sin(2*pi*440*n/44100))`, 88,200 frames.
Name the local sample `AUDIO/PREVIEW_440_120.wav` and set its BPM to 120.

Set T1 to Flex, slot 1; T2 to Static, slot 1, in every bank A Part. Retain
exactly one `[SAMPLE]` entry per machine/slot, both pointing to
`../AUDIO/PREVIEW_440_120.wav`. Remove duplicate inherited slot-1 entries and
stage the matching sample; an unstaged inherited path produces an ERROR slot.
Set both marker records to trim 0..88,200, loop point 0, no slices, and update
the marker checksum. Enable sample looping and disable the first T1/T2 trig in
A01. Leave transport stopped. Use reviewed `ot_project` bank writers for
checksums and `emu_card` staging/FAT helpers for a 32 MiB disposable card under
`OCTABAM/RIG`. Capture record fixture fields contain template/project/card/tone
fingerprints, helper identities and the recipe; these inputs remain private.

```sh
python3 -B scripts/capture-module-ui.py \
  --emulator /local/reviewed/ot_emu \
  --image /local/private/mainos_bus.bin \
  --image-sha256 a19a0bf4352a6ebf98546cf33f68e44cbd101757ec16b17ca44efdfa49215302 \
  --card /local/private/capture-card.img --set OCTABAM --project RIG \
  --key-ms 50 --plan /local/private/plan.json \
  --output /local/reviewed-screenshots
```

Use the exact panel plan in [media/capture.json](media/capture.json): AMP,
encoder D down; T1 double-tap; hold/release FUNC+YES and CUE+YES; YES to enter
the Flex file browser; NO to leave; MKII AED for the sample editor; select T2,
then double-tap and select its Static slot. The tool validates the fixture
and referenced audio paths before launch, rejects duplicate sample slots, confirms native load/bank events, dismisses the date popup using
NO and refuses export if any startup window remains. It uses a temporary card
copy, checks the local image hash, keeps transport stopped and renders actual
128×64 LCD pixels at scale 6 with the monochrome palette. PNGs/metadata export
only after the complete plan succeeds.

The AMP image shows track VOL -64. Slot-list captures while holding main and
cue shortcuts have the same LCD pixels; the plan records the different keys,
but the screenshots alone cannot prove output routing or audio level. The
sample editor shows actual tabs and the selected slot name; its waveform/audio
rendering is not validated. The module has no dedicated switch/control page.
Images document existing preview access and the affected track AMP control,
not a newly introduced OT menu. MKI navigation still needs its own check.

## Historical emulator evidence

The pinned [preview analysis](https://github.com/repeat98/octamad/blob/906fc354536d9a1d6ccd90a87fcf3c1f6edb6488/docs/firmware/PREVIEW.md)
records ColdFire emulator observations from 16 September 2026. With a generated
440 Hz loop, T1 and no trig, Flex previews had RMS 515,375 and Static previews
513,054 at each tested AMP VOL (0/64/127); stock was silent at VOL 0. These
are historical fixture observations, not measurements of this adapted draft.

The pinned [verification tool](https://github.com/repeat98/octamad/blob/906fc354536d9a1d6ccd90a87fcf3c1f6edb6488/tools/verify/verify_previewvol.py)
declares two hook checks, Flex/Static equal-level cases (spread below 0.1 dB),
a Flex stop restoring VOL 0 and a silent stock control. Its command is
`python3 tools/verify/verify_previewvol.py [REMIX] --project <local-project>`
in the exact upstream tree. It skips port cases without a project/toolchain;
a skip is not passing evidence. Direct routine calls cannot establish physical
panel shortcuts or hardware timing. That upstream suite was not run for this
draft; it remains a reference, not an installed SDK gate.

## Evidence required before publication

- Worst-case ColdFire cycles per preview event and maximum supported load,
  with deadline/budget, scheduling overhead and headroom. Cover rapid preview
  start/stop, interrupted Flex/Static or Part/machine changes, all AMP endpoints,
  p-lock/LFO/MIDI CC/scene modulation and maximum streaming/audio/MIDI/USB load.
  Justify inapplicable controls without exempting affected stock control paths.
- Exact code/state/buffer/table/stack/heap/padding and shared regions, local
  build/link-map reconciliation, supported instances/events and peak lifetime
  totals. Account for reused stock pending AMP records; demonstrate bounded
  stack use and memory guards. Source length is not an allocation report.
- At least 60 continuous minutes on each claimed real MKI/MKII model with all
  eight audio tracks active. Bind actual tester/date, reproducible stress
  project, native source, module version and local tested image. Exercise
  maximum applicable MIDI/USB/FX/streaming load, modulation, repeated previews,
  mode/Part transitions, stop/start and cold-boot recovery. Require passed
  audio continuity, transport, controls, memory integrity and recovery checks.
- Confirm FUNC+YES/CUE+YES audio routes, Flex/Static level equality and ordinary
  track AMP VOL restoration after stop/interruption/reselection. Verify MKI
  editor access and owner review of all current captures/instructions. Screens
  establish access; they cannot substitute for audio or hardware observations.
- Native composition/placement/rejection and browser complete-file byte-parity
  for supported combinations, including approved playback modules. Preserve
  current published packages and the download pause while pending.

Populate `tests.qualification` only from actual sanitized local reports under
`evidence/` or TESTING.md. Recompute the native hash after final source changes.
Keep firmware, raw dumps, cards/projects and private logs temporary. Complete
contributor/rights/authorship verification with the owner. Owner inspection of
actual reports and PR merge remain required for release.
