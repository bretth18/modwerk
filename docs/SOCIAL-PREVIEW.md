# Social sharing preview

The static page metadata in `index.html` references `public/social-preview.jpg` at
`https://octamod.app/social-preview.jpg`. The production build copies this image
to `dist/social-preview.jpg`. Open Graph and Twitter cards can read the metadata
without running the app.

The image is a 1200 × 630 JPEG. It is original AI-generated artwork, created on 1 October 2026.
It uses Octamod's existing palette and eight-tile brand mark. The signal panels
are original generated illustrations; they are not hardware screenshots or
performance evidence. No firmware or third-party photograph was used.

If the public site moves, update the absolute URL and image URLs in
`index.html` along with the domain printed on the artwork. When replacing the
artwork, use a new image filename and update both metadata references so sharing
services can fetch the new asset.

## Modwerk launch artwork

`public/modwerk-social-preview-v1.jpg` is the prepared homepage link preview for
the coordinated Modwerk rebrand. It is a 1200 × 630 progressive sRGB JPEG, with
a new filename to avoid reusing the cached Octamod preview URL. The production
build copies it to `dist/modwerk-social-preview-v1.jpg`.

The copy is “Mods for Elektron machines.” Four physical feature branches show
the mod library, firmware builder, forum and developer SDK, connected to a
central eight-pad Modwerk hub. The image uses the existing eight-tile brand
mark, charcoal background and periwinkle accent, with mint and apricot details.
Large horizontal action labels say “Discover mods”, “Build firmware”, “Join
the forum” and “Developer SDK”; smaller labels identify the library, local
builder, community and tools/documentation. The typography stays horizontal independently of
the 3D camera, with enlarged signal, download and code symbols. The image was
visually checked at 1200 × 630, 600 × 315 and 400 × 210.

The artwork is a custom Three.js scene rendered on 4 October 2026, with original
geometry, procedural display textures and exact HTML typography. The four bays
contain removable signal modules, a processor board, solid conversation forms
and an SDK socket. The fixed camera, geometry, lighting and colors are in
[`social-preview/modwerk-v1.html`](social-preview/modwerk-v1.html); the version
pin, source/export hashes, encoding settings and review notes are in
[`social-preview/modwerk-v1.json`](social-preview/modwerk-v1.json). The final
asset contains no ImageGen artwork, external textures or photographs. These
conceptual illustrations are not hardware captures, qualification evidence or
a promise that every machine has working downloads. No firmware or user files
are read.

The source imports Three.js 0.180.0 from its pinned CDN URL. To inspect or
re-export it, serve the repository root with a local static server and open
`/docs/social-preview/modwerk-v1.html`. Wait for the scene to appear, then
capture the fixed canvas at `(0, 0, 1200, 630)`. It renders at pixel ratio 2;
the captured JPEG was exported with Sharp at quality 95, progressive sRGB,
4:4:4 chroma sampling. Three.js is used only in the artwork source and is not
added to the application bundle or npm dependencies. Its full MIT licence is
preserved in [`social-preview/THREE-LICENSE.txt`](social-preview/THREE-LICENSE.txt).

For an offline source preview, install the pinned Three.js package in a
temporary directory, link its `build/` folder as `docs/social-preview/.three`,
and open the source with `?local`. The local library link is temporary and must
not be committed.

Homepage metadata activation belongs to the combined rebrand. At that launch,
set both `og:image` and `twitter:image` to
`https://modwerk.app/modwerk-social-preview-v1.jpg`, retain the 1200 × 630 image
dimensions and `image/jpeg` MIME type, and synchronize the site name, title,
description and canonical URL with Modwerk. Use this alt text for both cards:

> Modwerk — Mods for Elektron machines. Four branches connect the mod library,
> firmware builder, community forum and developer SDK to a central Modwerk hub.

The current Octamod metadata remains tied to its current launch. Module links
continue using their individual module thumbnails.

## Module links

Share module URLs such as `https://octamod.app/module/analog-bassdrum/`. Each
production build generates `dist/module/<id>/index.html` with the module's name,
description, canonical URL, and Open Graph/Twitter image metadata. These are
ordinary static pages served by GitHub Pages and the Cloudflare Pages fallback;
sharing services do not need to execute JavaScript or contact the community API.

`scripts/module-pages.ts` rasterizes the existing `ModulePreview` artwork with
its palette and signal styles from `src/styles.css` into 1200 × 630 JPEGs under
`dist/module-thumbnails/`. Image filenames include a content hash so a changed
thumbnail gets a new URL. These original illustrations are not OT UI captures
or qualification evidence. No module sources, firmware or user files are read
by the thumbnail generator.

Library, configuration, comparison and module-set links use the shareable paths.
The app supports these paths, preserves navigation without reloading the running
workspace, and rewrites legacy `/#module/<id>` links to the corresponding path
when opened in a browser. Old hash links still open the correct module, but
sharing services cannot receive the part after `#`, so existing posts using
those links retain the generic homepage preview. Use the new URL when sharing.

Nested module pages set their document base to the app root so bundles, licensed
media and other public assets also work after direct navigation or reload. The
router resolves that base once before client-side navigation, including when
the build is hosted under a Pages project path.
