# digihealth testing

## In Modwerk

Nothing has been built or tested in Modwerk yet. Evidence tier: `none`. Modwerk’s elemod engine and core are in development.

## Upstream

The author documents their own checks in [upstream/README.md](upstream/README.md). Those results belong to the author’s v1.1 build with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digihealth-1.1.elemod` release object (SHA-256 `5d2e5e201f9cd6323f0641093817250b030b196dd00816e2b18ca6ab0ed0ca99`) contains 1,952 B in `.run`, 2,528 B in `.bss` and 20 B of table contributions: **4,500 B** in total. This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. This is an upstream object measurement, not a measured Modwerk build or hardware load report.
