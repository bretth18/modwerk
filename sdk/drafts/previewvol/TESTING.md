# Preview Vol testing

Draft version: `0.1.0-experimental`.
Source/evidence pin: `906fc354536d9a1d6ccd90a87fcf3c1f6edb6488`
([repeat98/octamad](https://github.com/repeat98/octamad/tree/906fc354536d9a1d6ccd90a87fcf3c1f6edb6488/modules/previewvol)).

## Current status

Source inspection and static import checks only. No imported Python/native
source was executed. No firmware, DSP, emulator or hardware test was run for
this Octamod draft. Source guards were adapted; native/browser parity for the
adaptation is unverified. `tests.qualification` is absent,
`tests.hardwareStatus` is `untested`, and `access.screenshots` is empty.
Publication gates must reject this version. It is outside the native registry,
public catalog, compiler source inventory and frozen eleven-module baseline.

`npm run sdk:check` checks byte identities, guard declarations and source hygiene
without evaluating this manifest. `npm run check` also checks the strict draft
schema, exclusion from production inputs and rejection by the qualification/UI
gates, then runs ordinary application tests and the production build. These
checks do not establish hardware qualification or firmware parity.

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
a skip is not passing evidence. The tool calls preview routines directly and
cannot verify physical panel shortcuts or hardware timing. No upstream gate
was run during this import; the tool is a reference, not an installed SDK gate.

## Evidence required before publication

- Worst-case ColdFire cycles per preview event and maximum supported load,
  with deadline/budget, stock/scheduling overhead and headroom. Cover rapid
  preview start/stop, interrupted Flex/Static or Part/machine changes, all AMP
  endpoints, simultaneous p-lock/LFO/MIDI CC/scene modulation, and maximum
  streaming/audio/MIDI/USB activity. Justify inapplicable module controls;
  absence of dedicated knobs does not exempt affected stock control paths.
- Exact code/state/buffer/table/stack/heap/padding and shared memory regions,
  build/link-map reconciliation, supported instance/event limits and peak
  lifetime totals. The two stubs reuse stock pending AMP records; account for
  that reuse and demonstrate guards/canaries and bounded stack use. Assembly
  source length is not an allocation report.
- At least 60 continuous minutes on each claimed real MKI/MKII model using the
  exact module/source/local-image identities and all eight audio tracks active.
  Record tester/date, project fingerprint and reproducible recipe, maximum
  applicable MIDI/USB/FX/streaming load, modulation, repeated previews, mode/Part
  transitions, stop/start and cold-boot recovery. Require passed audio
  continuity, transport, controls, memory integrity and recovery observations.
- Actual black-and-white LCD PNG captures from a qualified local image showing
  each preview access location and relevant AMP/preview settings, with precise
  panel/menu/stop instructions and `media[].otUi` version/build/setup identity.
  Verify FUNC+YES, CUE+YES, both output routes, Flex/Static slot lists, file
  browser and audio editor. Confirm normal track AMP VOL restoration after
  both Flex and Static previews and interruption/reselection cases.
- Native compatibility/placement/rejection and browser full-file byte-parity
  evidence for supported combinations, including approved playback modules.
  Preserve the current published packages and download pause while pending.

Use sanitized local text reports under `evidence/` or this file to populate
`tests.qualification` only after actual testing. Recompute the native source
hash after final source changes. Keep firmware, LCD/RAM dumps, card/projects
and private logs local and temporary; only reviewed screenshots and metadata
enter module media. Confirm contributor rights and precise authorship with the
owner. Owner verification of actual reports and merge are required for release.
