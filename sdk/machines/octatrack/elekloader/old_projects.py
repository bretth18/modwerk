#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Old projects across bases: a stock 1.40C project with stock effects on every
track and slot, and one saved with a module (E-Verb, effect 27), must load on a
DSP-loader base as they do on stock: the same Part bytes, the same live effects,
every stock effect that runs loaded and bound into its core's arena (resident
ones dispatching as on stock), and a module that is absent dry and reported,
then restored when installed. In the third card the project names E-Verb at
handle 9, which no catalogue default names, by its '#MODWERK_FX=' line beside
PLAY MODES' and SCALE QUANTIZER's lines: installing E-Verb binds it there only
if the base read the line.

    python3 -B old_projects.py cards PRIVATE_PROJECT_DIR OUT     # OUT/{stock-fx,module-set,module-lines}.img
    python3 -B old_projects.py dumps BUILD|stock OUT              # ot_emu --mem-dump/--dsp-peek arguments
    python3 -B old_projects.py check STOCK_RUN BASE_RUN BUILD stock-fx|module-set|module-restored|module-lines

The project is copied, never changed. Cards, dumps and logs are private.
Emulator evidence: state, not audio.
"""
import json
from pathlib import Path
import shutil
import sys

HERE = Path(__file__).resolve().parent
OCTABAM = HERE.parents[2] / 'octabam'
# Stock effect ids (src/engine/assets/chooser-metadata.json): FX1's ten, and FX2's fourteen.
FX1 = (4, 12, 13, 16, 17, 18, 5, 19, 24, 28)
FX2 = (21, 20, 8, 24, 22, 28, 19, 5, 4, 12, 13, 16, 17, 18)
EVERB = 27
HANDLE = {'module-set': EVERB, 'module-restored': EVERB, 'module-lines': 9}  # where each card's project names E-Verb
LINES = b'#MODWERK_FX=9:873d83cc:1:E-Verb\r\n#PLAY_MODES=A01:00000000000000000\r\n#SEQUENCER_SCALE=0\r\n'
LIVE_FX, BANK_POINTER = 0x80000ec4, 0x46c82456
BANK0, BANK_BYTES, PARTS, SAVED, PART_BYTES = 0x400e21e0, 635712, 0x8ed80, 0x9504a, 6322  # selection.c, publication.c


def assignment(module, handle=EVERB):
    """Part p's FX1 and FX2 ids per track: every stock effect in some Part, reverbs on both cores in Part 1."""
    parts = []
    for p in range(4):
        fx1 = [FX1[(8 * p + t) % len(FX1)] for t in range(8)]
        fx2 = [FX2[(8 * p + t) % len(FX2)] for t in range(8)]
        if module:
            fx2[1] = fx2[5] = handle  # T2 (core 1) and T6 (core 0)
        parts.append((fx1, fx2))
    return parts


def cards(project, out):
    sys.path[:0] = [str(OCTABAM / 'tools'), str(OCTABAM / 'tools/hw'), str(OCTABAM / 'tools/emu')]
    import toolpath  # noqa: F401
    import emu_card
    import ot_project
    out.mkdir(parents=True, exist_ok=False)
    for name, module in (('stock-fx', False), ('module-set', True), ('module-lines', True)):
        tree = out / name / 'MODWERK'
        shutil.copytree(project, tree / 'TEMPLATE')
        (tree / 'AUDIO').mkdir()
        parts = assignment(module, HANDLE.get(name, EVERB))
        if name == 'module-lines':  # where the writer puts them, after PATTERN_CHANGE_AUTO_SILENCE_TRACKS
            work = tree / 'TEMPLATE' / 'project.work'
            data = work.read_bytes()
            at = data.index(b'\n', data.index(b'PATTERN_CHANGE_AUTO_SILENCE_TRACKS=')) + 1
            work.write_bytes(data[:at] + LINES + data[at:])
        for bank in sorted((tree / 'TEMPLATE').glob('bank*.work')):
            def mutate(data):
                for p in range(ot_project.NPARTS_ALL):  # four current Parts, then their saved copies
                    fx1, fx2 = parts[p % 4]
                    at = ot_project.PART_BASE + p * ot_project.PART_STRIDE
                    data[at + ot_project.FX1_OFF:at + ot_project.FX1_OFF + 8] = bytes(fx1)
                    data[at + ot_project.FX2_OFF:at + ot_project.FX2_OFF + 8] = bytes(fx2)
            ot_project._bank_write(tree / 'TEMPLATE', int(bank.name[4:6]), mutate, guard=False)
        (out / (name + '.img')).write_bytes(emu_card.build_image(str(out / name)))
        print(out / (name + '.img'))


def dumps(build, out):
    """Every bank's Part records (current and saved), the live effects, the bank pointer, the dispatch."""
    spans = ['0x%x,4=%s/bank.bin' % (BANK_POINTER, out), '0x%x,16=%s/ids.bin' % (LIVE_FX, out)]
    for bank in range(16):
        at = BANK0 + bank * BANK_BYTES + PARTS
        spans.append('0x%x,%d=%s/parts%02d.bin' % (at, SAVED - PARTS + 4 * PART_BYTES, out, bank))
    if build != 'stock':
        symbols = json.loads((Path(build) / 'symbols.json').read_text())
        spans += ['0x%x,4=%s/%s.bin' % (symbols[n], out, n) for n in ('modwerk_dsp_missing', 'dl_errors', 'dl_reinit')]
    home, ids = table(build)
    print('--mem-dump %s --dsp-peek 0:X:%x,%d;1:X:%x,%d' % (';'.join(spans), home, 2 * ids, home, 2 * ids))


def table(build):
    """Where the dispatch tables are: the receiver's (init[ids], then proc[ids]) since step 4, stock's X:$215 before."""
    if build == 'stock':
        return 0x215, 32
    layout = json.loads((Path(build) / 'proofs.json').read_text()).get('dspLoader', {}).get('A', {})
    number = lambda v: int(v, 16) if isinstance(v, str) else v
    return number(layout.get('dispatch', 0x215)), number(layout.get('ids', 32))


def dispatch(log, core, build='stock'):
    import re
    home, ids = table(build)
    m = re.search(r'core %d X:0x%05x:((?: [0-9a-f]{6}){%d})' % (core, home, 2 * ids), log)
    assert m, 'no dispatch table of core %d in the log' % core
    words = [int(w, 16) for w in m[1].split()]
    return words[:ids], words[ids:]


def check(stock_run, base_run, build, case):
    stock_run, base_run = Path(stock_run), Path(base_run)
    proofs = json.loads((Path(build) / 'proofs.json').read_text())
    layout = proofs['dspLoader']
    loaded = {int(fx) for fx in layout['A']['stock']}  # stock effects the base loads on demand
    read = lambda run, name: (run / (name + '.bin')).read_bytes()
    u32 = lambda run, name: int.from_bytes(read(run, name), 'big')
    for bank in range(16):
        assert read(stock_run, 'parts%02d' % bank) == read(base_run, 'parts%02d' % bank), 'bank %d: Part records differ' % (bank + 1)
    assert read(stock_run, 'bank') == read(base_run, 'bank'), 'a different bank is current'
    live = list(read(base_run, 'ids'))
    assert live == list(read(stock_run, 'ids')), ('the live effects differ', live, list(read(stock_run, 'ids')))
    module = case != 'stock-fx'
    handle = HANDLE.get(case, EVERB)
    fx1, fx2 = assignment(module, handle)[0]
    assert live == fx1 + fx2, ('Part 1 is not what runs', live)
    logs = [(run / 'log.txt').read_text() for run in (stock_run, base_run)]
    dry = set()
    for tag, core in (('A', 0), ('B', 1)):
        (si, sp), (bi, bp) = dispatch(logs[0], core), dispatch(logs[1], core, build)  # stock, then the base
        null = tuple(layout[tag]['null'])
        tracks = range(4, 8) if core == 0 else range(4)
        for fx in {live[t] for t in tracks} | {live[8 + t] for t in tracks}:
            if module and fx == handle:
                bound = (bi[fx], bp[fx]) != null
                assert bound == (case != 'module-set'), ('effect %d on core %d' % (fx, core), hex(bi[fx]))
                assert (si[fx], sp[fx]) == null, 'stock runs its null stub for an unknown id'
            elif fx in loaded:
                table = int(layout[tag]['table'], 16)
                end = table + int(layout[tag]['tableWords'], 16)
                assert table <= bi[fx] < end and table <= bp[fx] < end, ('core %d did not load effect %d' % (core, fx), hex(bi[fx]))
            else:
                assert (bi[fx], bp[fx]) == (si[fx], sp[fx]), ('core %d dispatches effect %d unlike stock' % (core, fx))
    assert u32(base_run, 'dl_errors') == 0
    told = u32(base_run, 'modwerk_dsp_missing')
    assert told >= (1 if dry or module else 0), 'the unit did not say a slot runs dry'
    if case != 'module-set' and module:
        assert u32(base_run, 'dl_reinit') >= 2, 'both E-Verb slots started from their init'
    print('%s: Part records of all 16 banks and the live effects as on stock; every stock effect that runs is loaded '
          'and bound (resident ones as on stock)%s%s: passed' % (
              case, '; %s dry and reported' % sorted(dry) if dry else '',
              {'module-set': '; E-Verb absent: dry, reported, its bytes kept',
               'module-restored': '; E-Verb installed afterwards: both slots bound and started from init',
               'module-lines': '; E-Verb named at handle 9 by its line, installed afterwards: bound there and started from init'}.get(case, '')))


if __name__ == '__main__':
    mode, *args = sys.argv[1:]
    {'cards': lambda a, b: cards(Path(a), Path(b)), 'dumps': dumps, 'check': check}[mode](*args)
