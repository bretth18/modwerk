# Private MIDISC2.0 emulator measurements

These tools measure the actual pinned MIDISC2.0 MAIN image. They are explicitly
invoked developer diagnostics, outside `npm run check`, CI, source-build
automation and the visitor build flow. Firmware is never committed or uploaded.

Use a reviewed native octamad checkout with its already-built emulator and
libraries matching `native-inputs.json`, its Python virtual environment, a
verified local original 1.40C MAIN image, and a local project seed accepted by
the SDK's `stress_project` tooling. macOS `sandbox-exec` and the native C++
compiler are required. Changed native inputs require source review and new
measurement evidence; do not silently repin a mismatching library.

```sh
python3 -B scripts/midi-scenes-emulator/run.py \
  --native /private/local/octamad \
  --stock /private/local/section_3_MAIN_OS.bin \
  --project /private/local/project-seed \
  --output /private/local/aggregate-reports
```

The runner enters a network-disabled sandbox with an empty environment, limits
reads to explicitly selected inputs and reviewed tools, and permits writes
only in a disposable directory. It verifies the base, recipe, resulting MAIN
and native input hashes before execution. Only `emulator.json` and
`focused.json` leave the directory; temporary images, copied native source,
project/card files, raw RAM/LCD/PCM/UART replies and executables are removed
on success or failure. The two JSON reports contain addresses, hashes and
aggregate counters only. No firmware, source disassembly or memory contents
are retained. Run separately from any networked publication command.

`probe.cpp` calls the real ColdFire helper entries using synthetic state. It
checks return/stack restoration, state-edge and distant stack guards in all
360 cases; 270 clamp cases also assert the expected output. The other 90
cases exercise sparse pack/unpack, crossfader and ACT commit paths, but do
not prove complete persistence or MIDI output correctness.

`measure.h` records raw modeled cycles, instructions, observed stack use,
completed helper calls and addresses/extent of writes from patched PCs.
`run.py` adds the existing step callback to the native RTOS step paths in a
private copy, plus crossfader panel input and a MIDI output byte counter.
No firmware bytes, emulated CPU state, UI variables or control values are
changed by measurement. Calls are inclusive: stock callees and interrupt
work can contribute to their intervals. Stack minima are observations, not
upper bounds, and active calls at shutdown are reported separately.

`panel.py` sends real MKII keys/encoders/crossfader and MIDI UART input. It
compares instrumented and disabled runs using every command reply, frame/sample
progression, LCD/state fingerprints, panel UART hash and generated audio hash.
The 97-command stopped panel scenario also has a prior match against the
unchanged native emulator. `project.py` uses the reviewed SDK fixture helpers
for eight FLEX tracks, 24 audio LFOs and four dense/lock patterns. The generated sample path is project-relative `../AUDIO/STRESS_LOOP.wav`.
The runner rejects silent track stems and dropped audio frames. Both audio
FX slots are NONE. The workload is **not maximum stock FX load**. The per-track
stem metrics and MIDI byte count do not replace receiver validation, MIDI
message ordering, all mode/parameter branches or physical hardware testing.

The native machine selects MCF5206E timings, with zero-wait/cache-hit core
costs and inherited 68020 estimates for unsupported instructions/exceptions.
V4e semantic callbacks are not an exact V4e timing model; A-line operations
are unpriced in this raw counter. Counts are modeled observations. They do
not establish chip wall-clock cycles, a proven worst-case bound, cache/DMA
contention or a compatible real-time deadline. Never copy these maxima into
`tests.qualification.worstCase` without establishing those missing bounds.

Original Octamod harness additions: GPL-3.0-or-later, linking the native
emulator interfaces; see the retained [DSP emulator licence](../../sdk/octabam/licenses/dsp56300.txt).
Native octamad machine/CLI interfaces and fixture helpers retain Sam Banks'
and upstream contributors' notices. No native/vendor source or binary is
redistributed by this directory. The author MIDI Scenes patch retains its
separate MIT licence and source pin.
