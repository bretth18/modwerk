# MIDISC2.0 build verification

Version `0.2.4-experimental`; source `bkkbrls-del/midisc`
`4f9a89453fdcdd39a3cd57f010ffa489cac721cd`, `tools/midisc/release20.json`.
The native remixer still pins the old 8.2 author dependency; this release
cannot inherit that port's acceptance, relocation or selection matrix.

## Completed local checks

The author release recipe SHA-256 is
`a2dbe20d82de8bd3a4f010c1e94c4b2ebf080ca3f7203521053f747b52dc24a1`.
The local original MAIN OS is 1,112,560 bytes with SHA-256
`164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e`.
The author's 843 sparse writes were applied in a private network-disabled
macOS sandbox. The full result matched his pinned MAIN OS SHA-256:
`debb24090cada4be00bc70880136f14e813b0d3a9018b516f922d33671bd9b87`.

The converted stock-free recipe uses 85 disjoint guarded regions. It references
unchanged destination bytes and matching stock spans instead of retaining
their contents. Its 5,848 literal changed bytes and 3,179 locally reconstructed
bytes produce exactly the same full author image. Every protected destination,
inherited span, input and output is fingerprinted. The native adapter resolves only against local stock during private verification.
Source-build automation binds the recipe inventory without evaluating it.

The native adapter's 85 guarded Pokes were separately resolved and applied
inside the restricted sandbox. Their result equals the direct reconstruction
and the author's full MAIN hash; a changed base was refused. For the historical 0.2.3 draft, re-importing the
pinned raw author recipe with `scripts/import-midi-scenes-recipe.py` reproduces
the committed stock-free recipe SHA-256
`0172203121018ca77ec62cac038c8e5edf4b0070db20e0e213435180ff95b4ed`.

`scripts/verify-midi-scenes-native.mjs` compares the browser reconstruction
against that exact author identity, refuses modified stock and three corrupt
recipes, and verifies the original input is unchanged. It writes no firmware.
An actual in-app-browser worker repeated standalone reconstruction and changed
base/corrupt-guard rejection on 2 October 2026: full MAIN byte parity passed;
output bytes were not downloaded, uploaded or retained by the page.

Full standalone update packaging passed in Node and the actual browser worker
on 3 October 2026. The reviewed `scripts/native-container-oracle.c` with the
unchanged native firmware tool encoded the ELEK container; the SDK's independent
`tools/build/make_bin.py` encoded ELUP with the original stock seed. The browser
engine matched both full byte arrays. Version header: `MIDISC2.0`.
ELEK: 449,404 bytes, SHA-256
`569368499581905c33e9874b87678acd1c2fc571ca6171c0e20b3e39b74892f8`.
ELUP: 449,420 bytes, SHA-256
`d7c792e0ec9b28e1b674e92526b2fa9a8a8279655dbd66a7b59495e5d5c54007`.
Round-trip MAIN equality, corrupted/truncated update rejection and unchanged
input checks passed. [packaging.json](evidence/packaging.json) retains tool and
output identities only; private firmware outputs are removed after verification.

The same private diagnostic checks thirteen current selectable single-module
companions against the 2.0 fixed regions. Every companion overlaps at least
one author region. See [compatibility.json](evidence/compatibility.json).
This detects collisions; it does not approve a mixed configuration or establish
that removing those writes would preserve behavior. No overlap was bypassed.

Reproduce privately using Node 24:

```sh
node scripts/verify-midi-scenes-native.mjs /private/local/1.40C-MAIN.bin --compatibility
node scripts/verify-midi-scenes-packaging.mjs /private/local/OCTATRACK_OS1.40C.bin
python3 -B scripts/import-midi-scenes-recipe.py /private/local/release20.json /private/local/1.40C-MAIN.bin --output /private/local/source-recipe.json
```

Use the captured author pin and stock fingerprint. Keep native module/source
execution inside the documented network-disabled temporary sandbox; read
access is restricted to source/tools/local base and writes to the private work
directory. No firmware-dependent command runs during `npm run check`.

## Real OT UI

`scripts/capture-module-ui.py` drove the actual MIDISC2.0 image at the exact
hash above, using a reviewed local `ot_emu`, MKII panel, stopped transport,
empty disposable FAT card, 50 ms key down/up and integer scale 6. Eight
visually reviewed monochrome exports show channel setup, controller 74,
enabled CC1 at 0, Scene A held at 64, release back to 0, ARP, LFO and
CONTROL 2. The complete capture run was made on 3 October 2026.

```sh
python3 -B scripts/capture-module-ui.py --emulator /private/local/ot_emu \
  --image /private/local/mainos.bin \
  --image-sha256 debb24090cada4be00bc70880136f14e813b0d3a9018b516f922d33671bd9b87 \
  --key-ms 50 --plan /private/local/panel-plan.json --output /private/local/captures
```

The exact plan, emulator identity, image identity and PNG hashes are in
[media/capture.json](media/capture.json). No RAM patches or internal menu calls
were used to manufacture screens. CHAN remains OFF; no external MIDI receiver
or physical OT is connected. The CTRL 1 SETUP screen includes SCNCTRL5, a
version-specific difference that needs complete control documentation/testing.

## Measured emulator evidence

The explicitly requested emulator measurements are in
[evidence/emulator.md](evidence/emulator.md), with per-fixture counters in
[evidence/focused.json](evidence/focused.json) and exact tool/build identities
in [evidence/emulator.json](evidence/emulator.json). The private harness measures
360 helper fixtures, compares measurement/reference behavior, drives the actual
panel and playback, and records audio stems and MIDI UART0 counters. It also
verifies the 73,728-byte scratch boundary change at two independent operands.
Read the workload/coverage and timing-model limits before interpreting maxima.
No firmware-dependent command was added to application checks.

The promoted version `0.2.4-experimental` retains the identical author MAIN and
screenshot pixels. The unchanged emulator reports retain their historical
`0.2.3-experimental` identity; the new build approval binds this release.

## Hardware report

The owner accepts reported operation on a real unit; see
[evidence/hardware.md](evidence/hardware.md). No maximum-load, cycle, stack,
canary or direct physical-unit measurement was supplied to this task. Keep
reported evidence distinct from verified measured hardware qualification.

## Remaining evidence limits

The emulator observations do not bound hardware timing or all memory use.
SCNCTRL5, arbitrary control endpoints and persistence paths are not fully
qualified. The owner's exact build approval below accepts the documented
hardware timing and full memory unknowns without changing those claims.
The standalone restriction resolves the known composition collisions.
`qualification.example.json` retains unknown results. The eleven-module
baseline and two existing utility waivers remain untouched.

## Exact owner-approved build release

On 3 October 2026 the owner explicitly approved enabling firmware building
without hardware timing and complete memory bounds. This is recorded in
[evidence/build-approval.json](evidence/build-approval.json) and independently
pinned by `sdk/midi-scenes-build-approval.json`. It covers only
`0.2.4-experimental`, this complete module folder and the unchanged author MAIN.
The historical `0.2.3-experimental` measurements remain labelled as measured;
metadata-only promotion changes no author instructions or image identity.
Unknown timing and full memory bounds remain unknown. The original monochrome
captures identify the same image. Native 8.2 sources are archived outside
module discovery; browser/native proofs for that port are not reused here.

The supported configuration contains only MIDI Scenes. The shared worker
reconstructs the guarded author recipe before existing ELEK/ELUP packaging,
uses version header MIDISC2.0, and refuses every mixed configuration before
writing bytes. It applies no chooser, generic runtime or DSP remixer overlays.
Stock remains local and is never present in source-build automation. This
explicit owner approval does not alter the frozen baseline, utility waivers
or requirements for other modules or future MIDI Scenes versions.

## Shared production-worker proof

The private `scripts/verify-midi-scenes-worker.html` harness imports the actual
production worker, reads local original 1.40C through its file picker and saves
no firmware. On 3 October the validate/build requests passed with both stock
menu options; MAIN and full update identities matched the independent native
oracles above. All thirteen mixed selections, modified and truncated bases,
a build after failed inspection and a build after clear were refused. The
input remained unchanged. The final release identities and this result are in
[evidence/build-approval.json](evidence/build-approval.json). This developer
harness is excluded from the production build and ordinary application checks.
