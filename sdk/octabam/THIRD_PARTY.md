# Third-party sources

What this repository carries from elsewhere, under which licence, and where.
`LICENSE` covers the project's own code and documentation (MIT). It does not
replace the licences of adapted components or grant rights to Elektron firmware.
The official OS must come from the user's own local copy; original and generated
firmware images must not be uploaded, shared or redistributed.

Full copyright notices and licence terms for retained components are in
[`licenses/`](licenses/) and the generated
[`THIRD_PARTY_NOTICES.txt`](licenses/THIRD_PARTY_NOTICES.txt). The same bundle is
included in the static app and compiled module package artifacts. Its
[`manifest.json`](licenses/manifest.json) maps components to retained paths and
pins the upstream files used to verify each notice; those notice pins do not
replace the module source provenance recorded in `../UPSTREAM.json`.

Modulation's aggregate SPDX expression is **MIT AND ISC AND BSD-3-Clause**.
Spectrum and Character remain MIT, with the additional component copyright
notices and full terms retained in each module's `LICENSE`. An MIT project
declaration never removes a component's attribution or distribution conditions.
Keep the applicable notices with source subsets and binary distributions.

Run `npm run licenses:generate` from the repository root after a notice update;
`npm run licenses:check` rejects stale distribution copies, omitted module terms
and inconsistent SPDX declarations. Reviewer verification remains necessary for
new or changed sources; inclusion of notices is not automatic legal clearance.

The upstream attribution record below also mentions historical or development
components outside this SDK's retained subset. The notice manifest identifies
the paths retained here. References to measurements and mathematical laws are
attributions, not grants to copy manuals, papers, recordings or firmware.

## Transcribed into DSP modules

| source | licence | copyright | used in |
|---|---|---|---|
| jpcima `rc-effect-playground` — Hera (upstream `sources/chorus.dsp`, `sources/bbd_line.h`; historically called `HeraChorus.dsp` here) | ISC | Copyright (C) 2019-2020 J.P. Cimalando | `modules/modulation` JUNO; [full notice](licenses/hera.txt) |
| pendragon-andyh Juno-60 chorus measurements | data | Andy Harman | `modules/modulation` JUNO (rates, delay ranges) |
| Roland SDD-320 Dimension D service notes + published measurements | laws only | — | `modules/modulation` DIM (the mix amounts were voiced here, not taken from the notes) |
| J. Dattorro, *Effect Design Part 2*, JAES 45(10), 1997 | paper (laws) | AES | `modules/modulation` FLNG (Table 6) |
| Mutable Instruments Rings `string.h` / `string.cc` | MIT | Copyright 2015 Emilie Gillet | `modules/modulation` COMB; [full notice](licenses/rings.txt) |
| ChowDSP ChowPhaser (Schulte Compact Phasing A model) | BSD-3-Clause | Copyright (c) 2020, jatinchowdhury18 | `modules/modulation` PHSR; [full notice](licenses/chowphaser.txt) |
| Airwindows Pockey | MIT | Chris Johnson | `modules/character` TXTR, 13 to 22 Sep 2026 (removed; `git show OCTABAM43:modules/character/pockey_ref.py`) |
| JClones TapeHead, DaTube, OInflator, AC1 (JSFX) | MIT | Copyright (c) 2026 JClones | `modules/character` SAT (TAPE / TUBE / INFL), COMP / GLUE; [full notice](licenses/jsfxclones.txt) |
| audiojs/filter `moogLadder`, `oberheim` (Zavalishin's zero-delay forms) | MIT | Copyright (c) Dmitry Iv | `modules/spectrum` LADR, LP / BP; [full notice](licenses/audiojs-filter.txt) |
| markandrus/octemu `custom/coldfire/usb-midi.s`, `custom/usb-midi.py` (descriptors) | MIT | markandrus | `platform/usb-midi` (his text; one ISA-B substitution, README) |
| markandrus/octemu `custom/coldfire/usb-audio.s`, `custom/usb-audio.py` (descriptors) | MIT | markandrus | `modules/usb-audio-out-tracks-main-cue` (his shims, producer, packet builder and servo; the loader replaces his card payload machinery); `modules/usb-audio-out-tracks` and `modules/usb-audio-out-master` assemble the same source with fewer channels |
| markandrus/octemu `src/board/ot-board.c` USB packet bench (line protocol) | MIT | markandrus | `tools/emu/ot_emu/usb.h` speaks the same protocol so his `tests/usb-host.py` drives the port; the model is written here |
| Airwindows Capacitor2 | MIT | Copyright (c) 2018 Chris Johnson | `modules/spectrum` ISO (`capacitor2_ref.py`); [full notice](licenses/airwindows.txt) |

Retired transcriptions (in history only): jpcima `string-machine` (BSL-1.0,
the Solina ensemble, removed 16 Sep 2026).

`docs/effects/PORTS.md` is the survey behind the modulation and station
ports, with the sources that were read for laws only (GPL code was never
transcribed).

## Firmware modifications built from their authors' repositories (git submodules)

| module | upstream | licence |
|---|---|---|
| `modules/midi-scenes` (MIDI SCENES) | https://github.com/bkkbrls-del/midisc | MIT (the repository's LICENSE file, added by its author 9 Sep 2026, carries octabam's copyright line verbatim) |
| `modules/octakit` (Octakit) | https://github.com/emuyia/ems-octakit | MIT, Copyright (c) 2026 June Kiff |
| `tools/remix/loader.S` (the DRAM loader) | derived from Octakit's `runtime/loader.S` | MIT, Copyright (c) 2026 June Kiff |

`modules/kits-reload`, `modules/scenes-kits`, `modules/cc-map`,
`modules/tempo-sync`, `modules/mode-defaults`, `modules/flex-seekbind*`,
`modules/recorder-spacing` and `modules/lofi-amf-fix` are written here
(sambanks; the LO-FI fix from Bryan T's finding) and carry `LICENSE`.

## Emulator and panel from a fork of this repository

| source | licence | copyright | used in |
|---|---|---|---|
| Tim Hastie, [timhastie/octa-panel](https://github.com/timhastie/octa-panel) at `be68244` (a fork of octabam, 10-25 Sep 2026) | MIT (the fork's `LICENSE` is octabam's, copyright line unchanged) | Tim Hastie (his changes) | `tools/panel/` (the virtual front panel, the macOS app, the key/LED map and its evidence); `tools/emu/ot_emu` (`--interactive`, pacing, the DSPI RTC, DMA timers DTIM0-3, event-horizon bursts, the page-table memory path, lazy DSP batching, `--dsp-rt`, bounded records, card write-back, memory-to-memory eDMA copies, per-track taps; `oracle/`, `pgo.sh`); the `--dsp-rt` hunks of `tools/patches/dsp56300.patch`; `docs/firmware/COLDFIRE_PORT.md` (his milestones O14i-O24) |
| Mark Roberts, [markandrus/octemu](https://github.com/markandrus/octemu) `assets/panel/gen_svg.py` | MIT (Copyright (c) 2026 Mark Roberts) | Mark Roberts | `tools/panel/skin/gen_svg.py`: the MKII front panel drawn as SVG (geometry measured from photographs of a unit, keys, knobs, fader, LEDs, the lighting classes); octabam added the `dark` palette and an output directory |

## Analysis tooling

Portions of the firmware analysis tooling originate from
https://github.com/mxldyn/octamax, Copyright (c) 2025-2026 Maxolydian, MIT
(`LICENSE`).

`tools/ghidra/processors/DSP56300/` (the DSP56300 processor module) and
`tools/ghidra/patches/coldfire-emac.patch` (ColdFire ISA_C/EMAC in Ghidra's
68000 module) were written for this repository by Robert Gay and are offered
to Ghidra upstream as `roblg/ghidra` #3 and #2. They carry Ghidra's
licence, Apache-2.0, in each file's header so they can go upstream as they
are; the patch is a diff against Ghidra 12.1.4's
`Ghidra/Processors/68000` (Apache-2.0, National Security Agency).
`make ghidra-install` adds both to a copy of your own Ghidra release; no
Ghidra file is committed.

## Fetched by `make setup`, never committed (`vendor/`, gitignored)

| what | licence | note |
|---|---|---|
| dsp56300 (DSP56300 emulator; `dsp_asm` / `dsp_host` are additions written here, under `tools/harness/dsp_host/`) | GPL-3.0-only | source patch retained in `tools/patches/`; [full terms](licenses/dsp56300.txt); built toolchain binaries are not bundled |
| joelanders/mc68k-md-mm (Musashi-derived ColdFire core) | GPL-3.0 | pinned commit in `scripts/setup.sh` |
| mischa85/elektron-firmware-tool | MIT, Copyright (c) 2026 Marcel Bierling | `tools/patches/elektron-firmware-tool.patch` |
| Unicorn (via `.venv`, `make emu-setup`) | GPL-2.0; QEMU m68k helper/translation portions LGPL-2.1-or-later | `tools/patches/unicorn_emac_fractional.patch`; [GPL terms](licenses/unicorn.txt) and [QEMU copyright notices / LGPL terms](licenses/unicorn-lgpl.txt); built toolchain binaries are not bundled |

React, React DOM and Scheduler used by the browser UI retain their MIT notice
(Meta Platforms, Inc. and affiliates) in the shared bundle. The notice check
compares all three installed runtime licences so dependency updates cannot
silently change the terms being distributed.

FM Synth documented draft: `sdk/octabam/modules/synth/upstream` retains Tim Hastie’s FM Synth and matching Scale Quantizer sources (MIT, full author notice retained) at `timhastie/octatrick-modules@525f4b19b04dc3ba3f3bae3b25abbf48df34a10a`. Sam Banks’ wrapper documentation/licence is pinned to `sambanks/octabam@949f3be15eae5d3d16a7682b9e3218d42f6c1284`. The import inventory records adapted hashes, removed stock byte expectations and authored dedicated-machine transport. This draft is not a released module or qualification exemption.
