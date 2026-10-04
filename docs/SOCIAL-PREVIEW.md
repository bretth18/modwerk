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
lockup and “Mods for every Elektron machine.” sit above a sixteen-step trig row whose
four beat steps are the four features: Mod library, Firmware builder, Forum and
Developer SDK. One of each machine silhouette stands below. The feature labels are
sized to stay legible at 600 × 315 and 400 × 210.

The machines (Octatrack, Digitakt, Syntakt, Analog Rytm, Analog Keys, Analog Heat,
Model:Cycles) are drawn with the site's schematic `DeviceArt` rules. They are generic
line drawings, not product likenesses or captures, and say nothing about which
machines have mods yet. The artwork states that Modwerk is independent and not
affiliated with Elektron.

### Mark

`public/modwerk-mark.svg` (dark backgrounds) and `public/modwerk-mark-on-light.svg`
(light backgrounds) are the Modwerk mark: eight tiles centred in a frame that opens
at one corner, where an apricot ninth tile, the mod, slides in. The artwork embeds
`modwerk-mark.svg` as-is, so a change to the mark changes the preview on its next
export. `public/favicon.svg` is still the Octamod mark; switching it belongs to the
rebrand.

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
98,003 bytes, SHA-256 `45e6a81189a622a9db04afcc09befe899f2a2fb7b9ba4ae6296795abebebe29d`
(Playwright 1.56.1 Chromium on Linux; other platforms may differ by antialiasing).

Activate it with the rebrand, not before: set `og:image` and `twitter:image` to
`https://modwerk.app/modwerk-social-preview-v2.jpg`, keep the 1200 × 630 dimensions
and `image/jpeg` type, and use this alt text for both cards:

> Modwerk — Mods for every Elektron machine. Four highlighted steps of a sequencer
> row show the mod library, firmware builder, forum and developer SDK, above a row of
> Elektron machines.

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
