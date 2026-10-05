# Octatrack SDK

**Platform:** octabam · **OS:** 1.40C (MKI and MKII share one image) · **Modules:** [`sdk/octabam/modules/`](../../octabam/modules/) · **Catalog:** [`sdk/catalog.json`](../../catalog.json)

Octatrack modules build on [octabam](https://github.com/sambanks/octabam) (MIT, © Sam Banks), vendored under `sdk/octabam/` with its provenance in `sdk/UPSTREAM.json` and `sdk/imports/`. DSP effects run on the DSP56300; machines, MIDI and USB modules run on the ColdFire CPU. Modwerk's browser engine composes them from each owner's stock 1.40C file.

- To add, port or update a module, follow [Add or port a module](../../../docs/ADD_A_MODULE.md).
- [The SDK README](../../README.md) describes the layout and the native verifiers.
- Octatrack modules use contract v2 (`octamod.module.json`) with the qualification gates in [MODULE_QUALIFICATION.md](../../../docs/MODULE_QUALIFICATION.md) and the frozen eleven-module baseline. They move to contract v3 (see [the SDK guide](../../../docs/SDK.md)) at their next version.
- OT UI captures follow [MODULE_UI_CAPTURES.md](../../../docs/MODULE_UI_CAPTURES.md).

Recovery: hold FUNC while powering on, choose MIDI UPGRADE and send the stock .syx over 5-pin DIN MIDI.
