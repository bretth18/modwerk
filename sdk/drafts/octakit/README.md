# OctaKit

Version: `0.1.0-experimental` · author: June Kiff (@emuyia).

Requested on 2 October 2026. **Source draft only; publication and firmware
builds are blocked pending qualification and owner review.** The draft lives
outside `sdk/octabam/modules/` so neither the native registry nor the public
catalog discovers or executes it. The eleven existing module folders and their
frozen qualification baseline remain unchanged.

OctaKit replaces 64 bank-tied Parts with 256 project-wide Kits. It provides
LOAD KIT, SAVE KIT, seven-character Kit names, reload, slot copy/paste/clear/undo
and pattern-plus-Kit copy workflows. Old projects migrate their Parts to the
first 64 Kit slots. **Back up projects before use; returning to stock may lose
Kit data.** Upstream reports a Flex-pool reduction of 3.6% (18.4 seconds at
16-bit or 12.3 seconds at 24-bit). These are upstream descriptions, not new
Octamod hardware findings.

## Source and credits

- [octabam integration](https://github.com/sambanks/octabam/tree/8d0ad6f4f82c2efbc10e1c65eefbce0ad1cec4bf/modules/octakit), Sam Banks, MIT.
- [Em's Octakit](https://github.com/emuyia/ems-octakit/tree/c6d3f3927b13fda0cf03711157237b837acdb1f9), June Kiff, MIT; recipe `ot-26914-152100`.
- [Import identities](../../imports/octakit-8d0ad6f.json), including exact commits, source paths, Git blob identities and SHA-256 values.
- [Original octabam notes](OCTABAM.md), [author instructions](upstream/README.md), [integration licence](LICENSE) and [author licence](upstream/LICENSE).

`manifest.py` and the author's runtime sources/recipe are unchanged. The
required runtime subset is vendored as regular text files, with no Git history,
gitlinks, standalone author patcher, build outputs or extra octabam modules.
Native paths still describe the eventual `modules/octakit/` location; this
draft is deliberately not a runnable standalone module. No imported source was
executed during the import.

The runtime uses locally recovered stock instructions. Only the sparse authored
writes, hashes and local-copy/relocation recipes are retained: the recipe never
supplies the stock bytes. Its `.incbin "stock/NNNN.bin"` references must be
resolved from the user's own verified 1.40C in a private local build. Do not
commit generated routines, runtime blobs or images, or give firmware to
source-build automation. The runtime cannot be shipped as a stock-free binary
without an adapted local reconstruction/composition path.

## Access

These steps are transcribed from the pinned author README and synchronized with
`octamod.module.json`. Actual LCD captures and confirmation on each supported
panel are still required; no illustration or reconstructed menu is evidence.

1. Back up the project before opening it in an OctaKit build.
2. MKII: press PART for LOAD KIT. MKI: hold FUNC and press MIDI.
3. Select a Kit and press YES. LOAD KIT > UNDO KIT recalls the last loaded Kit.
4. MKII: FUNC+PART opens SAVE KIT. MKI: FUNC+BANK opens SAVE KIT.
5. Select a slot and confirm; names have up to seven characters. FUNC+PART+YES
   (MKI: FUNC+BANK+YES) skips the name prompt.
6. FUNC+CUE reloads the assigned Kit. LOAD/SAVE KIT supports slot
   copy/paste/clear/undo.
7. Pasting with FUNC+PASTE+PART (MKI: FUNC+PASTE+MIDI) also saves the assigned
   Kit to the next available slot.
8. PTN+FUNC+RIGHT saves the Kit, copies it and the pattern to the next available
   slots, then loads the new pair. PTN+FUNC+TRIG manages inactive patterns;
   BANK+TRIG followed by BANK+FUNC+TRIG reaches patterns in other banks.

There are no DSP knobs or effect chooser entry. The Kit menus still require
location and relevant control-page captures; the automatic USB no-UI exception
does not apply.

## Integration and qualification

See [TESTING.md](TESTING.md) for known evidence and the remaining work. The
unchanged native manifest's `Proof.HARDWARE` describes historical upstream use,
not qualification of this Octamod version. Its verification gate belongs to the
exact upstream tree and is not executed or treated as passing here.

Before promotion, review native hook ownership and shared arena placement with
the scoped modules. MIDI Scenes, Scale Quantizer and all other combinations
remain unverified; do not add out-of-scope bridges or infer compatibility from
upstream remix names. Preserve the native remixer as the composition oracle.

Complete `qualification.example.json` with actual measured results, bind
`tests.qualification` to this module version/native-source/local-image hashes,
and complete the documentation/tutorial gate with actual monochrome/gray OT LCD PNGs, matching access/tutorial steps and `access.screenshots` provenance. Supply a
contributor declaration and owner verification of rights and reports. Only a
qualified version can move to `sdk/octabam/modules/octakit/` and be proposed for
the version-pinned catalog through a PR; owner merge is approval. Every later
source, documentation or media change needs a greater semantic version.
Stock-free packaging, local stock reconstruction and real browser/native
byte-parity/rejection evidence are additional requirements before enabling
firmware builds. Do not expand or regenerate the frozen baseline to admit it.
