# CC Map

Version: `0.1.0-experimental` · author: Sam Banks (@sambanks).

Requested on 2 October 2026. **Source draft only.** Publication and firmware
builds require qualification, actual LCD captures, integration and owner review.
This folder is outside `sdk/octabam/modules/`: native discovery, the public
catalog and source-package compilation cannot pick it up. The eleven-module
qualification baseline is unchanged.

## Overview

CC Map receives MIDI CC messages on audio tracks' assigned channels and maps
CC 68–73 to FX1 page-2 slots 6–11. The upstream CC 62–67 block targets FX2
page-2 slots 6–11 **only for BusDelay and BusVerb**. Those two engines are
outside Octamod's scope and are not imported here. Do not advertise that block
as support for stock FX2, Mini Verb, Tape Echo or another catalog effect.

The handler respects AUDIO CC IN, writes every audio track matching the
channel, clamps values using the relevant counts and sets Part dirty flags.
CCs outside 62–73 pass to the next handler. CCs inside that range are consumed
even when AUDIO CC IN is disabled or the track has no eligible effect.

## Controls

| Incoming CC | Target | Eligible effect |
|---|---|---|
| 62–67 | FX2 page-2 slots 6–11, respectively | BusDelay / BusVerb only; outside scope |
| 68–73 | FX1 page-2 slots 6–11, respectively | Non-NONE FX1; descriptor min/count clamps |

There is no added effect chooser row or independent set of knobs. Meanings
and ranges depend on the selected effect. Hardware confirmation of supported
FX1 pages, parameter labels and limits is still required. Sustain and other
pedals may send CC 64–67 without an explicit controller assignment.

## Usage

These are upstream-described prerequisites, not verified Octamod panel steps.
Exact button/menu paths and current-version LCD evidence must be added before
publication. The automatic USB no-UI exception does not apply.

### Try an FX1 page-2 parameter after qualification

1. Enable AUDIO CC IN in the project's MIDI control settings and assign the
   target audio track a trig channel matching the external controller.
2. Select a non-NONE FX1 effect and inspect its second-page parameters. Send
   CC 68 on that channel to address the first page-2 slot, with a value within
   the effect's documented range.
3. Confirm that the expected parameter and sound change, that no unrelated
   track changes, and that Part save/reload retains the result. Repeat for
   CC 69–73 and for the documented minimum/maximum values.

Do not execute this draft on a trusted host or use it as a flashable build.
Qualification work uses reviewed source in isolation and local firmware only.

## Compatibility and limitations

The native declaration targets OS 1.40C and uses a floating ColdFire cave plus
one MIDI dispatch-vector replacement. It has no DSP algorithm or effect ID.
All Octamod combinations, hook placement and browser packaging are unverified.

The default `CC_NEXT` is stock's CC handler; `CC_MODEDEF1/2` default to a stock
return instruction. Upstream can override these for its SCENES KITS bridge
and MODE DEFAULTS. Neither module is imported or enabled here. OctaKit,
MIDI Scenes, USB MIDI and Scale Quantizer interoperability needs separate
review; upstream remix results do not prove Octamod compatibility.

Upstream leaves FX2 support outside BusDelay/BusVerb, hardware SCENES KITS
chaining and hardware FX1-to-DSP updates on THRU tracks open. Controllers'
standard pedal messages overlap the claimed CC range. Exercise those cases
and channel-sharing behavior in the eventual qualification project.

## Tests and measurements

See [TESTING.md](TESTING.md). Source integrity and metadata checks do not run
the imported manifest, assembly, firmware, DSP, emulator or hardware tests.
Upstream's historical MKII notes and emulator gates are retained in
[OCTABAM.md](OCTABAM.md); they do not qualify this Octamod version.

The authored oracle contains 712 code bytes and 12 count-table bytes. This
724-byte static reference is not an exact linked-memory total: placement,
padding, stack peaks, shared firmware state and maximum workload need actual
reports. Worst-case cycles and real-time budgets are unmeasured.

## Authorship and licences

[Sam Banks' octabam source](https://github.com/sambanks/octabam/tree/8d0ad6f4f82c2efbc10e1c65eefbce0ad1cec4bf/modules/cc-map)
is pinned to `8d0ad6f4f82c2efbc10e1c65eefbce0ad1cec4bf` under the full
[MIT licence](LICENSE). The assembly and upstream notes are unchanged.
The manifest has one documented adaptation: its stock dispatch expectation
uses a lazy address/length/hash guard, resolved from locally verified 1.40C.
The authored hand-assembled cave oracle is original module code, not a copied
stock routine. [Import identities](../../imports/cc-map-8d0ad6f.json) retain
both upstream and vendored hashes and the exact transformation.

Only source, documentation and the licence are included. No firmware,
extracted routines/tables, generated native output or media is imported.
The import preserves the upstream MIT notice; contributor declaration and
owner/reviewer verification of source rights and reports remain required
before publication. Review is not automatic legal clearance.

## Screens and audio

No screenshots or audio previews are supplied. Capture actual enable/location
and relevant effect control pages from hardware or a working emulator; keep
version, local-image hash and setup provenance in `access.screenshots` and
`media[].otUi`. Release documentation requires real monochrome PNGs matching
the online style. Never substitute mockups, reconstructed labels or failed
loads. Firmware, raw LCD/RAM dumps and project/card fixtures stay local.

Promotion to `sdk/octabam/modules/cc-map/` needs a complete
`tests.qualification`, full UI/documentation evidence, reviewed integration
and an owner-merged PR. Do not add this draft to the frozen baseline.
Every subsequent source, documentation or media update needs a higher module
semantic version. Real browser/native byte parity and rejection evidence are
additional requirements before firmware builds can include it.
