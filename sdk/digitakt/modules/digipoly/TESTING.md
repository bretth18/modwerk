# Digi Poly testing

## In Modwerk

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.1 on each release it is built for:

- OS 1.53: built and verified with core 2.1, DIGICHAIN 1.6 and Digi Poly 2.0. The result’s SHA-256 begins `53b3776e9095aa3f`.
- OS 1.54: built and verified with core 2.1, DIGICHAIN 1.6 and Digi Poly 2.0. The result’s SHA-256 begins `bb19da68134f031c`.

This is a build check against the owner’s stock files, kept locally. It is not a hardware test.

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.53: combines with digihealth, Digi EQ, Digi Matrix, Digi Mono and Digi utilities; refused beside NEIGHBOR, DIGISLICER and SOPHIE, whose patch sites overlap (the builder names the sites).
- OS 1.54: combines with digihealth, Digi EQ, Digi Matrix, Digi Mono and Digi utilities; refused beside NEIGHBOR and DIGISLICER, whose patch sites overlap (the builder names the sites).

## Upstream

The author reports that Digi Poly is not yet tested on a unit, and that it passes their emulator tests on OS 1.53 and 1.54. They check it in two parts: `tests/emu_poly.py` runs the mod’s own code in unicorn without booting the firmware (voice choice, the settings row, the chord’s messages, knob and level mirroring, the TRIG page’s fader), and `tests/digiemu_poly.py` boots the firmware in the digiemu emulator for the TRIG page, the key’s chord, chords from the sequencer on four voices, per-pattern pools and recording. The author’s [README](upstream/REPOSITORY.md) and [RISKS.md](https://github.com/gdeo607/digi1_mods/blob/35bacb3730d108e4dc48a7bd6de4c99ae9b161e6/RISKS.md) describe these checks. Those results belong to the author’s 2.0 builds with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digipoly-2.0.elemod` release object for OS 1.53 (SHA-256 `1d2615c58e0a944c1ca49741739be4e1b3cc26cf8d94ce3ab1cd6af78c47ebac`) contains 4,723 B in `.run`, 248 B in `.bss` and 12 B of table contributions: **4,983 B** in total.

The author’s `digipoly-2.0-os1.54.elemod` release object for OS 1.54 (SHA-256 `4cc14624253150776b2eedd8e02b8b86b378888b1459cd2f0a0b49148b48263e`) contains the same: 4,723 B in `.run`, 248 B in `.bss` and 12 B of table contributions: **4,983 B** in total.

This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment, which the browser estimate reserves separately, and DIGICHAIN, which Digi Poly requires and which has its own estimate. This is an upstream object measurement, not a measured Modwerk build or hardware load report.
