#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Clicks and dropouts in a recording of the Octatrack's MAIN (the `rec` tool's WAV: MAIN L/R, CUE L/R).

  scripts/octatrack-clicks.py TAKE.wav [--channels 0,1] [--grid 0.5]

A click is a jump in the signal's second difference far above its typical size (a sustained sound has a small,
steady one); a dropout is 5 ms near silence between louder stretches. With --grid, clicks within 3 ms of a
period's beat (the first click's phase) are the pattern's own onsets (trigs restarting a sample), and only the
others count. Prints each with its time and a summary
line; a sustained, looped sample shows clicks that a drum would hide."""
import argparse, struct, sys
import numpy as np


def read(path):
    data = open(path, 'rb').read()
    if data[:4] != b'RIFF' or data[8:12] != b'WAVE': raise SystemExit(path + ': not a WAV file')
    at, fmt, frames = 12, None, None
    while at + 8 <= len(data):
        kind, size = data[at:at + 4], struct.unpack('<I', data[at + 4:at + 8])[0]
        body = data[at + 8:at + 8 + size]
        if kind == b'fmt ': fmt = struct.unpack('<HHIIHH', body[:16])
        if kind == b'data': frames = body
        at += 8 + size + (size & 1)
    tag, channels, rate, _, _, bits = fmt
    if tag == 0xfffe: tag = struct.unpack('<H', data[data.index(b'fmt ') + 8 + 24:][:2])[0]  # WAVE_FORMAT_EXTENSIBLE
    kind = {(1, 16): '<i2', (1, 24): None, (1, 32): '<i4', (3, 32): '<f4'}[(tag, bits)]
    if kind is None:
        raw = np.frombuffer(frames, dtype=np.uint8).reshape(-1, 3)
        x = (raw[:, 0].astype(np.int32) | raw[:, 1].astype(np.int32) << 8 | raw[:, 2].astype(np.int32) << 16) << 8 >> 8
        x = x / 8388608.0
    else:
        x = np.frombuffer(frames, dtype=kind).astype(np.float64)
        if tag == 1: x /= float(2 ** (bits - 1))
    return x.reshape(-1, channels), rate


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('take')
    ap.add_argument('--channels', default='0,1')
    ap.add_argument('--grid', type=float, default=0.0, help='seconds between the pattern\'s own onsets')
    args = ap.parse_args()
    x, rate = read(args.take)
    total = 0
    for ch in map(int, args.channels.split(',')):
        s = x[:, ch]
        rms = float(np.sqrt(np.mean(s ** 2))) or 1e-12
        d2 = np.abs(s[2:] - 2 * s[1:-1] + s[:-2])
        typical = float(np.median(d2)) or 1e-12
        hits = np.flatnonzero(d2 > max(25 * typical, 0.02 * rms * 4))
        clicks, last = [], -rate
        for h in hits:
            if h - last > rate // 100: clicks.append(h)  # one per 10 ms
            last = h
        win = rate // 200  # 5 ms
        n = len(s) // win
        level = np.sqrt(np.mean(s[:n * win].reshape(n, win) ** 2, axis=1))
        drops = [i for i in range(1, n - 1) if level[i] < 0.01 * rms and level[i - 1] > 0.2 * rms and level[i + 1] > 0.2 * rms]
        if args.grid and clicks:
            period, phase, slack = args.grid * rate, clicks[0], 0.003 * rate
            onsets = [c for c in clicks if min((c - phase) % period, period - (c - phase) % period) <= slack]
            clicks = [c for c in clicks if c not in onsets]
            print('channel %d: %d onsets on the %.3f s grid' % (ch, len(onsets), args.grid))
        print('channel %d: rms %.4f, %d clicks, %d dropouts' % (ch, rms, len(clicks), len(drops)))
        for c in clicks[:20]: print('  click at %.3f s (x%.0f the typical step)' % (c / rate, d2[c] / typical))
        for d in drops[:20]: print('  dropout at %.3f s' % (d * win / rate))
        total += len(clicks) + len(drops)
    print('%s: %.1f s, %d events' % (args.take, len(x) / rate, total))


if __name__ == '__main__':
    main()
