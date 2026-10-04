# Vendored elekloader builder

Modwerk builds Digitakt mk1 and Digitone mk1/Keys firmware with [elekloader](https://github.com/irpina/elekloader)'s builder, by irpina, under GPL-2.0-or-later. The owner chose this for the combined launch on 4 October 2026 ([decision](../../docs/DECISIONS.md)). Modwerk's own builder is frozen and resumes later.

| Path | What | From |
| --- | --- | --- |
| `elekloader/`, `bridge.py`, `LICENSE`, `NOTICE` | elekloader's Python package and its web bridge, unchanged | commit in `UPSTREAM.json` |
| `core/` | the four device cores | elekloader release v0.4.0 |
| `shop/` | DIGISLICER, NEIGHBOR, SOPHIE and digihealth | each author's GitHub release, at the SHA-256 elekloader's catalog pins |

`UPSTREAM.json` pins every file by SHA-256. `npm run elekloader:check` (part of `npm run check`) refuses any changed, missing or extra file and an installed Pyodide other than the pinned `pyodide@314.0.7`. That npm package's five runtime files are byte-identical to `pyodide-core-314.0.7.tar.bz2`, the release elekloader's own site pins.

The site serves these files under `elekloader/`. A module worker (`src/engine/elekloader/builder.worker.ts`) loads Pyodide and runs elekloader's bridge on its in-memory file system, as elekloader's online builder does. The worker refuses requests to other sites. The owner's stock file never leaves the browser.

The `.elemod` files carry each author's own bytes. Stock instructions are referenced by address, length and hash and copied from the owner's file during the build. They contain no Elektron firmware.

## Updating

Update by pull request, owner reviewed:

1. Pick an elekloader commit and copy its `elekloader/` package, `web/bridge.py`, `LICENSE` and `NOTICE` unchanged.
2. Take cores from its latest release and shop files from the authors' releases. Check each file against the SHA-256 in elekloader's `web/catalog.json` and its release checksums.
3. Rewrite `UPSTREAM.json` with the new commit, entries and hashes. Update `pyodide` in `package.json` if elekloader's pinned Pyodide changed.
4. Run `npm run check`. Then build every module subset locally against elekloader's command line from the same commit and record the result in `docs/VERIFICATION.md`.
