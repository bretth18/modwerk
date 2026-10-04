# NEIGHBOR testing

## In Modwerk

Nothing has been built or tested in Modwerk yet. Evidence tier: `none`. Modwerk’s elemod engine and core are in development.

## Upstream

The author documents their own checks in [upstream/README.md](upstream/README.md). Those results belong to the author’s v0.6 build with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digineighbor-0.6.elemod` release object (SHA-256 `380837f86c05cf6d0aba2dfc930a4309cc6b2e99b2e8c6a450f0abe6e844dccd`) contains 3,772 B in `.run`, 22,936 B in `.bss` and 4 B of table contributions: **26,712 B** in total. This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. This is an upstream object measurement, not a measured Modwerk build or hardware load report.
