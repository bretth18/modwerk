# VAC startup animation

Personal-fork artwork for the Octatrack's 128×64 LCD: the Virtuous Audio
Corporation **VAC** pixel logo, drawn as a 16×7 grid of 4×4-pixel cells
(64×28 pixels, 832 lit). The stock particle animation brings each cell in as
one block, sweeping left to right across V, A and C. Below it, a two-line
5×7 strip reads VIRTUOUS AUDIO / CORPORATION™.

This replaces the upstream Modwerk artwork on the `personal` branch only.
The stock 2.8-second timer, renderer and MKI/MKII LED choreography are
unchanged. `artwork.json` holds only authored pixel rows, layout facts and
SHA-256 guards for the two original graphic tables.

## Integration

`src/engine/startup-animation.ts` encodes the shared artwork and adds the two
guarded writes to static builds, the developer dynamic-loader path and the
standalone MIDI Scenes build. The replacement is mandatory infrastructure,
independent of module selection. Existing original-firmware validation and
atomic write-plan validation still apply. A changed graphic table or a second
application of the patch is refused.

For a native image already composed locally, use a separate private output:

```sh
python3 -B sdk/runtime/startup/build.py /private/local/mainos.bin /private/local/modwerk-mainos.bin
```

`build.py` is an independent Python encoder of the same artwork. It checks
both graphic guards before writing any output. It accepts images whose module
composition leaves those tables intact. Package the resulting MAIN image with
the existing firmware packaging tools; keep all firmware local.

## Layout and resource bounds

| Region | Address | Exact bytes |
| --- | --- | ---: |
| Particle records | `0x400a81fc` | 5,058 |
| Wordmark ink | `0x400c3c32` | 440 |

The 843 particle records each hold three signed big-endian 16-bit values. The
832 distinct mark pixels fill the first records; the remaining 11 repeat
points at identical final positions and delays, retaining the original record
count and loop bound. Every pixel of a logo cell shares one delay,
`250 − 10·column − 2·row` (cell units), so cells land as blocks from left to
right. All delays stay in the original 0–255 range. The renderer's smallest 7×7 sprite places its ink at (3,3), and the
renderer subtracts ten from the particle Y coordinate; final display coordinates
are therefore `(63 + X, 21 - Y)`.

The wordmark retains 110 columns, 15 rows, one 32-bit word per column and the
original opaque mask. The bitmap and LCD use reversed vertical coordinates;
the top visual row occupies bit 17 and the bottom row bit 31. No additional
flash bytes, RAM, stack, heap or sample-memory reservation are introduced.
Renderer and LED instructions are unchanged. No physical chip timing is claimed.

## Verification

With Node 24 and the local original MAIN OS 1.40C:

```sh
node scripts/verify-startup-animation-native.mjs /private/local/original-MAIN.bin /private/local/new-startup-report
```

The input can also be the owner's complete original `.bin` firmware; that adds
full firmware round trips, including preservation of its opaque tail and seed.
The private verifier compares complete browser/native image bytes for ten
profiles: core only, Repitch, Mini Verb, Tape Echo + Euclid, Analog BD,
Sidechain Compressor, USB Audio + Quantizer, standalone MIDI Scenes, the
developer dynamic-loader path and direct static composition with stock FX2.
It checks separation from other static write plans, changed-table refusals,
repeat-application refusal and original-input immutability. Temporary firmware
is removed; only a sanitized text report is retained.

Unit tests check exact table extents, bitmap orientation/padding, every final
mark pixel, bounded particle coordinates, per-cell delays and the V → A → C
order. The upstream [verification record](../../../docs/STARTUP_ANIMATION.md)
describes the Modwerk artwork; the VAC artwork has not yet been captured in
the emulator or run on a unit.

## Authorship and licence

VAC logo and wordmark © Virtuous Audio Corporation. Encoders © 2026 Modwerk
contributors, under the repository's GPL-3.0-or-later licence. Underlying Octatrack firmware and renderer
remain Elektron's property and are never distributed with this source.
