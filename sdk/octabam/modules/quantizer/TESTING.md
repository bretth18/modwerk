# Scale Quantizer 0.1.3 testing

Version: `0.1.3-experimental`. Tested native-source SHA-256:
`281cefd2fc8bddc48bed5a0f9dd7b476d31f2a2dfd80f44d041249c35c17ba5b`.

## MIDI trig-mode regression — 11 October 2026

Issue [#181](https://github.com/repeat98/modwerk/issues/181) reports a freeze when
changing MIDI trig mode with FUNC+DOWN. The standalone 0.1.2 private image
reproduces an `illegal` stop on the emulated MKI panel after holding FUNC+DOWN
through a popup redraw. Stock OS 1.40C passes the same plan; current FM Synth's
bundled Quantizer passes on the emulated MKII panel.

The old audio-only octave detour begins at `0x400449b8`. Stock MIDI branches
to `0x400449be`, inside that replacement, bypassing the number argument push.
The drawer then removes nine arguments after only eight were pushed. Version
0.1.3 moves the detour to the common argument push and keeps the preloaded MIDI
octave and stock format. Audio scale/root formatting retains its existing path.
This follows the fix already present in the bundled FM Synth Quantizer.

The repaired standalone MAIN image SHA-256 is
`1ceba9f613dcf0d6bb6c32b0ae18e82a399e42644a89b2f76d9088c18c255c15`.
The ELF/guard packages were built from this checkout in `modwerk-source-tools`.
The baseline 0.1.2 MAIN SHA-256 is
`0c19b209f329b6e9051248e4de5a34c55b75678c8b562849b5b4571115c28d72`.
No firmware, stock bytes, card images or raw dumps are committed.

The held-popup plan is: wait 1000 ms; press MIDI; hold FUNC then DOWN; wait
300 ms and capture; release DOWN; press DOWN twice; wait 300 ms and capture;
release FUNC. Each key transition advances 150 emulated milliseconds. It
passes on both MKI and MKII panels with the repaired image. Brief taps alone
missed the old failure, so holding through redraw is essential.

The reviewed Linux emulator SHA-256 is
`2e388ae83925016f06785a4f62728c9e33ed5a1ea9be976c0be719f706e26e4b`.
It runs with DSP enabled in a network-disabled, read-only Docker container,
256 MiB shared memory and a disposable empty card. No physical unit is involved.

The expanded MKI regression holds FUNC+DOWN and FUNC+UP on each of the eight
MIDI tracks, then returns to audio T1 and T5. All emulator runs finish normally
and both audio panels remain responsive. This adds panel coverage, without
claiming audible audio or physical track isolation.

## Native/browser composition

[The 126-selection record](../../../native-comparisons/quantizer.json) contains
53 matching module-owned images, 73 matching refusals and zero mismatches.
The full byte comparison accounts for separately reviewed platform writes; none
are identical outright. Changed base firmware is refused. Every source package
is rebuilt without firmware. The Quantizer composition rule reviews its new
hook and exact declaration signature; it preserves POLY8's existing source and
FM Synth's bundled Quantizer selection. No new mixed-runtime behavior is claimed.

Reproduce with Node 24 and the private original stock update:
`npm run module:verify -- quantizer --os <local-1.40C.bin> --jobs 8`.
UI/regression reproduction uses `scripts/capture-module-ui.py` and the plan
in [media/capture.json](media/capture.json). Each kept PNG is visually reviewed.

## Hardware steps for this private candidate

Use only the private **QUANTIZER_0.1.3_PRIVATE.bin** update bound to the above
source and MAIN hashes. Keep the official 1.40C restore update available and
back up the project/card before flashing. Test a disposable project first.

1. On each of the eight MIDI tracks, hold FUNC and repeatedly press DOWN and
   UP, pausing on each trig-mode popup for at least a second. Enter and leave
   CHROMATIC and QUICK MUTE, then confirm the panel and transport still respond.
2. Return to audio mode. Use Flex/Static tracks T1 and T5 with different samples
   and PTCH locks; set SCALE OFF, then MAJOR and ROOT C/F#. Play both chromatic
   octave positions. Confirm stock behavior when OFF, scale/root display and
   audible pitch when enabled, and track isolation when editing either track.
3. Save each Part and the project, change pitch/locks and scale/root, then reload
   the saved Part/project. Check restored values, assignments and working audio.
4. Save again, power the physical unit off and on, load the saved project and
   repeat the MIDI popup and audio checks. Report the model, candidate filename,
   exact steps and observed results, including failures. Emulator loading is not
   evidence of a physical reboot.

Hardware status is **untested**. Current-source physical reboot, audible audio,
maximum load, chip worst-case cycles and complete lifetime memory/stack bounds
have not been measured. This software regression does not qualify those paths.
Publication requires version/source-matched evidence or an explicit owner
exception; historical approval is not extended to this source.

## Historical evidence


Historical version: `0.1.2-experimental`. Octabam evidence pin: `363861e31ee963c478fab2b190a0fabe1d7ce37b`.

Upstream records pitch/lock/key, ROOT, save/load and warm-boot checks, and MKI operation through the v2.9 line before its last two fixes. Those last fixes are emulator-verified. This import pins octatrick-modules v2.9.

## Integration status

Octamod loader-free composition is implemented at this version. The native matrix covers all 256 subsets of the eight visible modules with stock FX2 omitted, plus 32 stock-FX2 profiles: 156 byte-identical OS compositions and 132 matching refusals. The actual production-bundle browser worker produced complete native-identical files for the six-module and Analog BD five-module combinations and rejected altered base firmware. GNU link proofs cover all 15 nonempty combinations of the four requested runtime groups. See docs/VERIFICATION.md for file identities, reproduction and coverage limits. No DSP execution, emulator, audio-render or stress suite was run.

## Historical gates

Quantizer behavior is covered by the upstream octatrick remix/virtual-panel checks; no standalone gate is declared in its manifest.

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

- Menu navigation and visible SCALE selection only; no pitch, keyboard, glide, persistence, hardware or firmware parity qualification.

Screenshots document the UI only; this documentation update does not change
existing composition support, pending status or hardware qualification.
Temporary stock-containing outputs, card/framebuffer files and logs are removed
after capture review; only PNGs and metadata are retained.

Publication metadata was synchronized with current main without changing native code.
The capture record preserves the original draft version and records the source-file
comparison binding these exact pixels to this documentation/media-only update.
