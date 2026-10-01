# OT UI screenshots for module publication

Every new module and update needs actual OT UI captures that explain where it
lives and how to reach it. Capture the module's chooser or enable location and
all relevant main, setup and control pages. One screenshot can cover both
location and controls when both are visible. Document alternate entry points,
machine/track prerequisites and hardware differences when applicable.

Use hardware LCD photographs/captures or the headless emulator's actual
framebuffer. Preserve the rendered pixels and use readable integer scaling.
Do not reconstruct labels, redraw the interface, generate mockups or present
an illustration as an OT capture. A selection cursor alone does not prove that
the module loaded: confirm it, then capture the resulting controls. Review
every image for error popups, stale parameters and unrelated UI.

## Manifest contract

`octamod.module.json` schema 2 accepts this additive `access` section. It is
required by PR publication checks for new or changed module folders and modules
newly added to the published catalog. An empty
`screenshots` list is allowed while developing a draft. Unchanged existing
publications remain readable.

```json
{
  "access": {
    "location": "Audio track FX2 SETUP; Mini Verb in the effect chooser.",
    "steps": [
      "Select an audio track with its TRACK key.",
      "Hold FUNC and press FX2 to open FX2 SETUP.",
      "Turn LEVEL to Mini Verb and press YES to assign it.",
      "Press FX2 to close SETUP and use DECAY, DAMP, MIX, MOD and RATE."
    ],
    "screenshots": ["media/ot-location.png", "media/ot-controls.png"]
  }
}
```

Each referenced path must be a declared hardware/emulator image in `media`,
with caption, meaningful alt text, credit, licence and `source` (`original` or
an HTTPS attribution URL). Add `otUi` to that media entry:

```json
{
  "page": "FX2 SETUP",
  "shows": "location",
  "firmware": "1.40C",
  "moduleVersion": "0.1.2-experimental",
  "imageSha256": "<64 lowercase hex digits: hash of the local MAIN OS build>",
  "setup": "Headless ot_emu, MKII panel, stopped transport; actual LCD pixels."
}
```

`shows` is `location`, `controls` or `location-and-controls`. Publication checks
require location evidence and, for modules declaring controls, control evidence.
Capture versions must match the manifest. The reviewer must additionally check
all relevant pages, current labels/behavior, instructions, authenticity and
rights. Metadata checks cannot establish those facts. Keep README instructions
and TESTING capture records synchronized with the manifest and version pin.

For a documentation/media-only version update, existing actual captures may be
reused only after comparing every native source file with the captured revision
and verifying that the relevant UI is unchanged. Preserve original pixels,
capture date, image hash and captured draft version in the capture record;
record the source-file hashes and publication-version binding. Do not relabel
old UI after a native source or control change. The reviewer checks this
binding as well as the current access steps.

An automatic USB module with no OT controls or dedicated OT page must explain
that fact in `access.noUiReason`, keep `screenshots` empty and document its
actual host/device access steps. Owner review verifies this narrow exception;
do not invent a menu or use unrelated stock pages as evidence.

## Headless capture workflow

Use a reviewed, locally built `ot_emu` and a local MAIN OS build from your own
verified 1.40C. Native development and compilation follow the existing SDK
review/isolation rules. Never run pending/unreviewed sources on a trusted host.
This script operates an existing image; it does not build source, qualify
hardware or enable configurator downloads.

Create a JSON panel plan using `press`, `encoder`, `wait` and `capture` actions.
For scene editing, `hold` keeps panel keys down while turning an encoder;
`release` must release those keys before the plan ends. For example:
`{"hold":["SCENE A"]}`, `{"encoder":{"name":"A","delta":4}}`,
`{"capture":"ot-scene-lock.png"}`, `{"release":["SCENE A"]}`.
The supported UI keys also include `SCENE B`, `TRIG1`–`TRIG16`, MKII `AED`,
`PUSH A`–`PUSH F` and `PUSH LEVEL` for physical encoder presses.

Example effect plan:

```json
[
  { "wait": 3000 },
  { "press": ["YES"] },
  { "wait": 2000 },
  { "press": ["NO"] },
  { "press": ["FUNC", "FX2"] },
  { "encoder": { "name": "LEVEL", "delta": -20 } },
  { "encoder": { "name": "LEVEL", "delta": 1 } },
  { "press": ["YES"] },
  { "capture": "ot-location.png" },
  { "press": ["FX2"] },
  { "capture": "ot-controls.png" }
]
```

This example assumes a fresh empty project and a chooser with Mini Verb as its
first effect. Adapt the plan to the actual build and inspect the results; menu
order depends on the composition. The first actions dismiss the initial date
prompt on a fresh emulator session. A custom card/project may boot differently.
Use `--key-ms 50` for track double taps; the default down/up interval is 150 ms.
The selected interval is recorded as `keyMs` in the capture metadata.

```sh
python3 -B scripts/capture-module-ui.py \
  --emulator /local/path/ot_emu \
  --image /local/private/mainos.bin \
  --image-sha256 <expected-local-image-sha256> \
  --plan /local/path/capture-plan.json \
  --output /local/path/new-screenshot-directory
```

By default the script stages an empty scratch card, boots the MKII panel, runs
the DSP cores needed for normal effect selection, keeps transport stopped and
exports the firmware LCD including popup windows through `lcd_view.py`.
`--mki` selects the MKI panel; `--card` accepts a private local fixture.
On macOS the emulator needs shared-memory access. Do not capture a failed load
as a successful control page or bypass selection guards to manufacture it.

The output contains PNGs at six times the 128×64 LCD resolution and a
`capture.json` record with image/emulator hashes, panel plan, setup and screenshot
hashes. Review the pictures, then copy only these files into the module's
`media/` folder and declare the PNGs. Record module version, source identity,
build/capture commands, configuration and limitations in TESTING.md. Capture
records must contain no firmware bytes, raw LCD/RAM dumps, card images, samples,
personal project names, credentials or private emulator logs. Temporary card
and framebuffer data are removed by the script.

## Rights and release review

Provide an accurate contributor declaration for original captures and preserve
underlying Elektron/third-party rights and attribution. An original photograph
or framebuffer export does not make every depicted UI element yours to license.
Retain the applicable media licence/declaration and have the reviewer verify
reuse rights; review is not automatic legal clearance.

PNG/JPEG/WebP images are limited to 5 MiB each; audio previews remain optional
(12 MiB for WAV/MP3/Ogg); at most eight declared media assets per module.
Submit source, instructions, screenshots and evidence together through a PR,
increase the module semantic version and synchronize `sdk/catalog.json`.
Run `npm run modules:generate`, `npm run check` and
`npm run modules:check -- --base origin/main` on the latest revision. Owner merge
approves the version; pending/rejected updates preserve the current publication.
Capturing the UI does not establish audio safety, native/browser parity or
hardware qualification, and never authorizes uploading firmware.
