# Modwerk core foundation

This is Modwerk's original implementation of the public elemod boot and event ABI. It was written from the documented contracts, not from elekloader's core assembly. [core-api.h](core-api.h) records the 32-bit descriptor layouts and actual helper signatures; target compilation checks their sizes. Credit: irpina's GPL-2.0-or-later [FORMAT](https://github.com/irpina/elekloader/blob/main/docs/FORMAT.md) and [ADAPTING](https://github.com/irpina/elekloader/blob/main/docs/ADAPTING.md) guides. Modwerk's source is GPL-3.0-or-later.

`boot.s` saves the incoming general registers, status and stack, copies the linker's complete RAM image, clears BSS and tail-calls the boot routine the verified stock site originally called. Zero-length copy and clear loops are supported. It contains no stock instruction bytes or extracted firmware routine. The target address and patch guard live in each machine's `core/probe.json`.

`event-bus.c` implements ordered, sentinel-terminated dispatch with the documented arguments. Input and hold dispatch stop when a handler returns nonzero. UI and audio entry/exit adapters have not been wired to firmware yet. The host tests run inside the isolated source container, with no firmware or credentials; the cross compiler also checks the target ABI.

## Development probes

The source job emits `cores/<machine>/<release>.json` and `core-build.json`, separately from the module inventory. Every probe declares `stage: boot-probe` and `providesInterface: false`. Only the boot call is patched. The event dispatcher is copied to RAM, with empty event tables; it is not installed into the shared stock hooks. These artifacts cannot substitute for a completed core or qualify imported modules.

Use the isolated build instructions in [ELEMOD_SOURCE_BUILDS.md](../../../docs/ELEMOD_SOURCE_BUILDS.md). The following verification commands are explicit developer checks, outside ordinary application checks and visitor builds:

- `node scripts/verify-elemod-core-cpu.mjs --packages DIR --python PATCHED_UNICORN_PYTHON` runs compiled original code on synthetic memory. It checks copy and BSS bounds, all general registers, flags, stack, return address and original-call handoff, including empty sections. No firmware file is read.
- `node scripts/verify-elemod-core-probe.mjs --packages DIR --out LOCAL_DIR --firmware machine:stock.syx ...` verifies the owner's stock identity, recipe inventory, original-call binding, linker layout and complete packed container. Builds are local and temporary.
- Check each resulting file against stock using the local digiemu command in the launch handoff; capture the actual reports before claiming emulator equivalence.

The full Digitakt 2.1 implementation still needs firmware hook adapters, SETTINGS rows, DTIM0 setup and SRC machine integration. Digitone 2.2 also needs voice/hold hooks, parameter slots, pages, project data and the Mod Menu. Machine core interfaces remain in development and firmware downloads remain gated.
