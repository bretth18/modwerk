# DIGISLICER testing

## In Modwerk

Nothing has been built or tested in Modwerk yet. Evidence tier: `none`. Modwerk’s elemod engine and core are in development.

## Upstream

The author documents their own checks in [upstream/README.md](upstream/README.md). Those results belong to the author’s v2.1 build with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digislicer-2.1.elemod` release object (SHA-256 `351bfb3a7c8bbbc8f925e085d77ee136114ad7edb90beeed9a6ea351f2cde51f`) contains 16,414 B in `.run`, 75,756 B in `.bss` and 20 B of table contributions: **92,190 B** in total. This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. This is an upstream object measurement, not a measured Modwerk build or hardware load report.
