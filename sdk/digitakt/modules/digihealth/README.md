# digihealth

Two SETTINGS rows. FAST AUDIO (on by default) runs the audio render’s hot code from the free on-chip SRAM: the same code, so the audio is identical and the DSP load lower; a watchdog goes back to the stock code if the copy is ever overwritten. SYSTEM INFO shows CPU, DSP, RAM and free sample memory in the top bar, and a read-only USB diagnostics channel (SysEx device 0x7D) answers its desktop tool.

By irpina (@irpina) · GPL-2.0-or-later · Digitakt OS 1.53, 1.54 · imported from [irpina/digihealth](https://github.com/irpina/digihealth/tree/6d2a95605901f4f5ea6301dbad16e573380331a6) at v1.1.

Modwerk draft version: `1.0.1-experimental`. The build recipe now generates the upstream diagnostic name string; this is a Modwerk revision of the imported source, with no new hardware qualification.

## Where to find it

SETTINGS.

1. Open SETTINGS.
2. Tick FAST AUDIO or SYSTEM INFO.

## Controls

| Control | What it does |
| --- | --- |
| FAST AUDIO | Runs the render from SRAM; untick to stop until the next power-on |
| SYSTEM INFO | Shows CPU, DSP and memory in the top bar |

## Limitations

- FAST AUDIO’s call-site stubs are derived from the owner’s stock OS file. Modwerk compiles their address-only stubs in CI; the local build verifies their guards and derives the copied block’s fixups from the owner’s firmware.

## Credits

- irpina — digihealth design and code

The author’s full documentation is kept in [upstream/README.md](upstream/README.md). Screenshots and a tutorial are still to come.
