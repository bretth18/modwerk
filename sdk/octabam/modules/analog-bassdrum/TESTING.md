# Analog BD testing

Version: `0.1.2-experimental`. Octabam evidence pin: `363861e31ee963c478fab2b190a0fabe1d7ce37b`.

Upstream records exact render/state and source/AMP/effects checks on both cores. ANALOGBD1 ran on an MKI; the current engine browser, louder output and eight-track revision still await hardware qualification. See the repository’s docs/VERIFICATION.md for current Octamod composition evidence.

## Integration status

Octamod loader-free composition is implemented at this version. The native matrix covers all 256 subsets of the eight visible modules with stock FX2 omitted, plus 32 stock-FX2 profiles: 156 byte-identical OS compositions and 132 matching refusals. The actual production-bundle browser worker produced complete native-identical files for the six-module and Analog BD five-module combinations and rejected altered base firmware. GNU link proofs cover all 15 nonempty combinations of the four requested runtime groups. See docs/VERIFICATION.md for file identities, reproduction and coverage limits. No DSP execution, emulator, audio-render or stress suite was run.

## Historical gates

- `tools/verify/verify_analog_bassdrum.py` (upstream record; not run here).
- `tools/harness/bd808.py` (upstream record; not run here).
- `tools/harness/bd909.py` (upstream record; not run here).
- `tools/harness/verify_analog_bd_exact.py` (upstream record; not run here).
- `tools/harness/verify_analog_bd_levels.py` (upstream record; not run here).
- `tools/verify/verify_analog_bassdrum_cf.py` (upstream record; not run here).
- `tools/verify/verify_analog_bassdrum_port.py` (upstream record; not run here).
- `tools/verify/verify_analog_bassdrum_ui.py` (upstream record; not run here).

These gate references belong to the pinned upstream tree. Author encoder/regeneration tooling and the updated native builder are not all part of this trimmed SDK. Use the exact pinned upstream for reproduction in isolation; never run unreviewed code on a trusted host.

## Release and hardware requirements

- Review imported rights, source pins and authored code; owner merge approves this exact module version.
- Release automation must reproduce the committed source packages from the exact owner-merged commit.
- Recover every stock instruction/helper/table locally with fingerprint validation. Never put stock into automation or committed packages.
- Renew native and actual-browser parity and rejection evidence when composition code or module sources change.
- Record hardware limits separately; historical results do not qualify the imported revision.

Octamod 0.1.1-experimental: browser composition uses reviewed source packages and derives inherited bytes from local 1.40C. The native matrix passed 156 byte identities and 132 refusals. The owner reported both combined native test images working on 1 October 2026; detailed feature/load qualification is not claimed.

## Actual OT UI captures — 1 October 2026

Publication version: `0.1.2-experimental` (captured draft `0.1.1-experimental`; native sources unchanged). The owner explicitly authorized pending-source execution
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

- 808/909 selection and displayed control pages only; no sound, DSP load, hardware, save/reload or firmware parity qualification.

Screenshots document the UI only; this documentation update does not change
existing composition support, pending status or hardware qualification.
Temporary stock-containing outputs, card/framebuffer files and logs are removed
after capture review; only PNGs and metadata are retained.

Publication metadata was synchronized with current main without changing native code.
The capture record preserves the original draft version and records the source-file
comparison binding these exact pixels to this documentation/media-only update.
