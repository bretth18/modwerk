#!/usr/bin/env python3
"""Explicit private check of the base's startup (boot_anim.c in sdk/machines/octatrack/elekloader); never
part of npm check.

Boots a composed base MAIN image in the headless emulator with the boot logo on, records the panel stream
(LCD blocks, LED levels, rows and colours) while it plays and checks, for MKI and MKII:
  * the last startup frame equals the authored pixels exactly (mark, wordmark, NEW, version);
  * the LEDs use one channel (even ids) with levels 0-15, light while the cube is out over the panel
    and are all dark before the stock code takes over;
  * the unit hands over to the normal screen, with the same LED rows, levels and colours as the stock
    image (--stock) once the startup is over.
Firmware, images and captures stay private; only --gif / --png (authored boot graphics) and --record
(hashes and results) write anything, and only where you point them.

  verify-startup-base.py --image MAIN.raw --stock STOCK-MAIN.raw --version 0.3.1 --emulator ot_emu
                         [--docker-image IMAGE] [--gif OUT.gif] [--png OUT.png] [--record OUT.json]

--emulator is the Linux ot_emu; with --docker-image it runs in that image (Docker Desktop must be up).
"""
import argparse, hashlib, importlib.util, json, struct, subprocess, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('base_art', ROOT / 'sdk/runtime/startup/base_art.py')
base_art = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base_art)
FRAME = {**{o: 10 for o in range(0x10, 0x18)}, **{o: 2 for o in [*range(0x20, 0x40), *range(0xa0, 0xb0)]},
         **{o: 1 for o in range(0x40, 0x50)}, 0x60: 2, 0x70: 2, 0x74: 2, 0xb5: 6, 0xb7: 2}  # tools/panel/panel_link.py


def capture(args, mkii, image=None, step=10.0, total=4400.0):
    image = Path(image or args.image).resolve()
    emu = Path(args.emulator).resolve()
    tail = ['--image', f'/b/{image.name}' if args.docker_image else str(image), '--boot-logo', '--ms', '50', '--main-level', 'off',
            '--interactive', '--rtc', 'off'] + (['--mkii'] if mkii else [])
    cmd = (['docker', 'run', '-i', '--rm', '--shm-size=128m', '-v', f'{emu.parent}:/e:ro', '-v', f'{image.parent}:/b:ro', args.docker_image,
            f'/e/{emu.name}'] if args.docker_image else [str(emu)]) + tail
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1)
    ask = lambda text: (p.stdin.write(text + '\n'), p.stdin.flush(), p.stdout.readline().strip())[2]
    line = ''
    for _ in range(200):   # the banner comes first
        line = p.stdout.readline()
        if line.startswith('ready') or not line:
            break
    if not line.startswith('ready'):
        raise RuntimeError('The emulator did not become ready.')
    plane, frames, led, rows, colours, buf, t = bytearray(1024), [], [], {}, {}, bytearray(), 0.0
    while t < total:
        ask(f'run {step}')
        t += step
        reply = ask('tx')
        buf += bytes.fromhex(reply.split(' ', 1)[1]) if ' ' in reply else b''
        dirty = False
        while buf and len(buf) >= FRAME.get(buf[0], 1):
            m = bytes(buf[:FRAME.get(buf[0], 1)]); del buf[:len(m)]
            if 0x10 <= m[0] < 0x18 and m[1] % 8 == 0 and m[1] < 128:
                plane[(m[0] & 7) * 128 + m[1]:(m[0] & 7) * 128 + m[1] + 8] = m[2:10]; dirty = True
            elif 0x30 <= m[0] < 0x40:
                led.append((t, m[1], m[0] & 15))
            elif 0x20 <= m[0] < 0x30 or 0xa0 <= m[0] < 0xb0:
                rows[(m[0] & 15) + (16 if m[0] >= 0xa0 else 0)] = m[1]
            elif m[0] == 0xb5:
                colours[m[1] << 8 | m[2]] = m[3:6]
        if dirty:
            frames.append((t, bytes(plane)))
    ask('quit'); p.wait(timeout=30)
    return frames, led, rows, colours


def pixels(plane):
    """The lit (x, y) of an LCD plane as the panel stream fills it (page p is rows 8*(7-p)..+7)."""
    return {(col, 8 * (7 - page) + bit) for page in range(8) for col in range(128) for bit in range(8)
            if plane[page * 128 + col] >> bit & 1}


def lcd(plane):
    im = Image.new('1', (128, 64), 0)
    for page in range(8):
        for col in range(128):
            for bit in range(8):
                if plane[page * 128 + col] >> bit & 1:
                    im.putpixel((col, 8 * (7 - page) + bit), 1)
    return im


def led_story(led, length_ms=3500):
    """The startup's own LED traffic: from its first act (every id to level 0; before it, the stock boot's
    own brightness init) to the end of its 3.5 s, when the stock code takes the LEDs back."""
    levels, odd, lit, out_of_range = {}, 0, set(), 0
    start = next(n for n, (_, _, level) in enumerate(led) if level == 0)
    for t, i, level in led[start:]:
        if t >= led[start][0] + length_ms - 50:
            break
        out_of_range += not 0 <= level <= 15
        if level and i & 1:
            odd += 1
        if level:
            lit.add(i)
        levels[i] = level
    return dict(lampsLit=len(lit), oddChannelLevels=odd, outOfRange=out_of_range,
                darkBeforeReset=all(v == 0 for v in levels.values()))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--image', required=True); ap.add_argument('--stock', required=True); ap.add_argument('--version', required=True)
    ap.add_argument('--emulator', required=True); ap.add_argument('--docker-image')
    ap.add_argument('--gif'); ap.add_argument('--png'); ap.add_argument('--record')
    args = ap.parse_args()
    expected, results = base_art.final_pixels(args.version), {}
    for model, mkii in (('MKI', False), ('MKII', True)):
        frames, led, rows, colours = capture(args, mkii)
        _, stock_led, stock_rows, stock_colours = capture(args, mkii, args.stock)
        shown_px = [pixels(f[1]) for f in frames]
        # the startup's last frame is the last one before the stock screen: the last exact match, or,
        # for an image that never matches, the frame before the last one (to report the difference)
        final_index = max((i for i, px in enumerate(shown_px) if px == expected), default=len(frames) - 2)
        final, got = lcd(frames[final_index][1]), shown_px[final_index]
        story = led_story(led)
        stock_levels, levels = {}, {}
        for _, i, level in stock_led: stock_levels[i] = level
        for _, i, level in led: levels[i] = level
        handover = final_index < len(frames) - 1
        results[model] = dict(finalFramePixels=len(got), missing=len(expected - got), extra=len(got - expected), **story,
                              handsOverToUi=handover, ledStateAfterwardsAsStock=levels == stock_levels and rows == stock_rows,
                              coloursAfterwardsAsStock=colours == stock_colours)
        print(model, results[model])
        assert not (expected ^ got) and handover and story['oddChannelLevels'] == 0 and story['outOfRange'] == 0, model + ' failed'
        assert story['lampsLit'] >= 10 and story['darkBeforeReset'] and results[model]['ledStateAfterwardsAsStock'], model + ' failed'
        assert results[model]['coloursAfterwardsAsStock'], model + ' failed'
        if mkii and (args.gif or args.png):
            t0 = frames[0][0]
            shown = [lcd(next(p for tt, p in reversed(frames) if tt <= t0 + 40 * k)) for k in range(int((frames[final_index][0] - t0) / 40) + 1)]
            scale = lambda im: im.convert('P').resize((768, 384), Image.NEAREST)
            if args.gif:
                scale(shown[0]).save(args.gif, save_all=True, append_images=[scale(im) for im in shown[1:]],
                                     duration=[40] * (len(shown) - 1) + [1200], loop=0)
            if args.png:
                scale(final).save(args.png)
    if args.record:
        sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
        Path(args.record).write_text(json.dumps(dict(
            kind='modwerk-base-startup-emulator', version=args.version, imageSha256=sha(args.image), emulatorSha256=sha(args.emulator),
            captureMethod='--boot-logo --ms 50 --main-level off --interactive --rtc off (+ --mkii); run 10 ms, read the panel UART with tx',
            results=results, hardware='untested',
            sourceSha256={p: sha(ROOT / p) for p in ('sdk/machines/octatrack/elekloader/boot_anim.c', 'sdk/machines/octatrack/elekloader/boot_anim.s',
                                                      'sdk/runtime/startup/base_art.py', 'sdk/runtime/startup/base.json',
                                                      'sdk/runtime/startup/artwork.json', 'scripts/verify-startup-base.py')}), indent=1) + '\n')
    print('startup base: both models passed')


if __name__ == '__main__':
    sys.exit(main())
