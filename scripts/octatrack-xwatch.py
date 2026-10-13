#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Is X:$7a92-$7fff free on the unit with every effect running? (docs/OCTATRACK_MORE_EFFECT_IDS.md, step 1)

  scripts/octatrack-xwatch.py [--seconds 3] [--rounds 1]

Needs a base built with `build_core.py --dsp-loader --dev --dsp-probe X` (its receivers fill the region with a
pattern, then watch it) and `npm run device -- serve`. Plays the current pattern and picks, on T1 (core 1) and T5
(core 0), every effect both choosers list, stock and installed modules alike, each for a few seconds; the X watch
(dev request 26) is read after each core's sweep. Picks the cycle ledger refuses are counted, not failures. Ends
stopped with the Part as saved (qualify's restore_part); refuses to start on a Part that differs from its saved copy.
Prints one JSON line; exit status 1 when any word of the region changed or the loader counted errors."""
import argparse, importlib.util, json, re, sys, time
from pathlib import Path

_spec = importlib.util.spec_from_file_location('qualify', Path(__file__).with_name('octatrack-qualify.py'))
qualify = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(qualify)
send, counters, mem, u32 = qualify.send, qualify.counters, qualify.mem, qualify.u32


def effects(slot):
    """The effect names one chooser can pick: each id its table names that is not NONE, in id order."""
    table, names = u32(qualify.FX_IDS[slot]), []
    for fx in range(128):
        descriptor = u32(table + 4 * fx)
        if not descriptor:
            break  # the table's closing 0
        name = qualify.fx_name(slot, fx)
        if name and name != 'NONE' and name not in names:
            names.append(name)
    return names


def watch():
    found = {}
    for line in send('xwatch').splitlines():
        m = re.match(r'core (\d) .*?: (\d+) passes .*?, (\d+) words found changed(?:, the first at X:\$([0-9a-f]+) holding \$([0-9a-f]+))?', line)
        if m:
            found[int(m.group(1))] = dict(passes=int(m.group(2)), changed=int(m.group(3)), first=m.group(4), value=m.group(5))
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seconds', type=float, default=3.0)
    ap.add_argument('--rounds', type=int, default=1)
    args = ap.parse_args()
    part = mem(qualify.PART, 1)[0]
    saved = qualify.part_copy(part, saved=True)
    if qualify.part_copy(part) != saved: raise SystemExit('The current Part differs from its saved copy: run on one that does not.')
    before, failures, result = counters(), [], dict(picks=0, refused=0, watches=[])
    names = {slot: effects(slot) for slot in (1, 2)}
    result['effects'] = names
    print('effects: %s' % names, file=sys.stderr, flush=True)
    send('PLAY w500')
    try:
        for _ in range(args.rounds):
            for track in (1, 5):  # core 1, then core 0
                for slot in (1, 2):
                    for name in names[slot]:
                        try:
                            send('pick:T%d:FX%d:%s' % (track, slot, name)); result['picks'] += 1
                        except RuntimeError as e:
                            if 'refused' in str(e) or 'not admitted' in str(e): result['refused'] += 1
                            else: failures.append(str(e))
                        time.sleep(args.seconds)
                result['watches'].append(dict(after='T%d' % track, **{'core%d' % c: v for c, v in watch().items()}))
                print('after T%d: %s' % (track, result['watches'][-1]), file=sys.stderr, flush=True)
    finally:
        send('STOP w300 STOP w300')
        if not qualify.restore_part(part, saved): failures.append('Part %d is not back as saved' % (part + 1))
    last = result['watches'][-1] if result['watches'] else {}
    for core in ('core0', 'core1'):
        if core not in last: failures.append('%s: the X watch was not read' % core)
        elif last[core]['changed']: failures.append('%s: %d words of X:$7a92-$7fff changed, the first at $%s' % (core, last[core]['changed'], last[core]['first']))
        elif not last[core]['passes']: failures.append('%s: the watch made no pass' % core)
    now = counters()
    grew = {k: now[k] - before[k] for k in ('errors', 'stalls', 'rollbacks', 'rejected') if now[k] > before[k]}
    if grew: failures.append(str(grew))
    result['failures'] = failures
    print(json.dumps(result))
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
