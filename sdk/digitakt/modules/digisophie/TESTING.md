# SOPHIE testing

## In Modwerk

Nothing has been built or tested in Modwerk yet. Evidence tier: `none`. Modwerk’s elemod engine and core are in development.

## Authorship correction

Modwerk metadata version `1.1.13-experimental.1` credits Sjoerd (Soejrd, @soejrd) as DigiSophie’s developer and maintainer, and Matt Estela (@mestela) as the original Sophie for Schwung algorithm author. The pinned upstream revision, native source, build inputs, compatibility and resource estimates are unchanged. Evidence remains `none`; this correction claims no new native or hardware validation.

## Upstream

The author documents their own checks in [upstream/README.md](upstream/README.md). Those results belong to the author’s v1.1.13 build with elekloader’s toolchain and core; they do not qualify a Modwerk build.

## Imported memory estimate

The author’s `digisophie-1.1.13.elemod` release object (SHA-256 `6eadc29d581b24ff84fe3fe32399b998a91375ee06182631ab499109b4a003a5`) contains 7,998 B in `.run`, 720 B in `.bss` and 4 B of table contributions: **8,722 B** in total. This counts code, initialized data, zero-filled state and contributions, not the JSON file size. It excludes the shared Modwerk core and linker alignment; the browser estimate reserves those separately. This is an upstream object measurement, not a measured Modwerk build or hardware load report.
