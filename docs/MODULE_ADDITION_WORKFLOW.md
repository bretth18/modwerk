# Adding or updating a module — agent workflow

This is the standard execution workflow for Codex and other repository agents.
When the owner asks to add/update a module, **carry out the steps below**, using
this repository's tools. Deliver the source, thumbnail, complete documentation,
practical tutorial and actual screenshots together in a focused PR. A source
import or an explanation of how the owner could capture screenshots is not a
finished addition. Complete every locally available step before reporting an
external blocker. “Automatic” here means the agent follows this workflow;
firmware and pending native source never enter CI.

Read the repository instructions, [module contract](MODULE_REPOSITORIES.md),
[UI capture rules](MODULE_UI_CAPTURES.md) and
[qualification gates](MODULE_QUALIFICATION.md) and
[resource-gauge contract](MODULE_RESOURCE_GAUGES.md). Those contracts remain the
publication authority; this workflow does not waive them.

## 1. Isolate the requested work

Inspect Git status, attached worktrees, current main and existing PRs. Reuse the
task's suitable isolated worktree or create one on current main, with a
`codex/` branch. Keep parallel work and unrelated changes out of the diff.
Confirm the owner requested this module: do not import neighboring modules just
because they appear upstream. Keep necessary SDK infrastructure narrowly scoped.

Pin the upstream commit and any author dependency commits. Inspect native
manifests, runtime recipes, README, TESTING and licences as text before running
anything. Preserve authorship, complete licence notices and per-file identities
in `sdk/imports/`; identify conflicts and runtime stock dependencies explicitly.
Never import firmware, extracted stock instructions/tables, generated binaries,
private cards/projects or unrelated repository history.

Use Node 24. For original modules, `npm run module:new -- <id> --kind dsp|coldfire
--author <handle>` creates the standard files. Use `--output sdk/drafts` when a
new module cannot yet meet publication gates. Imported pending modules also live
in `sdk/drafts/<id>/`, outside native discovery and the public catalog. Preserve
an existing approved version while its update is pending. Increase semantic
version for source, documentation and media changes; synchronize every version
pin and evidence binding. Never expand the frozen eleven-module baseline.

## 2. Build a useful module page and thumbnail

Write populated README sections: Overview; Controls; Usage; Compatibility and
limitations; Tests and measurements; Authorship and licences; Screens and audio.
Describe every active/inactive control, default/range/mode, prerequisites,
exact buttons/menus, panel differences, reset/reload and known limitations.
Keep `octamod.module.json` synchronized with the native controls and README.

Include a short named tutorial with at least three ordered steps: setup and
selection; a useful control example; expected result and reset/stop/bypass.
Synchronize it with `qualification.example.json.documentation` while pending,
and with `tests.qualification.documentation` once fully qualified. Never add
invented qualification results just to display the tutorial.

Inspect `src/components/ModulePreview.tsx` and `src/styles.css`. Create an
original, meaningful SVG thumbnail that matches the existing 320×192 diagrams,
colors, line weights and small-card readability. Depict the module's behavior.
For a draft, keep the reviewable vector under `presentation/thumbnail.svg` and
embed it in README; at catalog integration, wire its artwork into ModulePreview
and inspect both compact and detail sizes. Retain credits/licence. Render and
visually inspect the thumbnail. An illustration never counts as OT UI evidence.

## 3. Make the actual screenshots yourself

Find the local reviewed toolchain/emulator and fingerprinted 1.40C extraction.
Sources/tools are in `sdk/octabam/tools/`; existing native checkouts may already
have built vendor tools. Use a new private temporary workspace for every run.
Build pending native source only in a sandbox with no network/credentials,
read access limited to that source/toolchain/local base, and writes limited to
that workspace. Do not execute it on the trusted host or during `npm run check`.
Use the native remixer as the composition oracle; select only reviewed stock
and the requested module/dependencies. For a runtime recipe,
`tools/remix/runtime_build.py` verifies its pinned runtime/packed/append
identities; `tools/build/build_bus.py` composes the temporary MAIN OS image.
Record exact source/tool versions, build options and local image SHA-256.
Never distribute that image, including a runtime containing recovered stock.

Create a disposable project/card when the module needs loaded project state.
Use `tools/emu/emu_card.py:stage_project` or
`tools/emu/ot_emu/stage_card.py` with a **copy** of a local fixture. Keep template,
card and samples private. Select appropriate machines and effects for this
build; imported default effect IDs can mean something different in another
composition. Keep transport stopped for documentation captures.

Drive the real LCD with `scripts/capture-module-ui.py`. Save a JSON action plan
using `press`, `hold`, `release`, `encoder`, `wait`, `capture`. The tool supports
Kit/pattern/clipboard keys as well as effect/scene/encoder keys. It renders the
real LCD in monochrome at integer scale 6; it does not reconstruct labels.
For modules requiring project state, pass all three loading arguments:

```sh
python3 -B scripts/capture-module-ui.py \
  --emulator /private/local/ot_emu \
  --image /private/local/mainos.bin \
  --image-sha256 <verified-local-build-sha256> \
  --card /private/local/disposable-card.img \
  --set-name OCTAMOD --project-name DEMO \
  --plan /private/local/panel-plan.json \
  --output /private/local/new-captures
```

Run this inside the same isolation boundary. Use `--mki` for MKI;
`--key-ms 50` for double taps. Adapt initial clock-dialog handling to the actual
session; excess YES/NO presses create unrelated ARM/DISARM popups. If the
reviewed emulator has a panel limitation, record it and capture the supported
actual entry point without claiming verification of the other model.

Open **every** screenshot and iterate on the plan until it clearly shows the
selection/enable location and all relevant menus, controls and setup pages.
Confirm selection/loading before capturing controls. Reject errors, failed
loads, stale screens and unrelated popups. Do not patch RAM or invoke internal
menu routines to manufacture a page. An automatic USB module may use only the
narrow reviewer-verified `access.noUiReason` exception; it still needs actual
host/routing screenshots and a tutorial.

Copy only visually reviewed PNGs and sanitized provenance into `media/`.
Declare them in `media[]` and `access.screenshots`, including meaningful alt
text, credit, rights and `otUi` page/version/build/setup. Record plans, capture
hashes, exact module/source/image/emulator identities and fixture setup in
`media/capture.json` and TESTING. Include a media contributor declaration;
underlying Elektron rights remain reserved and reviewer verification is
required. Follow the eight-asset/size limits. Optional audio must be original
or properly licensed. Remove temporary firmware, runtime binaries, LCD/RAM
dumps, cards and private logs after retaining permitted evidence.

## 4. Complete qualification and integration honestly

Before release, populate `resources.impact` using
`public/module-resource-impact.example.json`: CPU, DSP and memory tiers need
an explicit workload, source-backed rationale and local evidence references.
These are relative estimates, not utilization/headroom percentages or a
substitute for measured qualification. Do not add new modules to the companion
estimates reserved for frozen existing versions.

Document actual worst-case cycles during parameter modulation, mode changes
and maximum load, exact memory regions and totals, and a passed real-hardware
stress project lasting at least 60 minutes with all eight audio tracks active.
The starting generator is `tools/harness/stress_project.py`; adapt its workload
to this module. Bind actual reports to version/native-source/local-image hashes
using `scripts/module-qualification.mjs`. The owner verifies the real reports.
An emulator UI capture is not hardware qualification. If hardware or measured
reports are unavailable, leave those fields pending and explain the precise
remaining work; still finish the thumbnail, documentation and screenshots.

Only a fully qualified, reviewed module can move into
`sdk/octabam/modules/<id>/` and be added to `sdk/catalog.json`. Build/import
approved stock-free packages with `npm run modules:build` and
`npm run modules:import`, integrate runtime stock reconstruction locally, and
prove browser/native byte parity and rejection behavior before enabling a
firmware download. Preserve the approved catalog/packages while work is pending.
No source/firmware execution belongs in visitor builds or ordinary app checks.

## 5. Validate and deliver the focused PR

Run `npm run check`, `npm run modules:check -- --base origin/main` and
`git diff --check` in the isolated worktree with Node 24. For a draft outside
catalog checks, add static checks of source identities, screenshot provenance,
monochrome pixels, complete documentation/tutorial and publication rejection.
Those checks read data and never execute the module or emulator. Inspect the
final diff for firmware, extracted routines, temporary outputs and unrelated
parallel changes. Generated catalog/licence files must be reproducible.

Commit and push the focused branch; create/update and attach its PR. Use a draft
PR while qualification/integration remains incomplete. Describe the concrete
module behavior, completed assets, validation and exact remaining gates. Owner
merge is approval; do not merge or deploy as part of adding a module. Link the
PR, workflow and any material limitation in the final response.
