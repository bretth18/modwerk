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

`public/modwerk-social-preview-v2.jpg` is the prepared homepage link preview for the
Modwerk rebrand: 1200 × 630, progressive sRGB JPEG, quality 95, 4:4:4. The Modwerk
lockup and “Mods for Elektron instruments.” sit above four branches connecting the
Mod library, Firmware builder, Community forum and Developer SDK to the central
Modwerk mark. Large two-line feature labels and distinct vector drawings replace
the sequencer keys and machine silhouettes. The feature labels are 41 pixels tall
in the source and were visually checked at 600 × 315 and 400 × 210.

Module covers with signal drawings represent the library, selected tiles combining
into one package represent the builder, speech bubbles represent the forum, and
code brackets represent the SDK. These are original explanatory illustrations,
not interface captures, qualification evidence or a claim of mod availability for
every instrument. The artwork states that Modwerk is independent and not
affiliated with Elektron.

### Mark

`public/modwerk-mark.svg` (dark backgrounds) and `public/modwerk-mark-on-light.svg`
(light backgrounds) are the Modwerk mark: eight tiles centred in a frame that opens
at one corner, where an apricot ninth tile, the mod, slides in. The artwork embeds
`modwerk-mark.svg` as-is twice: to the left of the wordmark and at the branch
junction. The mark files are unchanged from the supplied redesign branch. A change
to the mark changes the preview on its next export. `public/favicon.svg` is still
the Octamod mark; switching it belongs to the rebrand.

### Source and export

The source is the vector drawing [`social-preview/modwerk-v2.html`](social-preview/modwerk-v2.html).
It uses Archivo and JetBrains Mono (SIL Open Font License 1.1), pinned
`@fontsource-variable` 5.3.0 builds, and the mark file; no photographs, firmware or
generated images go into it. To re-export:

```sh
npm install --no-save playwright@1.56.1 @fontsource-variable/archivo@5.3.0 @fontsource-variable/jetbrains-mono@5.3.0
npx playwright install chromium
node scripts/render-social-preview.mjs --previews /tmp/modwerk-previews
```

The script renders at 2× in Chromium, downsamples with Sharp, refuses a render whose
fonts or mark did not load, and prints the export's SHA-256. The committed export is
95,982 bytes, SHA-256 `b01a07077dd5d508b4b695961d3a657420998e2e322b70f50a0928fa0b58663e`
(Playwright 1.56.1 Chromium on macOS; other platforms may differ by antialiasing).

Activate it with the rebrand, not before: set `og:image` and `twitter:image` to
`https://modwerk.app/modwerk-social-preview-v2.jpg`, keep the 1200 × 630 dimensions
and `image/jpeg` type, and use this alt text for both cards:

> Modwerk. Mods for Elektron instruments. Four branches connect the mod library,
> firmware builder, community forum and developer SDK to the Modwerk mark.

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
