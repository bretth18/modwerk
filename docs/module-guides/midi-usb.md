# MIDI and USB

Read [the module guides index](README.md) first. A module that sends or reacts to MIDI clock or notes in time also follows [sequencing.md](sequencing.md).

**Applies to** modules with manifest `category: midi-usb`, including MIDI generators and MIDI effects (below). [CC Map](../../sdk/octabam/modules/cc-map/README.md) maps MIDI CC 68–73 to FX1 SETUP controls. [USB Audio](../../sdk/octabam/modules/usb-audio-out-tracks-main-cue/README.md) sends eight stereo tracks, MAIN and CUE over USB.

## Behave like the instrument

- [ ] **A complete message map in the README:** every CC, note, channel and SysEx value you read or send, what it does, and the range. CC Map lists CC 68–73 and what each one controls.
- [ ] **Say what you consume.** CC Map's limitation list says CC 62–73 are consumed even when AUDIO CC IN is disabled. State for every message whether it is passed through to stock handling, consumed, or both.
- [ ] **Do not break common messages.** CC 64–67 overlap sustain, portamento, sostenuto and soft pedal. List overlaps with common controllers, and what a musician loses.
- [ ] **Use the stock enable and channel settings.** CC Map is enabled with the stock AUDIO CC IN checkbox and follows the track's TRIG CH. Do not add a private channel setting. State the default, and what happens when the setting is off.
- [ ] **Feedback.** When a MIDI message changes a value, the panel shows it (`verify_ccfeedback.py`), including values that are parameter-locked or LFO-modulated at that moment. **Verify** the interaction and record the result.
- [ ] **Parameter locks and LFOs.** A CC-driven parameter and a lock or LFO on the same parameter: say which wins, and test it.
- [ ] **USB:** the device enumerates as the instrument's own identity, with the interfaces the host expects (`verify_usb.py` checks the Elektron 1935:0002 identity, the MSC interface and the INQUIRY and CSW responses). Sample alignment and channel layout are tested (`verify_usb_align.py`, `verify_usb_in.py`), startup behaviour is stated (USB Audio reports a reordering burst 0.5–1.5 s after the stream opens), and the hosts you measured are named: "Windows and Linux hosts have not been measured" is a legitimate sentence, an omission is not.
- [ ] **Dependencies are explicit.** USB Audio brings the internal USB MIDI module; only one USB output layout can be composed.

## MIDI generators and MIDI effects

A **MIDI generator** makes notes or controllers from the transport (an arpeggiator, a Euclidean or probability sequencer, a chord or CC sequencer). A **MIDI effect** changes a stream that already exists (transpose, scale and chord mapping, velocity curves, humanise, delay and echo, filtering, channel and port routing). Both are ColdFire code, so the manifest has `category: midi-usb` and `compatibility.location: MIDI tracks` (or `Project sequencer` when it acts on the whole project), and they carry a `coldfire` performance record. A generator follows [sequencing.md](sequencing.md) completely: the instrument's own transport, tempo, track speed and swing, never a clock of your own. Copy the shape of the closest existing module, and agree the design with the owner before you spend long on one that has no precedent: no module here yet generates or transforms MIDI notes (CC Map maps controllers only), so there is no worked example for the notes.

- [ ] **Every note-on gets its note-off.** On stop, on a change of Part, pattern or channel, when the module is bypassed, when a parameter change would move the note, and when the module is removed from a running project. **Verify** each and record the result; a stuck note is the failure musicians notice first.
- [ ] **Velocity 0 is a note-off** and running status is understood, as on the wire.
- [ ] **Say what passes through.** Real-time messages (clock, start, stop, continue), SysEx and every message type you do not touch pass through unchanged and in order, including in the middle of your output. State it per message type, as above.
- [ ] **No loops.** MIDI thru plus a module that sends to the same port can feed itself. Say what stops it.
- [ ] **Bounded work and bounded output.** The most events you emit for one input (a chord of eight, a ratchet of sixteen, an echo with feedback) is a number, it is documented, and the output queue's behaviour when full is documented too: drop what and count it. A feedback echo must decay.
- [ ] **Latency and jitter.** State the latency you add and whether it varies. A transform that is not allowed to move notes in time adds none; a look-ahead is stated and the same offset is applied to what it should line up with.
- [ ] **Polyphony and channels.** The number of simultaneous notes, what happens at the limit (steal the oldest, refuse the newest), and which channels and ports you read and write.
- [ ] **Safe defaults.** A freshly enabled module changes nothing a musician plays until a control is turned (a transparent MIDI effect is a bit-exact passthrough of every message, tested), and a generator is silent until it is told to play.
- [ ] **Locks, LFOs and scenes.** Where a control is parameter-locked, modulated by an LFO or morphed by a scene, say which wins and test it, as above.
- [ ] **Performance.** The worst event under a flood at wire rate, and what the module adds to the stock image's frame interrupt and idle time: [Performance](README.md#performance). A MIDI module is the likeliest to be slow in the interrupt, so do the work once per event and never once per byte, and do not wait on a full output.

## Integrate

- [ ] Conflicts and dependencies are declared in `compatibility`; USB Audio needs USB MIDI and the composer adds it.
- [ ] `sdk/catalog.json` entry, thumbnail, `resources.impact`, README sections, tutorial and screenshots of the setting that enables it (`PROJ` → `MIDI` → `CONTROL` for CC Map).
- [ ] A module with no Octatrack page of its own (an automatic USB module) uses the narrow `access.noUiReason` and still documents the host connection and routing. See [MODULE_UI_CAPTURES.md](../MODULE_UI_CAPTURES.md).
- [ ] `evidence/performance.json` passes `npm run perf:audit -- check` ([Performance](README.md#performance)).
- [ ] `npm run module:verify -- <id> --os <your 1.40C>` and `npm run module:doctor -- <id>` are green.

## Test

Flood and stop it: notes, CC and clock at the wire rate, stopped mid-note, a Part change while it runs, and count what is left sounding and what was dropped. `verify_midi.py`, `verify_ccmap.py`, `verify_usb.py`, `verify_usb_align.py` and `verify_usb_in.py` are the patterns. A host-side test is part of the work: name the operating system, the USB speed and the software you used, or say "not tested".

## Digitakt and Digitone

SysEx ids are resources: claim them (`sysex:0x7d` in `platform.claims`), because two mods may never claim the same one ([Digitakt guide](../../sdk/machines/digitakt/README.md)). The core delivers key and encoder events to your handler (`ev_key`, `ev_enc`); return nonzero only when you take the event.
