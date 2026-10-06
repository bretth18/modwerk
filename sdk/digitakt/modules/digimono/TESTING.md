# Digi Mono testing

## In Modwerk

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.1 on each OS release:

- OS 1.53: core 2.1, DIGICHAIN 1.6 and Digi Mono 0.13b, built and verified; result SHA-256 starts `0398b1d7a05f4381`.
- OS 1.54: core 2.1, DIGICHAIN 1.6 and Digi Mono 0.13b, built and verified; result SHA-256 starts `30f8c005bf648133`.

This is a build check against the owner’s stock files, which are kept locally. It is not a hardware test.

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.53: combines with digihealth, Digi EQ, Digi Matrix, Digi Poly and Digi utilities; refused beside NEIGHBOR, DIGISLICER and SOPHIE, whose patch sites overlap (the builder names the sites).
- OS 1.54: combines with digihealth, Digi EQ, Digi Matrix, Digi Poly and Digi utilities; refused beside NEIGHBOR and DIGISLICER, whose patch sites overlap (the builder names the sites).

## Upstream

Digi Mono is not yet tested on a unit, its author reports; it passes their emulator tests on OS 1.53 and 1.54. The author’s design notes in [upstream/DESIGN.md](upstream/DESIGN.md) describe those checks: the engine measured on a PC build (`tests/mono_signal.py`), the ColdFire build compared bit for bit with the PC build (`tests/emu_mono.py`), every machine played in the real firmware in the digiemu emulator and compared bit for bit with the engine (`tests/digiemu_mono.py`), and the FLTR, AMP and LFO pages on a Digi Mono track (`tests/digiemu_mono_fx.py`). Those results belong to the author’s 0.13b builds with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digimono-0.13b.elemod` release object for OS 1.53 (SHA-256 `79b51a364b1b7fd8ca13ac6aacba15bd1439bb46569b11d1ad5b3a35b1cec3ec`) contains 22,931 B in `.run`, 9,272 B in `.bss` and 32 B of table contributions: **32,235 B** in total.

The author’s `digimono-0.13b-os1.54.elemod` release object for OS 1.54 (SHA-256 `bbd79b944ab7a2176d933d671cc3019e2f55748412c37e1b9c64779348137dbc`) contains 22,931 B in `.run`, 9,272 B in `.bss` and 32 B of table contributions: **32,235 B** in total.

This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment, which the browser estimate reserves separately, and DIGICHAIN, which counts as its own module. This is an upstream object measurement, not a measured Modwerk build or hardware load report.
