Describe the change in behavior, module version(s), compatibility and source/media attribution.

- [ ] Every changed module folder has a greater semantic version and exact catalog pin.
- [ ] Source and media are original or properly licensed; authors and full licence texts are preserved.
- [ ] No Elektron firmware, extracted routines/tables, upgrade files or other infringing material is included.
- [ ] Every new/changed module with OT UI has real screenshots of its location and relevant control pages, manifest `access` instructions, and `media[].otUi` version/build/setup provenance. Automatic USB modules without OT UI use the narrow `access.noUiReason` declaration for reviewer verification.
- [ ] I verified the captions, button/menu steps, screenshot authenticity and page coverage against the current module UI.
- [ ] TESTING.md records commands, results, exact source, conditions and limitations; emulator and hardware evidence are separate.
- [ ] CPU, DSP core and memory gauges are populated in `resources.impact` with rough load tiers, workload, rationale and source records. Reviewer: I checked the estimates; they do not imply exact hardware headroom percentages.
- [ ] `tests.qualification` contains worst-case cycle counts for every processor used, under parameter extremes, simultaneous modulation, mode changes and maximum load, within the declared real-time budget.
- [ ] Exact memory regions include code, state, tables, buffers, stack/heap, padding and shared allocations; words, word widths, bytes and maximum-instance totals agree with the native allocation/build report.
- [ ] This version/source/build passed a real MKI or MKII stress project for at least 60 minutes with all eight audio tracks active. Project fingerprint/recipe, tester, date, workload and audio/transport/control/memory/recovery results are recorded in local text reports.
- [ ] Reviewer: I verified the actual cycle/memory reports, coverage of modulation and maximum load, and hardware stress evidence against the submitted source/build. A declaration or emulator-only result is insufficient.
- [ ] Complete README/TESTING/licence/control/compatibility documentation, at least three practical tutorial steps and real black-and-white PNG screenshots match this version; README and `tests.qualification.documentation` are synchronized. Yellow captures do not qualify.
- [ ] Reviewer: I verified tutorial usefulness, all relevant control/page coverage, screenshot authenticity, exact access instructions and full documentation completeness.
- [ ] I rebased onto current main and ran module/version checks on this revision.

Validation commands and results:

Owner merge approves the exact source version. Failed source builds retain the previous publication. Metadata validation and successful assembly are not hardware qualification.
