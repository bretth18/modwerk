#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""A GIF of the base closing holes in the DSP code memory by moving running code, from the unit's memory map.

  scripts/octatrack-packgif.py capture STATES.json [--seconds 8]    # poll `memory` back to back over the serve session
  scripts/octatrack-packgif.py render STATES.json OUT.gif

Capture records each distinct map (both cores' placed blocks) with its time, and the effects' names from the FX2
chooser. Render draws each core's arena as a bar, a block per effect; each move takes two frames: the new copy
outlined at its target while the old one still runs, then the old freed once the dispatch is bound to the copy."""
import argparse, importlib.util, json, re, sys, time
from pathlib import Path

BLOCK = re.compile(r'id (\d+) @(\d+)\+(\d+)')


def capture(out, seconds):
    spec = importlib.util.spec_from_file_location('qualify', Path(__file__).with_name('octatrack-qualify.py'))
    qualify = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(qualify)
    states, start = [], time.time()
    while time.time() - start < seconds:
        text = qualify.send('memory')
        cores = {}
        for line in text.splitlines():
            m = re.match(r'core (\d) .*?(\d+) of (\d+) words', line)
            if m: cores[m.group(1)] = dict(arena=int(m.group(3)), blocks=[list(map(int, b)) for b in BLOCK.findall(line)])
        if not states or states[-1]['cores'] != cores:
            states.append(dict(t=round(time.time() - start, 3), cores=cores))
            print('%.2f s: %s' % (states[-1]['t'], {c: v['blocks'] for c, v in cores.items()}), file=sys.stderr)
    names = {}  # after the run: reading them takes longer than the base waits before it moves
    table = qualify.mem(qualify.u32(0x4005252a), 4 * 128)  # FX2_IDS, named by a lea operand: id -> descriptor, name at +9
    for i in range(128):
        d = int.from_bytes(table[4 * i:4 * i + 4], 'big')
        if not d: break  # the table's closing 0: the id count
        names[i] = qualify.mem(d + 9, 13).split(b'\0')[0].decode('latin1').strip()
    Path(out).write_text(json.dumps(dict(names=names, states=states)))


def render(src, out):
    from PIL import Image, ImageDraw, ImageFont
    data = json.loads(Path(src).read_text())
    names, states = {int(k): v for k, v in data['names'].items()}, data['states']
    font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 13)
    small = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 11)
    W, H, X0, X1 = 760, 250, 110, 740
    palette = ['#e4572e', '#29335c', '#f3a712', '#669bbc', '#a8c686', '#8e7dbe', '#d1495b', '#00798c', '#edae49', '#30638e']
    colour = lambda i: palette[i % len(palette)]

    def draw(state, caption, ghost=None):
        img = Image.new('RGB', (W, H), '#f7f5f0')
        d = ImageDraw.Draw(img)
        d.text((16, 12), 'DSP code memory, packed by moving running code', fill='#222', font=font)
        for row, (core, label) in enumerate((('1', 'core 1 T1-4'), ('0', 'core 0 T5-8'))):
            c = state['cores'].get(core)
            if not c: continue
            y, arena = 52 + row * 80, c['arena']
            sx = lambda w: X0 + (X1 - X0) * w / arena
            d.text((16, y + 14), label, fill='#222', font=small)
            d.rectangle([X0, y, X1, y + 42], fill='#ffffff', outline='#999')
            used = sum(b[2] for b in c['blocks'])
            top = max([b[1] + b[2] for b in c['blocks']] or [0])
            d.text((X0, y + 46), '%d of %d words, holes %d' % (used, arena, top - used), fill='#555', font=small)
            for i, at, n in c['blocks']:
                d.rectangle([sx(at), y + 1, sx(at + n), y + 41], fill=colour(i), outline='#222')
                name = names.get(i, 'id %d' % i)
                if sx(at + n) - sx(at) > d.textlength(name, font=small) + 6: d.text((sx(at) + 3, y + 14), name, fill='#fff', font=small)
                else: d.text((sx(at), y - 13), name, fill=colour(i), font=small)  # too narrow: above it
            if ghost and ghost[0] == core:
                _, i, at, n = ghost
                d.rectangle([sx(at), y + 1, sx(at + n), y + 41], outline=colour(i), width=3)
                d.text((sx(at) + 4, y + 14), names.get(i, ''), fill=colour(i), font=small)
        d.text((16, H - 30), caption, fill='#222', font=font)
        return img

    frames, durations = [], []
    frames.append(draw(states[0], 'a hole after a module was taken off')); durations.append(1600)
    for before, after in zip(states, states[1:]):
        for core in after['cores']:
            old = {b[0]: b for b in before['cores'].get(core, {}).get('blocks', [])}
            for i, at, n in after['cores'][core]['blocks']:
                if i in old and old[i][1] != at:
                    name = names.get(i, 'id %d' % i)
                    frames.append(draw(before, 'copy %s to %d while the old one runs' % (name, at), (core, i, at, n))); durations.append(900)
        frames.append(draw(after, 'dispatch bound to the copy, old space freed (t = %.2f s)' % after['t'])); durations.append(900)
    durations[-1] = 2500
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=durations, loop=0)
    print('%s: %d frames' % (out, len(frames)))


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('capture'); c.add_argument('out'); c.add_argument('--seconds', type=float, default=8)
    r = sub.add_parser('render'); r.add_argument('src'); r.add_argument('out')
    args = ap.parse_args()
    capture(args.out, args.seconds) if args.cmd == 'capture' else render(args.src, args.out)


if __name__ == '__main__':
    main()
