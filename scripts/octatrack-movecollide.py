#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Things a user does just as the base starts moving code (dsp.c's compaction), over `npm run device -- serve`.

  scripts/octatrack-movecollide.py [--rounds 3] [--playing] [--kinds pick,part,install]

Each trial opens a hole on core 1 (Mini Verb on T1, Air Chorus above it on T4, Mini Verb off again), waits 1.8-2.3 s
(the base moves code two seconds after the last key or knob), then does one thing: a pick on core 0 (stock COMPRESSOR, loaded on demand), a Part
switch there and back, or a USB install. Checks that the thing succeeded, that the hole closed afterwards and that
the loader counted no error, stall, rollback or rejected packet. Use a scratch project; it ends stopped with the
Part as saved. Prints one JSON line; exit status 1 on a failure."""
import argparse, importlib.util, json, os, re, sys, time
from pathlib import Path

_spec = importlib.util.spec_from_file_location('qualify', Path(__file__).with_name('octatrack-qualify.py'))
qualify = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(qualify)
send, counters, mem = qualify.send, qualify.counters, qualify.mem
PKG = Path(os.path.expanduser('~/.cache/modwerk-octatrack/pkgs'))


def holes(): return [int(h) for h in re.findall(r'holes (\d+) words', send('memory'))]


def open_hole():  # big blocks (E-Verb) sit at the arena's top and leave no hole: open one under a small block
    send('pick:T1:FX2:MINI_VERB'); send('pick:T4:FX2:AIR_CHORUS'); send('pick:T1:FX2:DELAY')
    return holes()[0]


def action(kind):
    if kind == 'pick':  # a stock effect loaded on demand: the same loader transaction, and core 0 can afford it
        send('pick:T6:FX1:COMPRESSOR'); send('pick:T6:FX1:FILTER')
    elif kind == 'part':
        send('part2'); send('part1')
    elif kind == 'install':
        send('remove %s' % (PKG / 'tapehead.mwrm')); send('try %s' % (PKG / 'tapehead.mwrm'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rounds', type=int, default=3)
    ap.add_argument('--playing', action='store_true')
    ap.add_argument('--kinds', default='pick,part,install')
    args = ap.parse_args()
    part = mem(qualify.PART, 1)[0]
    saved = qualify.part_copy(part, saved=True)
    if qualify.part_copy(part) != saved: raise SystemExit('The current Part differs from its saved copy: run on one that does not.')
    before, failures, trials = counters(), [], []
    send('pick:T2:FX1:FILTER'); send('pick:T6:FX2:DELAY')  # TapeHead free for the install, T6 free for the pick
    if args.playing: send('PLAY w500')
    try:
        for r in range(args.rounds):
            for kind in args.kinds.split(','):
                for delay in (1.8, 2.0, 2.1, 2.3):
                    hole = open_hole()
                    time.sleep(delay)
                    ok, error = True, ''
                    try: action(kind)
                    except RuntimeError as e: ok, error = False, ' '.join(str(e).split())
                    start = time.time()
                    while any(holes()) and time.time() - start < 10: time.sleep(0.5)
                    left, now = holes(), counters()
                    grew = {k: now[k] - before[k] for k in ('errors', 'stalls', 'rollbacks', 'rejected') if now[k] > before[k]}
                    before = now
                    trials.append(dict(kind=kind, delay=delay, hole=hole, ok=ok, error=error, left=left, grew=grew))
                    print('%s after %.1f s (hole %d): %s, holes after %s%s' % (kind, delay, hole, 'ok' if ok else error, left,
                          ' ' + str(grew) if grew else ''), file=sys.stderr, flush=True)
                    if not ok: failures.append('%s at %.1f s: %s' % (kind, delay, error))
                    if any(left): failures.append('%s at %.1f s: holes left %s' % (kind, delay, left))
                    if grew: failures.append('%s at %.1f s: %s' % (kind, delay, grew))
                    send('pick:T4:FX2:DELAY')
    finally:
        send('STOP w300 STOP w300')
        if not qualify.restore_part(part, saved): failures.append('Part %d is not back as saved' % (part + 1))
    print(json.dumps(dict(trials=len(trials), failures=failures)))
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
