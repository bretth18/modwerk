# Preview Vol

Version: `0.1.0-experimental`. Source repository: [repeat98/octamad](https://github.com/repeat98/octamad/tree/906fc354536d9a1d6ccd90a87fcf3c1f6edb6488/modules/previewvol).

Requested on 2 October 2026. **Source draft only.** This module is outside native
discovery, the public catalog and firmware package compilation until the current
qualification/UI gates and owner review are complete. The existing eleven
module versions and frozen baseline are unchanged.

Sample previews use the default AMP VOL (internal value 64, displayed as 0),
regardless of the active track's AMP VOL. FUNC+YES previews through main;
CUE+YES previews through cue. The track's own AMP VOL returns when the preview
stops. Track FX (unless PREVIEW WITHOUT FX), main/cue LEVEL and mixer volumes
still apply. Samples with different recorded loudness can still sound different.

## Source, licence and attribution

The requested local folder contained only `__pycache__`. The three authored
module files were recovered from published octamad commit
`906fc354536d9a1d6ccd90a87fcf3c1f6edb6488`; no compiled Python cache was used.
[The import record](../../imports/previewvol-906fc354.json) binds original Git
blob/SHA-256 identities to each vendored file and records the two stock guards.
[OCTAMAD.md](OCTAMAD.md) preserves the original README; [LICENSE](LICENSE)
preserves the full MIT notice, including Sam Banks' copyright. `repeat98` is
the source repository maintainer and snapshot committer. The native declaration
does not identify a module author; confirm precise authorship and issue routing
with the owner before publication, and retain all required credits.

`previewvol.s` is unchanged. In `manifest.py`, the two embedded stock expectation
spans become lazy address/length/SHA-256 reads through the existing
`remix.stock_guard` helper. The native oracle must verify this adaptation against
the user's own local 1.40C. Only authored source, documentation, licence and
fingerprints are included. No imported source was evaluated; no firmware,
extracted stock, build outputs, screenshots or other modules were imported.
Native paths describe the eventual `modules/previewvol/` location: the draft
is deliberately not a standalone runnable module.

## Quick tutorial and access

These instructions reflect the pinned upstream notes, not a new panel test.
Exact navigation and stop steps for each entry point and supported panel must
be captured and verified before publication.

1. In a qualified local test build, select an audio track and open a Flex/Static
   sample slot list, the file browser or audio editor. Select a sample.
2. Press FUNC+YES for a main preview, or CUE+YES for a cue preview. Turn the
   active track's AMP VOL down and repeat; auditioning uses the default AMP VOL.
   Track FX, track levels and mixer volumes still affect the output.
3. Stop the preview and verify that playback uses the track's own AMP VOL again.
   Repeat with both Flex and Static samples, main/cue routing and each entry
   point. Do not infer hardware or panel support from direct emulator calls.

There is no separate effect chooser entry, enable menu or module knob. Actual
captures of the preview entry points, AMP page and relevant preview settings
are still required. The automatic USB no-UI exception does not apply.

## Promotion requirements

[TESTING.md](TESTING.md) separates historical emulator observations from missing
Octamod qualification. Before promotion, supply measured worst-case ColdFire
cycles, an exact memory map/total, at least 60 minutes of real MKI/MKII stress
testing with all eight audio tracks active, and actual black-and-white OT UI
PNG captures with version/build/setup provenance. Complete the
[qualification template](../../../public/module-qualification.example.json)
from actual results and synchronize its tutorial/screenshots with this README.
Record contributor rights declarations and owner verification of authorship,
source/media and reports. Review is not automatic legal clearance.

Verify hook ownership, placement/rejections and actual browser/native byte
parity for supported combinations before adding the version to the catalog or
enabling firmware builds. Move to `sdk/octabam/modules/previewvol/` only through
a qualified owner-reviewed PR; owner merge approves that version. Every later
source, documentation or media change requires a strictly increased semantic
version. Never expand or regenerate the frozen qualification baseline.
