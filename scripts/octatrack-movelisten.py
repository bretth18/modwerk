#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Listening test for the code compaction that moves running code (dsp.c's move_one), over `npm run device -- serve`
and the `rec` tool (~/.cache/modwerk-octatrack/tools/rec, MAIN from the Octatrack's USB audio).

  scripts/octatrack-movelisten.py [--module tapehead|e-verb] [--rounds 3]

Needs a scratch project whose pattern repeats a sustained sample on T2 every half second (trigs on steps 1, 5, 9
and 13 at 120 BPM). Each round, stopped: a module below (Euclid on T3, or Mini Verb on T4), then the module under
test in T2's chain above it on core 1. Then playing and recorded: the one below off, and two seconds later the base
moves the module under test (up past the hole, then down into it) while T2 plays through it. The pattern repeats,
so each half second of MAIN equals the one before it: sample for sample through TapeHead, within a steady few
24-bit steps through E-Verb's tail. Around the moves the difference must stay within what the take shows before the
pick (twice that, for the noise in a maximum); a change of code, state or timing shows far above it (a dry frame
would be ~10^5 steps). Round 0 also records T2 without the module: how much of MAIN the module changes shows it is
heard. Ends stopped with the Part as saved. Prints one JSON line; exit status
1 if the module did not move, the difference grew near a move, or the loader counted an error, stall, rollback or
rejected packet."""
import argparse, importlib.util, json, os, re, subprocess, sys, time
from pathlib import Path
import numpy as np

def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module

qualify, clicks = _load('qualify', 'octatrack-qualify.py'), _load('clicks', 'octatrack-clicks.py')
send, counters = qualify.send, qualify.counters
REC = os.path.expanduser('~/.cache/modwerk-octatrack/tools/rec')
OUT = Path(os.path.expanduser('~/.cache/modwerk-octatrack/movelisten'))
SETUPS = {  # picks that take it off (and make room on core 1), the one below, the module, the one below off
    'tapehead': dict(id=31, clear=['T2:FX1:FILTER'], below='T3:FX1:EUCLID', module='T2:FX1:TAPEHEAD', off='T3:FX1:FILTER'),
    'e-verb': dict(id=27, clear=['T1:FX2:DELAY', 'T3:FX1:FILTER', 'T2:FX2:DELAY', 'T2:FX1:FILTER'],
                   below='T4:FX2:MINI_VERB', module='T2:FX2:E-VERB', off='T4:FX2:DELAY'),
}


def offset(id):
    m = re.search(r'core 1 [^\n]*?id %d @(\d+)' % id, send('memory'))
    return int(m.group(1)) if m else None


def settle():
    for _ in range(40):
        if not any(int(h) for h in re.findall(r'holes (\d+) words', send('memory'))): return
        time.sleep(0.5)


def record(name, seconds):
    log = open(OUT / (name + '.rec'), 'w')
    return subprocess.Popen([REC, str(seconds), str(OUT / (name + '.wav')), 'Octatrack'], stdout=log, stderr=subprocess.STDOUT)


def difference(name):
    """Seconds into the take, and how far MAIN is from half a second earlier (24-bit steps, either channel)."""
    x, rate = clicks.read(OUT / (name + '.wav'))
    s = np.round(x[:, :2] * 8388608).astype(np.int64)
    p = rate // 2
    return (np.arange(len(s) - p) + p) / rate, np.abs(s[p:] - s[:-p]).max(axis=1), x


def heard(dry, wet):
    """How much of the module's half second (in %) is not the dry one, at the best shift and gain."""
    k = int(np.argmax(np.fft.irfft(np.fft.rfft(dry) * np.conj(np.fft.rfft(wet)), len(dry))))
    wet = np.roll(wet, k)
    left = dry - np.dot(dry, wet) / np.dot(wet, wet) * wet
    return round(float(100 * np.sqrt(np.mean(left ** 2) / np.mean(dry ** 2))), 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--module', choices=sorted(SETUPS), default='tapehead')
    ap.add_argument('--rounds', type=int, default=3)
    args = ap.parse_args()
    setup = SETUPS[args.module]
    OUT.mkdir(parents=True, exist_ok=True)
    part = qualify.mem(qualify.PART, 1)[0]
    saved = qualify.part_copy(part, saved=True)
    if qualify.part_copy(part) != saved: raise SystemExit('The current Part differs from its saved copy: run on one that does not.')
    before, failures, rounds, dry = counters(), [], [], None
    try:
        for n in range(args.rounds):
            for pick in setup['clear']: send('pick:' + pick)
            settle()
            if n == 0:
                send('PLAY w4000'); record('dry', 3).wait(); send('STOP w300 STOP w300')
                dry = difference('dry')[2][-22050:, 0]
            send('pick:' + setup['below']); send('pick:' + setup['module']); settle()
            name = '%s%d' % (args.module, n)
            send('PLAY w4000'); take = record(name, 15); time.sleep(3)
            send('pick:' + setup['off']); picked, seen = time.time(), [(time.time(), offset(setup['id']))]
            while take.poll() is None:
                at = offset(setup['id'])
                if at != seen[-1][1]: seen.append((time.time(), at))
                time.sleep(0.15)
            send('STOP w300 STOP w300')
            start = float(open(OUT / (name + '.rec')).readline().split()[1])
            moves, pick_s = [(round(t - start, 2), at) for t, at in seen[1:]], picked - start
            t, d, x = difference(name)
            floor = int(d[(t > 1) & (t < pick_s - 0.5)].max())
            # A move lands between the poll before it and the poll that sees it.
            near = int(d[(t > moves[0][0] - 0.6) & (t < moves[-1][0] + 0.7)].max()) if moves else -1
            rounds.append(dict(pick_s=round(pick_s, 2), moves=moves, floor=floor, near_moves=near, heard_pct=heard(dry, x[-22050:, 0])))
            print('round %d: %s' % (n, rounds[-1]), file=sys.stderr, flush=True)
            if not moves: failures.append('round %d: %s did not move' % (n, args.module))
            elif near > 2 * floor: failures.append('round %d: %d steps near a move, %d before the pick' % (n, near, floor))
    finally:
        send('STOP w300 STOP w300')
        if not qualify.restore_part(part, saved): failures.append('Part %d is not back as saved' % (part + 1))
    now = counters()
    grew = {k: now[k] - before[k] for k in ('errors', 'stalls', 'rollbacks', 'rejected') if now[k] > before[k]}
    if grew: failures.append(str(grew))
    print(json.dumps(dict(module=args.module, rounds=rounds, failures=failures)))
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
