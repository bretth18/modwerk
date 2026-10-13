#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Churn test for the code compaction that moves running code (dsp.c's move_one), over `npm run device -- serve`.

  scripts/octatrack-movestress.py [--steps 60] [--seed 1] [--stopped]

Plays the current pattern (unless --stopped) and, step by step, picks a random module or stock effect on a random
track and FX slot, so code comes and goes on both cores and leaves holes. After each step it waits for the base to
close them (two seconds after the last key, a move at a time) and checks that no hole is left, that the loader
counted no error, stall, rollback or rejected packet, and the longest time between two frames. Picks the cycle
ledger refuses are counted, not failures. Ends stopped, with the Part as saved (qualify's restore_part). Use a scratch project.
Prints one JSON line; exit status 1 on a failure."""
import argparse, importlib.util, json, random, re, sys, time
from pathlib import Path

_spec = importlib.util.spec_from_file_location('qualify', Path(__file__).with_name('octatrack-qualify.py'))
qualify = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(qualify)
send, counters, mem = qualify.send, qualify.counters, qualify.mem
CHOICES = {1: ['FILTER', 'TAPEHEAD', 'EUCLID', 'EQUALIZER', 'COMPRESSOR'],
           2: ['DELAY', 'E-VERB', 'MINI_VERB', 'AIR_CHORUS', 'TAPEHEAD', 'PLATE_REV']}


def holes():
    found = [int(m.group(1)) for m in re.finditer(r'holes (\d+) words', send('memory'))]
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--steps', type=int, default=60)
    ap.add_argument('--seed', type=int, default=1)
    ap.add_argument('--stopped', action='store_true')
    args = ap.parse_args()
    rng = random.Random(args.seed)
    part = mem(qualify.PART, 1)[0]
    saved = qualify.part_copy(part, saved=True)
    if qualify.part_copy(part) != saved: raise SystemExit('The current Part differs from its saved copy: run on one that does not.')
    before, failures, result = counters(), [], dict(steps=0, picks=0, refused=0, compacted=0, max_gap_us=0, longest_wait_s=0)
    send('gap')
    if not args.stopped: send('PLAY w500')
    try:
        for step in range(args.steps):
            track, slot = rng.randint(1, 8), rng.randint(1, 2)
            name = rng.choice(CHOICES[slot])
            try:
                send('pick:T%d:FX%d:%s' % (track, slot, name)); result['picks'] += 1
            except RuntimeError as e:
                if 'refused' in str(e) or 'not admitted' in str(e): result['refused'] += 1
                else: failures.append(str(e))
            start, had = time.time(), any(holes())
            while time.time() - start < 12:
                time.sleep(0.5)
                if not any(holes()): break
            left = holes()
            if had: result['compacted'] += 1
            result['longest_wait_s'] = max(result['longest_wait_s'], round(time.time() - start, 1))
            if any(left):
                failures.append('step %d: holes left %s after 12 s' % (step, left))
                print(send('memory').strip(), file=sys.stderr, flush=True)  # the layout the planner could not pack
            gap = int(re.search(r'gap (\d+) counts', send('gap')).group(1)) // 132
            result['max_gap_us'] = max(result['max_gap_us'], gap)
            now = counters()
            grew = {k: now[k] - before[k] for k in ('errors', 'stalls', 'rollbacks', 'rejected') if now[k] > before[k]}
            if grew: failures.append('step %d: %s' % (step, grew)); before = now
            result['steps'] = step + 1
            print('step %d T%d FX%d %s: holes %s, gap %d us%s' % (step, track, slot, name, left, gap,
                  ' ' + str(grew) if grew else ''), file=sys.stderr, flush=True)
            if len(failures) > 5: break
    finally:
        send('STOP w300 STOP w300')
        if not qualify.restore_part(part, saved): failures.append('Part %d is not back as saved' % (part + 1))
    result['failures'] = failures
    print(json.dumps(result))
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
