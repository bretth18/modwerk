# USB Audio testing

Version: `0.1.3-experimental`. Octabam evidence pin: `363861e31ee963c478fab2b190a0fabe1d7ce37b`; USB MIDI receive path from `4caa196594bb16ab0dc4710f1b8d2adf95010cdf`.

Selected for the broadest recorded hardware evidence: MKI and MKII, sustained multi-track 24-bit captures and high MIDI receive traffic. The latest source includes track/MAIN alignment and a hardware-tested master-on CUE correction; startup artifacts and unmeasured host/platform cases remain.

## Integration status

Octamod loader-free composition is implemented at this version. The native matrix covers all 256 subsets of the eight visible modules with stock FX2 omitted, plus 32 stock-FX2 profiles: 156 byte-identical OS compositions and 132 matching refusals. The actual production-bundle browser worker produced complete native-identical files for the six-module and Analog BD five-module combinations and rejected altered base firmware. GNU link proofs cover all 15 nonempty combinations of the four requested runtime groups. See docs/VERIFICATION.md for file identities, reproduction and coverage limits. No DSP execution, emulator, audio-render or stress suite was run.

## Historical gates

- `tools/verify/verify_usb.py` (upstream record; not run here).
- `tools/verify/verify_usb_align.py` (upstream record; not run here).

These gate references belong to the pinned upstream tree. Author encoder/regeneration tooling and the updated native builder are not all part of this trimmed SDK. Use the exact pinned upstream for reproduction in isolation; never run unreviewed code on a trusted host.

## Release and hardware requirements

- Review imported rights, source pins and authored code; owner merge approves this exact module version.
- Release automation must reproduce the committed source packages from the exact owner-merged commit.
- Recover every stock instruction/helper/table locally with fingerprint validation. Never put stock into automation or committed packages.
- Renew native and actual-browser parity and rejection evidence when composition code or module sources change.
- Record hardware limits separately; historical results do not qualify the imported revision.

USB MIDI lives under `../../platform/usb-midi/`. It is an internal requirement, not another public catalog option. The output-only twenty-channel layout was selected for MKI/MKII and sustained-stream evidence. USB input and USB CROSSBAR are not imported because this selected output does not require them.

Octamod 0.1.1-experimental: browser composition uses reviewed source packages and derives inherited bytes from local 1.40C. The native matrix passed 156 byte identities and 132 refusals. The owner reported both combined native test images working on 1 October 2026; detailed feature/load qualification is not claimed.

## OT UI publication exception

Version 0.1.2-experimental adds host/device access instructions and the
`access.noUiReason` declaration. No dedicated OT page or controls are added
by this automatic USB contribution; no unrelated stock screenshot is supplied.
The reviewer must verify the exception against the exact upstream pin before
publication. No source was executed and no USB or firmware tests were run for
this documentation change.

## 0.1.3-experimental: USB MIDI clock sets the tempo (7 Oct 2026)

Reported for 0.1.2-experimental on an MKI (issue #223): with CLOCK RECEIVE
on and clock arriving over USB, the sequencer followed but the TEMPO page
kept the old value. The firmware's clock handler (`0x40005a48`) builds the
tempo from the DTCN0 interval the UART0 ISR stores for each `0xF8`; the USB
decoder enqueued the byte without that interval.

- `usbmidi_rx.s`: octabam's file at `4caa1965`, unchanged (octabam #629,
  #633). It timestamps each `0xF8` as the UART0 ISR does and makes room in
  the 32-byte MIDI FIFO before each event.
- `usbaudio.s`: `audio_isr_shim` jumps to `usbmidi_rx_isr_shim` instead of
  `usbmidi_isr_shim` (octabam `97a781c0`). The rest of `usbaudio.s` is the
  `363861e` source.
- Not taken: octabam's SET_CONFIGURATION shim, which re-sizes the high-speed
  RX transfer to 512 bytes. Installing it would change the shared USB MIDI
  platform package; without it `usbmidi_rx_state` stays 0 and the receive
  transfer keeps the firmware's 64 bytes, as in 0.1.2.

Upstream evidence: `verify_usbmidi_clock` under the ColdFire port read 1200
and 1498 for USB runs at 50 and 40 ms per tick (want 1200 and 1501), and
2400 for both before the change; Kazeko's MKI reported USB clock working
after the change (octabam #633, 6 Oct 2026). Those runs used octabam's
`usb-midi` remix, not this module. Here nothing was run on a unit or under
the port: the verify gates and the emulator's DTIM0 change are not part of
this SDK.
