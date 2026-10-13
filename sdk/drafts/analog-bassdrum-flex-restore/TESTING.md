# Test the exact AB015FIX01 candidate

Candidate 0.1.5-experimental, MAIN OS SHA-256 `137580f326b6adc3b0d58f2183d530507f1b370c48911b38d5d0cf94d9e96898`, saved upgrade SHA-256 `5737e32c4823fffa3236469e82425b3eb53ba75da1d8d0a690b824eaefeb63e2`. See [private-build.json](evidence/private-build.json) for complete identity. The firmware version label is **AB015FIX01**; it contains Analog BD and stock DSP/FX except harvested SPRING REV. Output Matrix is absent. This is a private qualification build.

Use a disposable copy of a project and retain the supplied stock 1.40C recovery image. Record the actual model, displayed firmware label, steps and outcomes; unperformed steps stay unverified.

1. On MKII, assign two distinct Analog BD patches to T1 and T5 (different DSP cores), one 808 and one 909. Put trigs on both and confirm each plays independently. Change T1's controls, then reselect ANALOG BD; confirm its patch is retained.
2. Save the project with both tracks on Analog BD. Switch T1 through **SRC SETUP → FLEX → YES**, choose a known sample and leave T5 on Analog BD. Do **not** press SRC + PLAY. Check that FLEX has valid stock playback/SETUP defaults and the other track retains its patch. Power off, then on. Check that T1 is FLEX, T5 remains Analog BD, the other six machines/Parts remain as expected, and the sequencer runs beyond one step for at least two pattern loops.
3. Repeat the switch while playing, then power-cycle. Repeat on T5 while T1 remains Analog BD. Check the same machine/patch isolation and playback. Do not substitute LOAD PROJECT or USB disk mode for these physical reboots.
4. Switch away through the main track-machine chooser too. Repeat in another Part; return to the original Part and check its machines/patches. Save/load the project and power-cycle again. Include STATIC or THRU as another destination if used in your setup.
5. Play both retained Analog BD instances with your usual FX, locks, LFOs and scenes. After changing to FLEX, clear or retarget old SRC locks/scene/LFO destinations deliberately if they affect sample playback. Record duration and observed audio/persistence limits.

The reported halt with Output Matrix MATRIX mode needs its own exact combined build and physical test. Passing the stock-plus-Analog BD test above does not establish that combination's behavior.

## Reproduce software evidence

`python3 sdk/drafts/analog-bassdrum-flex-restore/apply.py` verifies the base and overlay fingerprints without compiling. `--output <fresh-private-sdk>` stages a private SDK with candidate source and version; run `build.py --sdk <fresh-private-sdk> --stock-main-os <owned-decoded-1.40C-MAIN-OS>` in the isolated native container. The script uses the exact static-stock recipe and BUILD=80 used for AB015FIX01.

Build `sdk/octabam/tools/emu/ot_emu` from the current staged source first and run its EMAC/peripheral gates. The toolchain image's bundled emulator predates CS1 boot options; use the newly built executable with `--emu`.

Run `verify.py --sdk <built-candidate-sdk> --output <private-json>` with GNU m68k tools and Unicorn 2.1.4 (CFV4E). This focused test executes no EMAC instructions. Run `reboot.py --sdk <built-candidate-sdk> --baseline-image <owned-approved-014-MAIN-OS> --project <owned-stock-fixture> --output <fresh-private-output> --emu <built-current-ot_emu>` in the reviewed `octamod-tapehead-qualification-tools` container with a read-only source mount, network disabled, dropped capabilities, no new privileges, 4 GiB RAM, two CPUs, 128 PIDs, 256 MiB shared memory and writable private output. Tool image ID is in the evidence. Project preparation only changes disposable copies. Raw outputs are never suitable for Git.
