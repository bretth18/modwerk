# Architecture decisions

## Repository and source provenance

The React frontend, community API, Octamod SDK, module sources, developer documentation and release tooling live in one repository. The SDK is a distinct directory and developer entry point. Preserve upstream octabam provenance, module authorship and applicable licences. Firmware, downloads, native build outputs, caches, secrets and local development notes do not belong in the public source tree.

Module page content comes from `sdk/octabam/modules/<id>/octamod.module.json`, generated through `scripts/modules.mjs`. Keep the strict schema, README, TESTING, licences and version pins synchronized.

## Hosting and API boundary

GitHub Pages serves the static frontend, supporting project URLs and root/custom-domain URLs. Hash routes work without server-side rewrites. Releases must come from an exact owner-merged PR commit; manual runs must prove the same approval.

A separate Cloudflare Worker with D1 serves the initial community backend. R2 remains an optional media store; reviewed module media is served with the static site, so the current Worker has no R2 binding. The frontend uses a configurable public API URL. Same-origin Cloudflare Pages remains a supported fallback.

Keep the HTTP contract independent of the hosting provider. A future self-hosted backend can use SQLite and file/object-storage adapters; these adapters and a self-hosted entry point remain unimplemented. Keep the core experience free of paid dependencies and within initial hosting free-tier constraints.

Cross-origin guest requests use an opaque device session in a bearer header, without third-party cookies. CORS and mutations are restricted to the configured frontend origin. No session token appears in a URL. See [app development and operations](APP_DEVELOPMENT.md) for setup.

## Local firmware and build qualification

Firmware stays on the user's device throughout import, persistence, composition and download. Verified original OS 1.40C is stored in browser IndexedDB, revalidated on restore and removable from the device. Firmware never enters uploads, synchronization, logs or configuration exports.

Never distribute Elektron firmware, extracted routines/tables or stock-containing generated artifacts. Derive stock content from the user's own verified file at composition time. SDK automation compiles original or properly licensed module source only, without firmware.

Configuration builds perform compatibility, placement and packaging integrity checks. They do not run the octabam stress/emulator suite. Downloads require real browser composition, native byte-parity and rejection evidence and container validation. The active path composes verified selections without the dynamic DSP loader, which remains disabled after its hardware failure. Byte parity does not establish hardware safety. See [verification status](VERIFICATION.md) for evidence and remaining qualification.

## Contributions and approval

New modules, updates, documentation and media are submitted through GitHub pull requests. Owner merge approves that exact module version; there is no second website approval step. Every source, documentation, evidence or media change requires a strictly greater semantic version. Pending or rejected updates and failed release builds preserve the previous approved publication.

Approved packages bind source commits, versions, compiler records and immutable artifact hashes. No arbitrary repository code runs in the website or metadata importer. Isolate source compilation from network, credentials, firmware and publishing rights; publish only packages reproduced from the reviewed source.

New modules and updates with an OT UI require actual location/control screenshots and manifest access steps, with version/build/setup provenance. Automatic USB modules without an OT page use the narrow reviewer-verified exception. See [OT UI captures](MODULE_UI_CAPTURES.md).

On 2 October 2026, the owner required hard gates for worst-case cycle counts under parameter modulation/mode changes/maximum load, exact memory accounting, and passed real-hardware stress-project evidence. `tests.qualification` binds numeric counts, budgets, memory regions/totals and hardware records to the submitted version, native-source hash and local image hash. Hardware requires at least one hour with all eight audio tracks active and passed audio/transport/control/memory/recovery checks. Local/PR/release validation rejects missing or inconsistent evidence; the owner verifies actual reports before merge. Release additionally requires complete module documentation, a short practical tutorial and real PNG screenshots matching the black-and-white/gray style of the online modules. The gate checks populated README sections, matching tutorial steps, screenshot references and actual monochrome pixels; yellow captures fail. The owner verifies documentation completeness and authenticity. Metadata validation does not perform the physical test.

The eleven current module versions and complete folder fingerprints are retained through a frozen baseline, with existing measurements, historical labels, suspensions, pending builds and download restrictions intact. Later source, documentation or media changes lose the exemption and must qualify. Never expand/rewrite the baseline or invent missing measurements. See [the qualification contract](MODULE_QUALIFICATION.md). Visitor builds remain lightweight and never run the qualification suite.

Require original or properly licensed sources and media, attribution, contributor declarations and reviewer verification. Distinguish illustrations, emulator evidence and hardware results. Review is not automatic legal clearance. See [contribution rules](../CONTRIBUTING.md).

## Guest community and private administration

Comments, reviews, ratings, likes and author-directed issues require no visitor account or email. GitHub authentication is used on GitHub itself for pull requests; Octamod has no website GitHub sign-in.

Administration uses separate server-side authorization. Every administrator route must reject access without valid backend authorization. Issue reports and moderation history remain private; reporters can read only their own reports. Do not expose private routes or use frontend-only access checks.

## Catalog scope and pins

The catalog scope is Spectrum, Modulation, Character, Mini Verb, Tape Echo, Euclid and Repitch, plus Analog BD, MIDI Scenes, USB Audio (tracks + MAIN/CUE) and Scale Quantizer. Include their required internal platform dependencies; other octabam modules remain outside scope. Scope does not imply current availability or hardware qualification: Spectrum, Modulation and Character are temporarily suspended. See the app guide and verification record for current supported selections and hardware limits.

The original seven retain their initial native composition revision `b8deefc88b2c3e5f3c6158e364eb741df1924e1d`. The four additions are imported from octabam revision `363861e31ee963c478fab2b190a0fabe1d7ce37b`; MIDI Scenes retains its author's `63ca127bc99638602957f2b05747f8ed3bd9ba52` (1.40MIDISC8.2), and Quantizer retains `525f4b19b04dc3ba3f3bae3b25abbf48df34a10a` (v2.9).

CC Map, requested on 2 October 2026, is staged under `sdk/drafts/cc-map/` at octabam `8d0ad6f4f82c2efbc10e1c65eefbce0ad1cec4bf`. It remains outside native discovery, compilation and the public catalog until full qualification, integration and owner review are complete. An original thumbnail and six actual monochrome MKII emulator LCD captures accompany the versioned documentation; UI evidence is not hardware qualification. Preserve Sam Banks’ MIT source and recorded stock-vector guard adaptation; never add it to the frozen eleven-module baseline. The FX1 block maps CC 68–73 to page 2; its FX2 block requires BusDelay/BusVerb, which remain outside scope. See [the draft](../sdk/drafts/cc-map/README.md) and [source identities](../sdk/imports/cc-map-8d0ad6f.json).

USB Audio uses the output-only TRACKS MAIN CUE implementation and its internal USB MIDI dependency under `sdk/octabam/platform/usb-midi/`. This choice follows documented MKI/MKII hardware coverage, sustained multitrack captures and concurrent MIDI traffic; it is not a new comparative hardware test. USB input and other output layouts are outside scope. Preserve documented startup artifacts, host coverage gaps and alignment limits.

The additions retain their own source pins and separate loader-free composition, packaging and rejection evidence; the original seven modules' historical proofs do not cover later integrations by themselves. No firmware/DSP/emulator/stress tests ran during the source import. See [the import record](../sdk/imports/octabam-363861e.json), each module's TESTING.md and the [current verification record](VERIFICATION.md).
