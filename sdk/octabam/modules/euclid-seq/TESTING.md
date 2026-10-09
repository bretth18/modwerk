# Euclid Seq testing

## Commands and exact revision

No checks have been run. Record the tested source commit and every command/result after implementation.

## Hardware and audio quality

Test on a real MKI or MKII. There is no minimum duration or track count: record what you actually ran. Exercise parameter extremes, LFO/p-lock/MIDI/scene modulation, mode/Part/bypass changes and the most instances you support; say why any case does not apply. Record tester, date, model, local firmware build SHA-256, native-source SHA-256, workload, duration, results and limitations. Keep emulator evidence separate from hardware results.

## Stock flows

Not run. List the stock flows you compared with and without the module (menus and pages it does not own, button shortcuts, saving and loading, Parts and patterns, scenes, recording, MIDI, USB, timing) and what you saw; a flow you did not run is "not tested". List every deliberate change to a stock flow here and in the README (what, why, what a musician sees, how to turn it off). Guide: docs/module-guides/README.md, Leave stock flows alone.

## Performance

Not run. New modules need evidence/performance.json: worst-case cycles, a benchmark against the closest stock effect (a MIDI module: against the stock image under the same flood) and a stress run. Start from npm run perf:audit -- template coldfire, measure, then npm run perf:audit -- check <file> and paste the table here with the commands. Guide: docs/module-guides/README.md, Performance.

## Resources

Unmeasured: publication is blocked. Record worst-case cycles for every processor used, per-instance and maximum configuration, units and real-time budget, including branch/mode changes and modulation. Inventory exact code/state/table/buffer/stack/heap/padding memory by address space, word width, words, bytes and instance/shared scope. Include per-instance, shared and maximum-instance totals; compare against the native allocation/build report. Attach local text reports, never firmware or project/card dumps. Fill tests.qualification only with actual results.

## Hardware

Untested. Never infer hardware safety from assembly or a green metadata check.

## OT UI capture evidence

Pending: capture the actual location and relevant control pages. Record the local image SHA-256, module version, emulator source/binary identity or hardware model, prerequisites, panel sequence and exact capture commands. Retain only screenshots and metadata; never firmware, memory dumps, cards or private logs. UI captures do not establish audio or hardware qualification.
