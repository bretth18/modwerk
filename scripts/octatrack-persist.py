#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Persistence check for module effects on a development base, over `npm run device -- serve`
(docs/ADD_A_MODULE.md, "Persistence and multiple instances").

  scripts/octatrack-persist.py snap NAME      # what a reload must bring back, to ~/.cache/modwerk-octatrack/persist/NAME.json
  scripts/octatrack-persist.py compare A B    # what differs between two snapshots; exit status 1 when anything does

A snapshot holds what each track runs (FX1 and FX2), every track's live parameter lane (the knobs the effects
read), the current Part's working and saved copies, the current pattern's steps (trigs, parameter locks), the
bank, Part and pattern, the modules installed and the
modules the project names that are not, and the loader's error counters. Take one after a saved baseline, then
after each Part reload, project reload, RAM boot or power cycle, and compare it with the baseline. Use a scratch
project: the steps between snapshots save and reload projects."""
import importlib.util, json, re, sys
from pathlib import Path

_spec = importlib.util.spec_from_file_location('qualify', Path(__file__).with_name('octatrack-qualify.py'))
qualify = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(qualify)
send, mem, u32, counters = qualify.send, qualify.mem, qualify.u32, qualify.counters
STORE = Path.home() / '.cache/modwerk-octatrack/persist'
LANES = 0x80000810  # a track's live lane, 72 bytes a track (Octabam's PARAM_PAGES.md 5a')


def snap():
    report = dict(re.findall(r'(\w+)=(\S+)', send('report')))
    part, (bank, pattern) = mem(qualify.PART, 1)[0], mem(0x800065bd, 2)
    base = u32(qualify.BANK)
    return dict(bank=bank, pattern=pattern, part=part, fx=mem(0x80000ec4, 16).hex(),
                lanes=[mem(LANES + 72 * t, 72).hex() for t in range(8)],
                working=mem(base + 0x8ed80 + part * 6322, 6322).hex(), saved=mem(base + 0x9504a + part * 6322, 6322).hex(),
                steps=mem(base + pattern * 0x8ed8, 0x8ed8).hex(),  # the pattern: trigs and parameter locks (Octabam's STEP_LOCKS.md)
                modules=int(report.get('modules', -1)), missing=send('missing').strip(), counters=counters())


def differences(a, b):
    out = []
    for key in ('bank', 'pattern', 'part', 'modules'):
        if a[key] != b[key]: out.append('%s %s -> %s' % (key, a[key], b[key]))
    fa, fb = bytes.fromhex(a['fx']), bytes.fromhex(b['fx'])
    out += ['T%d FX%d runs %d -> %d' % (i % 8 + 1, i // 8 + 1, fa[i], fb[i]) for i in range(16) if fa[i] != fb[i]]
    for t in range(8):
        la, lb = bytes.fromhex(a['lanes'][t]), bytes.fromhex(b['lanes'][t])
        changed = [i for i in range(72) if la[i] != lb[i]]
        if changed: out.append('T%d lane bytes %s: %s -> %s' % (t + 1, changed, la[changed[0]], lb[changed[0]]))
    for key in ('working', 'saved', 'steps'):
        if key not in a or key not in b: continue
        pa, pb = bytes.fromhex(a[key]), bytes.fromhex(b[key])
        changed = [i for i in range(len(pa)) if pa[i] != pb[i]]
        if changed: out.append('%s%s: %d bytes differ, first at %#x' % (key, '' if key == 'steps' else ' Part', len(changed), changed[0]))
    if b['working'] != b['saved'] and a['working'] == a['saved']: out.append('the working Part no longer equals its saved copy')
    if b['missing'] != a['missing']: out.append('not installed but named: %s -> %s' % (a['missing'], b['missing']))
    out += ['%s %d -> %d' % (k, a['counters'][k], v) for k, v in b['counters'].items() if v > a['counters'][k]]
    return out


def main():
    if len(sys.argv) == 3 and sys.argv[1] == 'snap':
        STORE.mkdir(parents=True, exist_ok=True)
        s = snap()
        (STORE / (sys.argv[2] + '.json')).write_text(json.dumps(s))
        print('%s: bank %d pattern %d Part %d, FX %s, %d modules, %s, counters %s'
              % (sys.argv[2], s['bank'], s['pattern'], s['part'] + 1, s['fx'], s['modules'], s['missing'], s['counters']))
    elif len(sys.argv) == 4 and sys.argv[1] == 'compare':
        a, b = (json.loads((STORE / (n + '.json')).read_text()) for n in sys.argv[2:])
        found = differences(a, b)
        print('\n'.join(found) if found else 'same: %s and %s' % tuple(sys.argv[2:]))
        sys.exit(1 if found else 0)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
