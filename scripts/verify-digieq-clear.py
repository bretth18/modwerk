#!/usr/bin/env python3
"""Exercise Digi EQ's native Clear shortcut in pinned digiemu, outside the checkout.

Run with network and user credentials denied. Only read parameter state; never
inject menu/kit RAM. Firmware, cards and snapshots remain private in --out.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--emulator', type=Path, required=True)
parser.add_argument('--firmware', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--os', choices=['1.53', '1.54'], required=True)
parser.add_argument('--legacy', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = args.out.resolve()
if out.exists() or out.is_relative_to(root):
    parser.error('--out must be new and outside the checkout')
emulator = args.emulator.resolve()
env = {**os.environ, 'GIT_CONFIG_GLOBAL': os.devnull, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_TERMINAL_PROMPT': '0'}
pin = 'c1b5735835923e328f8b4950d6ba927875e5b669'
if subprocess.check_output(['git', '-C', str(emulator), 'rev-parse', 'HEAD'], text=True, env=env).strip() != pin or subprocess.check_output(['git', '-C', str(emulator), 'status', '--porcelain', '--untracked-files=no'], text=True, env=env).strip():
    parser.error('use a clean emulator at ' + pin)
sys.path.insert(0, str(emulator))
from emu.fwcheck import prepare
from emu.bootstrap import first_run
from emu.session import Session, run_script
from emu.fwcompare import parse_script
from unicorn.m68k_const import UC_M68K_REG_A7

out.mkdir(mode=0o700)
paths, device = prepare(str(args.firmware.resolve()), str(out))
first_run(paths, progress=lambda e: print(e.text, flush=True) if e.kind in ['note', 'done'] else None)
s = Session(paths.gui, paths.syx, audio=False, hle=False)
kit_address = 0x4199ec44 if args.os == '1.54' else 0x4199dc44
key_events = []
key_slot = 0x401848e4 if args.os == '1.54' else 0x401845e4
def observe_key(uc, address, size, data):
    sp = uc.reg_read(UC_M68K_REG_A7)
    ev = struct.unpack('>I', uc.mem_read(sp + 8, 4))[0]
    key, flags = struct.unpack('>II', uc.mem_read(ev + 12, 8))
    key_events.append({'key': key, 'flags': flags})
s.at(struct.unpack('>I', s.m.uc.mem_read(key_slot, 4))[0], observe_key)


def run(plan):
    run_script(s, parse_script(plan + '\n'))
    if s.halted:
        raise RuntimeError(s.halted)


def turn(encoder, direction=1):
    run(('turn ' + encoder + ' ' + str(direction) + ' 40\n') * 8 + 'wait 400')


def state():
    kit = struct.unpack('>I', s.m.uc.mem_read(kit_address, 4))[0]
    sounds = bytes(s.m.uc.mem_read(kit + 0x20, 8 * 0xa2))
    bands = []
    for b in range(4):
        type_q = sounds[b * 0xa2 + 3]
        w = int.from_bytes(sounds[b * 0xa2 + 0x14:b * 0xa2 + 0x16], 'big')
        bands.append({'frequency': w & 127, 'gain': (w >> 7) & 63, 'q': (type_q >> 3) & 15, 'type': type_q & 7})
    return bands, sounds


def clear():
    run('press FUNC\npress LFO\ntap PLAY\nrelease LFO\nrelease FUNC\nwait 400')


default = [{'frequency': f, 'gain': 24, 'q': q, 'type': t} for f, q, t in zip([25, 55, 89, 114], [4, 5, 5, 4], [1, 2, 2, 5])]
observations = []
try:
    run('wait 1000\npress FUNC\ntap LFO\nrelease FUNC\npress FUNC\ntap LFO\nrelease FUNC')
    for encoder in 'ABCDEFGH':
        turn(encoder)
    for encoder in 'ABCDEFGH':
        run('tap ' + encoder)
    for encoder in 'ABCDEFGH':
        turn(encoder)
    before, raw_before = state()
    assert all(all(b[k] != d[k] for k in d) for b, d in zip(before, default)), (before, key_events)
    clear()
    after, raw_after = state()
    if args.legacy:
        assert before == after, (before, after)
    else:
        assert after == default, after
    changes = []
    for index, (a, b) in enumerate(zip(raw_before, raw_after)):
        if a == b:
            continue
        track, offset = divmod(index, 0xa2)
        assert track < 4 and (offset in [0x14, 0x15] or offset == 3 and not ((a ^ b) & 0x80)), (track, offset)
        changes.append({'track': track + 1, 'offset': offset})
    observations.append({'case': 'all sixteen band parameters', 'before': before, 'after': after, 'changedSoundBytes': changes, 'nonEqSoundBytesChanged': 0})
    if not args.legacy:
        clear()
        assert state()[0] == default, state()[0]
        # Pressed mode survives Clear: A still edits Q rather than gain.
        turn('A')
        edited = state()[0]
        assert edited[0]['q'] != default[0]['q'] and edited[0]['gain'] == 24, edited
        # FUNC+PLAY alone is the stock pattern shortcut, not page Clear.
        run('press FUNC\ntap PLAY\nrelease FUNC\nwait 400')
        assert state()[0] == edited, state()[0]
        # Step to Internal Mixer and clear it; the EQ must stay edited.
        run('press FUNC\ntap LFO\nrelease FUNC')
        clear()
        assert state()[0] == edited, state()[0]
        observations.append({'case': 'repeat Clear, preserved Q mode, FUNC+PLAY isolation and Internal Mixer Clear isolation', 'result': 'PASS'})
    report = {'os': args.os, 'legacy': args.legacy, 'firmwareSha256': hashlib.sha256(args.firmware.read_bytes()).hexdigest(),
              'emulatorRevision': pin, 'hle': False, 'audio': False, 'cycleTiming': False, 'inputs': s.inputs, 'keyEvents': key_events, 'observations': observations,
              'halted': s.halted, 'limits': ['Hardware, audio, timing, complete memory bounds, persistence, physical reboot and stress are unverified. Global override preservation is source-reviewed; its physical behavior is unverified.']}
    (out / 'clear-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'os': args.os, 'legacy': args.legacy, 'result': 'PASS'}), flush=True)
finally:
    s.close()
