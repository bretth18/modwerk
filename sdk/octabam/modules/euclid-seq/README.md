# Euclid Seq

Version: 0.1.0 · author: @bretth18

Agents: follow docs/ADD_A_MODULE.md and the guide for this module's category, docs/module-guides/playback.md (and docs/module-guides/sequencing.md if it acts in time), in the repository, including the thumbnail, complete tutorial and actual screenshots.

## Overview

Describe the sound, signal path and practical uses. This scaffold has not been tested.

## Controls

Document every active control, defaults, ranges, modes and interactions. Keep octamod.module.json synchronized.

## Usage

Give a useful starting configuration, prerequisites and the exact OT button/menu sequence. Keep the manifest access.location and access.steps synchronized.

## Quick tutorial

Publication requires at least three practical steps: setup/select, use the controls with an example, and verify the result/reset. Replace these draft instructions with actual steps and keep tests.qualification.documentation.tutorial synchronized.

## Compatibility and limitations

Declare supported hardware, base OS, slots, memory claims and conflicts. Do not publish unverified claims. DSP scaffolds start with an example effect ID: choose a free ID and add gate evidence before use.

## Tests and measurements

See [TESTING.md](TESTING.md). Draft costs must remain explicitly unmeasured. New modules and updates cannot pass publication checks until tests.qualification records worst-case cycles under modulation, exact memory accounting and passed real hardware stress-project evidence. See docs/MODULE_QUALIFICATION.md and the qualification.example.json template. All releases also require populated CPU, DSP core and memory gauges in resources.impact: rough load tiers with workload, rationale and source records. Complete resource-impact.example.json and copy it into the manifest; these estimates do not replace qualification measurements. See docs/MODULE_RESOURCE_GAUGES.md.

## Authorship and licences

Retain original authors and component licence texts. Only original or properly licensed code/media; no Elektron firmware, extracted routines or tables.

## Screens and audio

Publication requires complete README sections, a short tutorial and real black-and-white PNG screenshots in the same style as the online modules. Yellow/colored screenshots fail release validation. Capture with the monochrome MKII renderer; never substitute a reconstruction. Include screenshots and tutorial steps in tests.qualification.documentation and keep README synchronized. Publication requires real OT UI captures showing the chooser/enable location and all relevant main/setup/control pages. Capture hardware LCD pixels or the headless emulator framebuffer. Put PNG/JPEG/WebP images under media/, declare captions, alt text, authorship, rights and otUi page/version/build/setup provenance in the manifest, and reference them from access.screenshots. The empty screenshot list is draft-only; illustrations and reconstructed labels do not qualify. See docs/MODULE_UI_CAPTURES.md in the repository. Audio is optional.
