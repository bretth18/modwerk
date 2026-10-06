# Vendored elekloader kit

Modwerk builds Digitakt mk1 and Digitone mk1/Keys firmware with [elekloader](https://github.com/irpina/elekloader)'s kit, by irpina, under GPL-3.0-or-later. The kit is elekloader's builder packaged for any website: its TypeScript engine, a builder worker, a client for the page, and a catalog format ([decisions](../../docs/DECISIONS.md); the kit's own guide is `kit/README.md`). Modwerk's own builder is frozen and resumes later.

| Path | What | From |
| --- | --- | --- |
| `kit/` | the kit, unchanged: `src/` (the engine and `src/kit/`), `tools/kit.ts`, `LICENSE` (GPL-3.0-or-later), `NOTICE`, `README.md` and `kit.json` | `elekloader-kit-<version>.zip`, the commit in `kit.json` |
| `catalog/` | `catalog.json` and the files it pins: the four device cores, and DIGISLICER, NEIGHBOR, SOPHIE and digihealth | cores from elekloader release v0.4.0, mods from each author's GitHub release |
| `elekloader.lock.json` | the lock: every kit file and the catalog by SHA-256 | written by `kit/tools/kit.ts lock` |

`npm run elekloader:check` (part of `npm run check`) checks everything against the lock, as the kit's own `verify --lock` does. It refuses any changed, missing or extra file in `kit/` or `catalog/`. The site serves `catalog/` under `elekloader/`.

The catalog's `revision` names its set of cores and mods: the elekloader commit whose catalog pinned them, still `e4d8ba8`. Configuration backups record it, so it changes only when the cores or mods do, not with the kit. A backup that names an older revision still imports: its modules are looked up again in the library, and the page says which were left out or changed version.

`src/engine/elekloader/digi-build.ts` is Modwerk's side:
- it starts the kit's worker (`kit/src/kit/worker.ts`, bundled by Vite) through the kit's client;
- it maps Modwerk's machine ids to the kit's device keys;
- it uses the kit's `prepare`, build steps and build log.

The worker checks each file against its pin and refuses requests to other sites. The owner's stock file never leaves the browser.

The `.elemod` files carry each author's own bytes. Stock instructions are referenced by address, length and hash and copied from the owner's file during the build. They contain no Elektron firmware.

## Updating

Update by pull request, owner reviewed:

1. **Get the files.** Take `elekloader-kit-<version>.zip`, and `elekloader-catalog.json` if the cores or mods change, from an elekloader release; the first is [kit-v0.4.0](https://github.com/irpina/elekloader/releases/tag/kit-v0.4.0). For a commit no release carries yet, build the zip with elekloader's `python packaging/build_kit.py --out build/kit`: it is reproducible.
2. **Run the update** with the kit, the catalog, or both:
   ```bash
   npm run elekloader:update -- elekloader-kit-<version>.zip --sha256 <the release's> elekloader-catalog.json
   ```
   Add `--library` to take elekloader's whole catalog as it is: only the mods Modwerk's library lists (`sdk/<machine>/modules/<id>/modwerk.module.json`) and the mods they require are kept, and the rest are not downloaded.

   It refuses a zip whose files are not the ones its `kit.json` names, and a kit of another protocol than `digi-build.ts` is written for. The catalog's Digitakt and Digitone files are downloaded from their authors' releases by the kit's `sync` and checked against their pins, and files it no longer names are removed. Both are staged first, and the new kit generates and verifies their lock before any installed file changes. Then it installs the files and lock, points the elekloader licence entry at the new commit, rebuilds its notice from the kit's full `NOTICE` and `LICENSE`, regenerates the distribution notices and runs the vendor check. A failure during installation, notice generation or validation restores the previous kit, catalog, lock, licence entry and notices. If a filesystem error prevents restoration, the command reports where it kept the original files for recovery.
3. **Do what it lists.** It prints what changed and what is left by hand: Modwerk's own module files (`sdk/<machine>/modules/<id>/modwerk.module.json`) for each mod that changed, came or left, and licence entries naming a file that is gone. A new catalog `revision` needs nothing more: older configuration backups still import, with their modules checked again against the library.
4. **Check and record:** run `npm run check`. Build every module subset locally against the previous builder or elekloader's command line, and record the result in `docs/VERIFICATION.md`.
