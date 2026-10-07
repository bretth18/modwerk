# Play Modes: hardware report (functional, author-reported)

- Tester: devilfish707 (the author), Octatrack MKII, OS 1.40C.
- Image: octamod test image `playmodes-test` (this module and the stock
  effects), build 19, source Octaplay `1d2e9dc`; MAIN OS SHA-256 recorded in
  `tests.qualification.imageSha256`.
- Date: 7 Oct 2026. About 15 minutes of interactive use on this build, after
  builds 12–18 on 3–7 Oct (TESTING.md).

Reported working on build 19: PINGPONG 2 (the end steps twice); per-pattern
modes across pattern switches; save and reload of the project; modes back
after a power cycle; pattern copy / paste, also into other banks; clear
pattern. Earlier builds: the modes, the popup, the trig LEDs following the
played step, PLAY restarts, PER TRACK lengths, MASTER LENGTH INF, pattern
changes across banks and tempo changes (TESTING.md).

Limitations: a short interactive report, not a timed stress run; no audio
or timing measurement; one unit (MKII), no MKI; micro-timing, trig
conditions, slides, live recording, scenes and Parts during non-NORMAL
playback, and MIDI tracks beyond a first check were not tested on purpose;
no combination with other modules on the unit.
