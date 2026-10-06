# Digi utilities testing

## In Modwerk

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.1 on each OS release:

- OS 1.53: built and verified with core 2.1 and Digi utilities 1.9a; the result’s SHA-256 begins `a1641ca2af6e6f03`.
- OS 1.54: built and verified with core 2.1 and Digi utilities 1.9a; the result’s SHA-256 begins `6e2026255ab72f7f`.

This is a build check against the owner’s stock files kept locally, not a hardware test.

The quarter-sine table is the one change to the author’s source: `src/osc_data.s` now has `.include "spec_sin.inc"` where the author’s file has `.incbin "spec_sin.bin"`, because Modwerk accepts no binary files. `src/spec_sin.inc` holds the same 257 values as the author’s generated `bin/spec_sin.bin`. The `.include` was checked to assemble (GNU as for m68k, `-mcpu=5475`) to the same 514 bytes as the author’s `spec_sin.bin` at commit 35bacb3730d1 (SHA-256 `ab2f4a23849e787a94e06e4b5a3b956541c63b8cccc1ee1111dc828bf831a469` for both).

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.53: combines with digihealth, NEIGHBOR, DIGISLICER, SOPHIE, digichain, Digi EQ, Digi Matrix, Digi Mono and Digi Poly.
- OS 1.54: combines with digihealth, NEIGHBOR, DIGISLICER, digichain, Digi EQ, Digi Matrix, Digi Mono and Digi Poly.

## Upstream

The author reports the stand-alone 1.5d (the v3r-all build, with all three views) tested on a Digitakt mk1, and 1.9a not yet; it passes their emulator tests on OS 1.53 and 1.54. Their documentation, kept in [upstream/REPOSITORY.md](upstream/REPOSITORY.md), says the linked Digi utilities code is instruction for instruction the stand-alone code, that the mods lint and link alone and together, that a full walk-through boots in the digiemu emulator with FAST AUDIO on, and that on OS 1.54 the Digi utilities pages pass the same emulator tests. Those results belong to the author’s 1.9a builds with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

- The author’s `digiutils-1.9a.elemod` release object for OS 1.53 (SHA-256 `8697ac1fe883cb8fc6ee29f441f6172bde5b24506a1a4337358d66106844b5c1`) contains 5,468 B in `.run`, 3,612 B in `.bss` and 0 B of table contributions: **9,080 B** in total.
- The author’s `digiutils-1.9a-os1.54.elemod` release object for OS 1.54 (SHA-256 `ed13ca17753e4885b195c2ee7183ce370ad2fdd5b9f730de8a03962fc9397765`) contains 5,468 B in `.run`, 3,612 B in `.bss` and 0 B of table contributions: **9,080 B** in total.

This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. It also excludes the buffers the spectrum (6 KB) and the tuner (1 KB) take from the firmware’s memory at run time. This is an upstream object measurement, not a measured Modwerk build or hardware load report.
