# digihealth testing

## In Modwerk

Nothing has been built or tested in Modwerk yet. Evidence tier: `none`. Modwerk’s elemod engine and core are in development.

## Upstream

The author documents their own checks in [upstream/README.md](upstream/README.md). Those results belong to the author’s v1.1 build with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digihealth-1.0.elemod` release object (SHA-256 `aba9413ee205e1368ec3997172a84e59eaa4e787d267bc7a3e94a161b4fcd0f1`) contains 2,988 B in `.run`, 2,560 B in `.bss` and 124 B of table contributions: **5,672 B** in total. This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. This is an upstream object measurement, not a measured Modwerk build or hardware load report.
