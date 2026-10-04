# Modwerk core foundation

This is Modwerk's original implementation of the public elemod boot and event ABI. It was written from the documented contracts, not from elekloader's core assembly. [core-api.h](core-api.h) records the 32-bit descriptor layouts and actual helper signatures; target compilation checks their sizes. Credit: irpina's GPL-2.0-or-later [FORMAT](https://github.com/irpina/elekloader/blob/main/docs/FORMAT.md) and [ADAPTING](https://github.com/irpina/elekloader/blob/main/docs/ADAPTING.md) guides. Modwerk's source is GPL-3.0-or-later.

`boot.s` saves the incoming general registers, status and stack, copies the linker's complete RAM image, clears BSS and tail-calls the boot routine the verified stock site originally called. Zero-length copy and clear loops are supported. It contains no stock instruction bytes or extracted firmware routine. The target address and patch guard live in each machine's `core/probe.json`.

`event-bus.c` implements ordered, sentinel-terminated dispatch with the documented arguments. Input and hold dispatch stop when a handler returns nonzero. `ui-hooks.s` supplies original tick, draw, key and encoder adapters: tick dispatch precedes the stock compose check; draw dispatch follows the stock draw and preserves its outputs; unconsumed input tail-calls stock, while consumed input returns the handler's value. Each adapter preserves registers, status and the caller's stack. The host tests run inside the isolated source container, with no firmware or credentials; the cross compiler also checks the target ABI.

## Development probes

The source job emits two separate development inventories, alongside the module inventory:

- `cores/<machine>/<release>.json` and `core-build.json`: boot-only probes (`stage: boot-probe`).
- `ui-cores/<machine>/<release>.json` and `core-ui-build.json`: boot plus four UI call-site adapters (`stage: ui-hook-probe`). Each machine's `core/ui-probe.json` records only addresses, lengths and SHA-256 guards for the complete displaced stock calls and their original destinations.

Every probe declares `providesInterface: false`. Its event tables are empty; no imported module is installed. The local verifier checks that each guarded instruction is the expected absolute call before binding its destination. These artifacts cannot substitute for a completed core or qualify imported modules.

Use the isolated build instructions in [ELEMOD_SOURCE_BUILDS.md](../../../docs/ELEMOD_SOURCE_BUILDS.md). The following verification commands are explicit developer checks, outside ordinary application checks and visitor builds:

- `node scripts/verify-elemod-core-cpu.mjs --packages DIR --python PATCHED_UNICORN_PYTHON` runs compiled original code on synthetic memory. It checks copy and BSS bounds, all general registers, flags, stack, return address and original-call handoff, including empty sections. No firmware file is read.
- `node scripts/verify-elemod-ui-cpu.mjs --packages DIR --python PATCHED_UNICORN_PYTHON` executes the compiled adapters and dispatcher with synthetic stock calls and event handlers. It checks empty/observing tables, both input-consumption positions, arguments, call order, return values, all general registers, status, stack and guards across all four profiles. No firmware file is read.
- `node scripts/verify-elemod-core-probe.mjs --packages DIR --out LOCAL_DIR --firmware machine:stock.syx ...` verifies the owner's stock identity, recipe inventory, original-call binding, linker layout and complete packed container. Add `--ui-hooks` to select the UI probes. Builds are local and temporary.
- Check each resulting file against stock using the local digiemu command in the launch handoff; capture the actual reports before claiming emulator equivalence.

The full Digitakt 2.1 implementation still needs SETTINGS rows, render adapters, DTIM0 setup and SRC machine integration. Digitone 2.2 also needs voice/hold hooks, parameter slots, pages, project data and the Mod Menu. UI probe evidence and its comparison limits are recorded in [VERIFICATION.md](../../../docs/VERIFICATION.md). Machine core interfaces remain in development and firmware downloads remain gated.
