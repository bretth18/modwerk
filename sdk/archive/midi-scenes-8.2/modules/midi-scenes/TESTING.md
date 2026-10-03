# MIDI Scenes testing

Version: `0.2.1-experimental`.

## Standalone author evidence (not Octamod qualification)

| Field | Value |
|-------|-------|
| Product | MIDISC2.0 standalone (author midisc repo) |
| Revision | `4f9a89453fdcdd39a3cd57f010ffa489cac721cd` |
| Reporter | module author (`bkkbrls-del`) — **author-reported** |
| Date | 1 October 2026 |
| Hardware | Elektron Octatrack (author unit; MK model not separately logged in this note) |
| Image | Desktop `MIDISC8.20.bin` / GitHub MIDISC2.0 rebuild path (`release20.json`) |
| Scenarios | Sequencer pattern commit / Direct Jump next-step; MIDI scenes follow ACT pattern Part immediately; no sequencer freeze after JSR+RTS sync cave |
| Result | Author reports expected Part/scene behaviour restored; sequencer no longer bricks |
| Limits | Author-reported only. No Octamod owner witness log, no MK serial, no automated on-device capture in this repo. Does **not** qualify Octamod browser/native composition of this module version. |

## Octamod pin (relocatable gas)

Octabam evidence pin: `363861e31ee963c478fab2b190a0fabe1d7ce37b` (1.40MIDISC8.2-derived gas). Historical OKMS1 / 0.1.1 loader-free matrix results apply to that earlier pin only.

## Integration status

Catalog/docs updated to MIDISC2.0; firmware builds remain pending for `0.2.0-experimental`. The existing relocatable packages still implement the earlier 8.2-derived pin and cannot qualify the documented 2.0 changes. Standalone MIDISC2.0 remains author-reported and separate from Octamod qualification. A relocatable 2.0 port and actual browser/native parity and rejection evidence are prerequisites for enabling this version.

## Historical gates

- `tools/verify/verify_midiscenes.py` (upstream record; not run for this metadata update).

## Before enabling firmware builds

- Port MIDISC2.0 into relocatable units (or equivalent stock-free recipe) for this SDK.
- Prove actual browser/native byte parity and rejection for each supported selection.
- Supply and review actual OT LCD captures with version/build/setup provenance and exact access instructions before publishing the UI update.
- Keep standalone author results separate from Octamod qualification.

## Review follow-up validation

The earlier contributor run used Windows / Node.js 22.22.0 and is not the required Node.js 24 validation. The later CI run at `0967b198925eb9b249d8f2c54efb144b0c46e2ba` failed a Windows-path assertion on Ubuntu; it did not complete the production build.

This follow-up retains exact README byte hashes using LF checkouts rather than weakening hashing with newline normalization. Path tests explicitly exercise POSIX and Windows rules on every host; filesystem tests cover nested/two-dot names, traversal and symlink/junction escapes. A Windows Node.js 24 job also validates module paths and source integrity.

Validated on macOS with Node.js `v24.21.0`, 1 October 2026, after integrating approved main `789de00a9cf189f16635af80569595b5b8dc6209`:

```text
npm run modules:check -- --base 3207fe39be49628f889938a44f82ea0410c6431b
# PASS: exact base recorded on PR #10; 11 module folders and version pins
npm run modules:check -- --base 789de00a9cf189f16635af80569595b5b8dc6209
# PASS: current approved main; only MIDI Scenes advances to 0.2.0-experimental
npm run check
# PASS: licence checks, module contracts, 7 SDK integrity/stock-guard tests,
# lint, 212 Vitest tests in 40 files, TypeScript checks and production build
```

The production preview was inspected in the actual browser at `#module/midi-scenes`: both `bkkbrls-del` and Sam Banks credits, `0.2.0-experimental`, the standalone MIDISC2.0 feature text and the pending-build notice were present. No firmware was selected or uploaded. POSIX/Windows lexical cases and real macOS symlink escapes passed locally; actual Windows junction coverage is checked by the dedicated CI job.

The vendored standalone README's exact SHA-256 (`d804ce0ae05bf69ffc63537606f9374358cdc1da3e6d864ef0dbdeba250e142e`) also matches the author's GitHub README at `4f9a89453fdcdd39a3cd57f010ffa489cac721cd`. The 8.2 assembly files and native manifest are unchanged. No submitted firmware source, firmware image, DSP/emulator/stress suite, relocatable 2.0 build or hardware test ran for this metadata follow-up.

## Actual OT UI captures — 1 October 2026

Publication version: `0.2.1-experimental` (captured draft `0.1.1-experimental`; native sources unchanged). The owner explicitly authorized pending-source execution
solely for local UI capture builds. A temporary SDK source snapshot combined
ANALOG BD, MIDI SCENES and SCALE QUANTIZER with stock FX, excluding SPRING REV
for Analog BD. `static_stock=True` retained stock DSP without the dynamic
stock-effect loader. The native builder was `tools/build/build_bus.py` from
the SDK tool pin; `media/capture.json` records the profile, exact module/author
pins, source-file hashes, build environment and local image/emulator hashes.

Build: a local wrapper supplies that `remix.schema.Remix` profile to
`remix.registry.remix`, then calls `build_bus.main()`. It ran under a macOS
sandbox with network access denied, user/shared temporary reads restricted,
writes confined to the private capture workspace and a clean environment.
Only a local verified 1.40C file was available to the native image builder.
No source-build automation received firmware.

Capture: `python3 -B scripts/capture-module-ui.py --emulator <local-ot_emu>
--image <private-mainos> --image-sha256 2e5abefa1484788a6953db45e111b266a1f31d810fb45fa7155104a9780e8d3e
--key-ms 50 --plan <recorded-panel-plan.json> --output <new-directory>`.
The exact plan and PNG hashes are retained in [media/capture.json](media/capture.json).
MKII panel, actual 128×64 LCD pixels at integer scale 6, stopped transport,
empty scratch FAT card, no samples, user projects or hardware connection.

- Actual MIDI CTRL 1 UI and scene-held value only; CHAN remains OFF with no external MIDI receiver.
- The capture does not qualify MIDI output, crossfader morphing, other pages, persistence, hardware or browser/native firmware parity.

Screenshots document the UI only; this documentation update does not change
existing composition support, pending status or hardware qualification.
Temporary stock-containing outputs, card/framebuffer files and logs are removed
after capture review; only PNGs and metadata are retained.

Publication metadata was synchronized with current main without changing native code.
The capture record preserves the original draft version and records the source-file
comparison binding these exact pixels to this documentation/media-only update.
