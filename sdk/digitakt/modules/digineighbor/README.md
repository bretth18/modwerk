# NEIGHBOR

NEIGHBOR is a fifth SRC machine, like the Octatrack’s neighbor machine. The track plays another track’s audio (post-filter) through its own overdrive, level, filter, volume, pan and sends, one block (0.67 ms) late. Its SRC page has TUNE (a pitch shifter that follows the trig’s note), BR, SLOT (the source track, 1–8), GAIN (0 to +31.5 dB after its own chain) and LEV. A prototype.

By irpina (@irpina) · GPL-2.0-or-later · Digitakt OS 1.53, 1.54 · imported from [irpina/digineighbor](https://github.com/irpina/digineighbor/tree/d09574ab5fac8c079849e74c5c3efe129de54126) at v0.6.

## Where to find it

SRC machine list.

1. Select a track, press FUNC + SRC and choose NEIGHBOR.
2. Set SLOT to the source track on the SRC page.

## Controls

| Control | What it does |
| --- | --- |
| TUNE | Pitch shift that follows the trig’s note |
| BR | Bit reduction |
| SLOT | Source track, 1–8 |
| GAIN | 0 to +31.5 dB after its own chain |
| LEV | Level |

## Limitations

- A prototype: the source audio arrives one block (0.67 ms) late.

## Credits

- irpina — NEIGHBOR design and code

The author’s full documentation is kept in [upstream/README.md](upstream/README.md). Screenshots and a tutorial are still to come.
