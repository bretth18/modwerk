# Source-only Digitakt and Digitone builds

Modwerk compiles the reviewed C and assembly in each module folder in the pinned `sdk/build/Dockerfile` toolchain. GCC 16.2.0 targets `m68k-elf`/ColdFire 54455; Node 24 converts the relocatable ELF to an elemod-compatible recipe. GNU's release checksum pins the compiler archive and an immutable image digest pins Node. Module compilation has no network, credentials, firmware, repository history or publication privileges.

## Build isolation

Build the toolchain with `docker build --file sdk/build/Dockerfile --tag modwerk-source-tools .`. Its restricted context contains toolchain preparation files only. Resolve that image's immutable ID with `docker image inspect modwerk-source-tools --format '{{.Id}}'`, then pass a clean checkout and a new output directory to `bash scripts/build-elemod-isolated.sh CHECKOUT OUTPUT IMAGE_ID`.

The wrapper archives only tracked source, mounts it read-only, runs as an unprivileged user with no network/capabilities and a read-only filesystem, and limits CPU, RAM, process count and scratch space. It never mounts a developer's ignored files. Compilation parses manifests as data, rejects binary and symlink inputs and invokes the assembler/compiler with argument arrays. It does not execute the compiled module.

PR checks compile twice and compare every output byte. The source job emits recipes and a final `elemod-build.json` inventory containing versions, release identities, source fingerprints, compiler versions and artifact hashes. A failed build never writes a complete inventory. These are review artifacts; this workflow does not publish or enable firmware downloads. The approved Octatrack release pipeline remains independent.

## ELF conversion and local work

The converter accepts ELF32 big-endian m68k relocatable objects with RELA relocations. It places `.boot`, `.run`, `.fast` and `.bss`, preserving alignment, symbols, exports, imports and signed addends for absolute 32-bit and PC-relative 32/16-bit references. Unknown allocated sections, unsupported relocation types and malformed/truncated tables fail closed. Core events become table contributions.

The recipe carries stock-hash guards and patch instructions from `build.json`, never stock opcode bytes. `strings` optionally maps generated symbol names to diagnostic strings (for example digihealth's `str_name`). A FAST AUDIO declaration explicitly lists each supported release that uses its addresses and guards; its stubs can be compiled from those addresses alone.

`materializeModuleObject` runs locally in the browser or the owner's verification process. It first checks the complete main-image identity, then verifies each patch guard, fills `keep2` opcode words and plans FAST AUDIO copy/fixup tables from the selected firmware. A branch outside the copied block or an invalid SRAM range is rejected. The normal linker additionally enforces copied-block claims, patch overlap, instruction boundaries, symbols and budgets. Materialized objects and linked images stay local and must never enter CI, uploads or source control.

Format compatibility follows [elekloader's format documentation](https://github.com/irpina/elekloader/blob/main/docs/FORMAT.md), by irpina under GPL-2.0-or-later. FAST AUDIO planning follows [digihealth's public recipe](https://github.com/irpina/digihealth/blob/6d2a95605901f4f5ea6301dbad16e573380331a6/build.py), under the same licence. Modwerk's converter and local engine are GPL-3.0-or-later.

## Verification limits

Repeatable source compilation and a valid recipe do not establish native byte parity, correct module behaviour or hardware qualification. Compare each materialized object with its author's pinned release, then verify Modwerk's own cores and each module in the emulator. Retain honest comparison results in `docs/VERIFICATION.md`; keep firmware and local images outside the repository. No firmware, DSP or emulator checks run as part of ordinary `npm run check` or visitor builds.

For a local release comparison, run `node scripts/verify-elemod-source-parity.mjs --packages RECIPES --oracle AUTHOR_OBJECTS --out LOCAL_REPORTS --firmware digitakt:STOCK.syx` (repeat `--firmware` for each release). It verifies package hashes and source commit identities before linking. Missing stock/reference inputs and differing images are reported as unverified/different and produce a nonzero exit; the report contains hashes and section lengths only.
