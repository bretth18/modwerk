# SOPHIE

Sophie is a metallic percussion synth machine for the original Digitakt. It began as a fixed-point adaptation of Sophie for Schwung by Matt Estela and evolved into four models: FUSE, BOOM, PIPE and SHARD. Its audio enters the normal Digitakt AMP, filter, mixer and sends; the custom controls can be parameter-locked.

By Sjoerd (Soejrd, @soejrd) · MIT · Digitakt OS 1.53 · imported from [soejrd/digisophie](https://github.com/soejrd/digisophie/tree/961c39cec699e8f8940391634aaba9fad7120792) at v1.1.13.

Modwerk metadata version: `1.1.13-experimental.1`. This revision corrects developer, maintainer and upstream credits; the imported v1.1.13 source and test evidence are unchanged.

## Where to find it

SRC machine list.

1. Select a track, press FUNC + SRC and choose SOPHIE.
2. Set the machine’s controls on the SRC page; AMP shapes the note envelope.

## Controls

| Control | What it does |
| --- | --- |
| TUNE | Pitch |
| MODEL | FUSE / BOOM / PIPE / SHARD |
| FOLD | Wavefolder with output level compensation; zero bypasses it |
| SAMP | Stock sample selector; Sophie does not use the sample |
| SWEEP | Bipolar pitch sweep toward the played note |
| METAL | FM/ring intensity |
| FBK | Oscillator feedback |
| COLOR | Inharmonic character |

## Limitations

- One instance runs without FAST AUDIO; the author found two practical with FAST AUDIO on. Eight tracks are not claimed.
- Built for OS 1.53 only.

## Credits

- Sjoerd (Soejrd, @soejrd) — DigiSophie development and Digitakt adaptation
- Matt Estela (@mestela) — original [Sophie for Schwung](https://github.com/mestela/schwung-sophie) algorithm

The author’s full documentation is kept in [upstream/README.md](upstream/README.md). Screenshots and a tutorial are still to come.
