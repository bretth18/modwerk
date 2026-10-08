# Modwerk Octatrack startup — 8 October 2026

The boot animation now traces the Modwerk frame clockwise, locks eight tiles
in from the center around the ring, and brings the ninth tile in with a short
comet tail. It reveals original geometric MODWERK lettering alongside the
assembly. The stock monochrome treatment, 2.8-second duration and both models'
LED choreography remain in place. The extra choreography uses the same 843
records; it adds no firmware bytes.

![Actual MKII firmware LCD capture of the Modwerk startup animation](media/startup/modwerk-startup.gif)

The preview uses complete frames read from the real firmware LCD plane. Its
final 600 ms hold is for reviewing the image; firmware timing is unchanged.
[Capture provenance](media/startup/capture.json) records the exact local image,
emulator and asset hashes. [Verification records](media/startup/verification.json)
bind the current sources and graphic bytes to the checks below. No firmware or
raw memory is published.

## Scope

Two original graphic tables are replaced: 5,058 bytes of particle records and
440 bytes of title ink. Boot, LCD renderer, LED and module instructions remain
byte-identical. Table extents and particle count are unchanged, with no added
flash/RAM allocation or sample-memory reservation. The startup artwork is
installed in static compositions, standalone MIDI Scenes, and the developer
dynamic-loader composition path. Both writes are guarded and checked before
any mutation.

See [the source and native encoder](../sdk/runtime/startup/README.md) and
`scripts/verify-startup-animation-native.mjs` for reproduction instructions.

## Passed checks

- Ten complete images matched the independent Python encoder byte for byte:
  core only, Repitch, Mini Verb, Tape Echo + Euclid, Analog BD, Sidechain
  Compressor, USB Audio + Quantizer, standalone MIDI Scenes, dynamic-loader
  Mini Verb, and direct static core composition with stock FX2.
- Against private complete-image baselines captured before the change, all ten
  final images had exactly the same length and identical bytes outside the
  two graphic tables, including every appended runtime byte.
- Both encoders rejected changed graphic tables; the browser rejected a
  repeated patch. Native guard failures created no partial output. Original
  inputs remained unchanged. Static graphics spans were disjoint from all
  other module/platform/logger writes in the tested profiles.
- All ten final images round-tripped through full firmware packaging with
  the owner's original local 1.40C container.
  Decoded MAIN bytes matched exactly; opaque tail and seed were preserved and
  the original firmware input remained unchanged.
- The standard emulator ran the full boot on MKI (core-only composition) and
  MKII (standalone MIDI Scenes) and reached normal playback after the animation.
  Complete-frame capture then recorded 70 MKI and 69 MKII frames. Both final
  LCD frames exactly matched all authored pixels, with identical PNG hashes.
- Twenty focused engine tests passed, including artwork extent/orientation,
  final silhouette, bounded delays, clockwise tile order and the late ninth
  tile/echo timing.
  On the focused PR checkout based on current `main`, all 1,191 repository
  tests in 180 files passed. ESLint, the full TypeScript check, SDK checks,
  generated-record checks and the production Vite bundle passed using
  Node 24.21.0 (`npm run check -- --base origin/main`).

## Limits

Physical startup/reboot and chip wall-clock timing remain untested. No loaded
project, Part save/reload, project save/load or restart retaining only card and
battery-backed RAM was exercised here. A boot to playback without a loaded
project does not establish any of those paths. The byte comparisons show that
this patch leaves module/runtime bytes intact; they do not upgrade earlier
stateful-module qualification or physical reports.

No hardware flashing or module qualification-status change was performed.
