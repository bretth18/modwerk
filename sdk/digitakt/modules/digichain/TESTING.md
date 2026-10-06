# digichain testing

## In Modwerk

Nothing has been flashed or tested on hardware in Modwerk. Evidence tier: `none`.

Modwerk’s vendored elekloader builder linked and verified a build of this mod with core 2.1 on each OS release:

- OS 1.53: core 2.1 and digichain 1.6, built and verified, SHA-256 `5dcead8c87465218…`.
- OS 1.54: core 2.1 and digichain 1.6, built and verified, SHA-256 `a5e6a765d3ca7bfa…`.

This is a build check against the owner’s stock OS files, kept locally, not a hardware test.

## Combinations

Modwerk's vendored builder ran elekloader's check with this mod beside each other Modwerk mod for its OS, with what each requires, against the owner's stock files kept locally. These are build checks, not hardware tests.

- OS 1.53: combines with digihealth, Digi EQ, Digi Matrix, Digi Mono, Digi Poly and Digi utilities; refused beside NEIGHBOR, DIGISLICER and SOPHIE, whose patch sites overlap (the builder names the sites).
- OS 1.54: combines with digihealth, Digi EQ, Digi Matrix, Digi Mono, Digi Poly and Digi utilities; refused beside NEIGHBOR and DIGISLICER, whose patch sites overlap (the builder names the sites).

## Upstream

Not yet tested on a unit, its author reports; it passes the author’s emulator tests on OS 1.53 and 1.54.

The author documents their checks in [upstream/README.md](upstream/README.md). In the digiemu emulator (`tests/digiemu_chain.py`), builds with core, digichain and the author’s -chain builds of SOPHIE, NEIGHBOR and DIGISLICER, with Digi Mono, were compared with builds of one mod as it is: the same SRC page pixels, the same knob maximums, and SOPHIE’s and NEIGHBOR’s voices the same bit for bit. NEIGHBOR’s new SLOT behaviour and its pitch shifter were checked there too. On OS 1.54, with core, digichain, the chained SOPHIE and Digi Mono, the LFO page’s DEST list and box showed MONO SAW’s and SOPHIE’s names, and ONESHOT’s as stock.

Those results belong to the author’s 1.6 build with elekloader’s toolchain and core, and to the -chain builds of the other mods; they do not qualify a Modwerk build.

## Imported memory estimate

- The author’s `digichain-1.6.elemod` release object for OS 1.53 (SHA-256 `819f6045b5ad4deaa720c74f0126d078cc15c019dfcb07710112ac453b65d47d`) contains 1,792 B in `.run`, 32 B in `.bss` and 4 B of table contributions: **1,828 B** in total.
- The author’s `digichain-1.6-os1.54.elemod` release object for OS 1.54 (SHA-256 `5d4910f597874ac2f5348e2cd76bea7e34b9ea0060c9bcf1406dd317a7af9e42`) contains 1,792 B in `.run`, 32 B in `.bss` and 4 B of table contributions: **1,828 B** in total.

This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. The author’s README gives 728 bytes for digichain; the figures above are measured from the 1.6 release objects. This is an upstream object measurement, not a measured Modwerk build or hardware load report.
