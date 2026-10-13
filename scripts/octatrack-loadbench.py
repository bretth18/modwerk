#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""How efficiently the base loads effects on demand, measured on the unit over `npm run device -- serve`.

  scripts/octatrack-loadbench.py NAME:SLOT ...      e.g. MINI_VERB:2 TAPEHEAD:1

Runs on the current Part and puts it back with `reload` at the end. The base preloads what any Part of the
bank names, so a module the bank's Parts name loads warm even on its first pick; the others load cold (a
stopped bank change leaves the tracks running the old bank's effects, so an empty bank cannot be used). For
each module (its chooser name, FX slot 1 or 2), on T1 (core 1) and T5 (core 0): a first pick, back to the
stock effect, and the pick again; each with the milliseconds from YES until the track runs it, the
packets and code words sent to that core, and the longest time between two audio frames meanwhile (dev
request 23; a frame is about 363 us). Then a Part switch away and back with a module placed (the preloaded
union: no packets expected) and five idle seconds (what the meters' PEEKs cost). Prints a Markdown table and
one JSON line. Use a scratch project, transport stopped, on a Part whose working copy equals its saved one."""
import argparse, importlib.util, json, re, time
from pathlib import Path

_spec = importlib.util.spec_from_file_location('qualify', Path(__file__).with_name('octatrack-qualify.py'))
qualify = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(qualify)
send = qualify.send
STOCK = {1: 'FILTER', 2: 'DELAY'}


def loader():
    m = re.search(r'accepted (\d+)/(\d+) .* words (\d+)/(\d+)', send('loader'))
    return dict(packets=(int(m.group(1)), int(m.group(2))), words=(int(m.group(3)), int(m.group(4))))


def gap():
    return int(re.search(r'gap (\d+) counts', send('gap')).group(1)) // 132  # microseconds


def pick(track, slot, name):
    """One pick: ms YES -> running, packets and words to core 0 and core 1, the longest frame gap (us)."""
    before = loader(); gap()
    ms = int(re.search(r'running (\d+) ms after YES', send('pick:T%d:FX%d:%s' % (track, slot, name.replace(' ', '_')))).group(1))
    time.sleep(0.5)  # let the manager finish what the pick started
    after = loader()
    return dict(ms=ms, gap_us=gap(), packets=[a - b for a, b in zip(after['packets'], before['packets'])],
                words=list(after['words']))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('modules', nargs='+', help='NAME:SLOT, the name as the chooser shows it (spaces as _)')
    args = ap.parse_args()
    if 'stopped' not in send('state'): raise SystemExit('Stop the transport first.')
    rows, result = [], dict(modules=[])
    try:
        for spec in args.modules:
            name, slot = spec.rsplit(':', 1)
            name, slot = name.replace('_', ' '), int(slot)
            for track, core in ((1, 1), (5, 0)):
                send('pick:T%d:FX%d:%s' % (track, slot, STOCK[slot])); time.sleep(1.0)
                cold = pick(track, slot, name)
                send('pick:T%d:FX%d:%s' % (track, slot, STOCK[slot])); time.sleep(1.0)
                warm = pick(track, slot, name)
                send('pick:T%d:FX%d:%s' % (track, slot, STOCK[slot])); time.sleep(1.0)
                entry = dict(module=name, slot=slot, track=track, core=core, cold=cold, again=warm)
                result['modules'].append(entry)
                rows.append('| %s | FX%d | T%d (core %d) | %d ms, %d packets, %d us | %d ms, %d packets, %d us | %d |' % (
                    name, slot, track, core, cold['ms'], cold['packets'][core], cold['gap_us'],
                    warm['ms'], warm['packets'][core], warm['gap_us'], cold['words'][core]))
        name, slot = args.modules[0].rsplit(':', 1)
        send('pick:T1:FX%s:%s' % (slot, name)); time.sleep(1.0)
        before = loader(); gap()
        send('part2'); time.sleep(1.0); send('part1'); time.sleep(1.0)
        after = loader()
        result['part_switch'] = dict(packets=[a - b for a, b in zip(after['packets'], before['packets'])], gap_us=gap())
        send('pick:T1:FX%s:%s' % (slot, STOCK[int(slot)])); time.sleep(1.0)
        before = loader(); gap(); time.sleep(5.0); after = loader()
        result['idle_5s'] = dict(packets=[a - b for a, b in zip(after['packets'], before['packets'])], gap_us=gap(),
                                 stats=send('stats').strip())
    finally:
        send('reload')  # the Part as saved: every pick of this run undone
    print('| Module | Slot | Track | First pick | Again | Code words on that core after |')
    print('|---|---|---|---|---|---|')
    print('\n'.join(rows))
    print('\nPart switch away and back: %s packets (core 0/1), longest frame gap %d us' % (result['part_switch']['packets'], result['part_switch']['gap_us']))
    print('Idle 5 s: %s packets (core 0/1), longest frame gap %d us; %s' % (result['idle_5s']['packets'], result['idle_5s']['gap_us'], result['idle_5s']['stats']))
    print(json.dumps(result))


if __name__ == '__main__':
    main()
