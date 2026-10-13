#!/usr/bin/env python3
"""Verify real Digi Mono panel edits in the pinned emulator, outside the checkout.

Run in a network-denied sandbox without user credentials. Firmware, cards and
snapshots stay private. This reads parameter RAM; it never injects UI state.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys

PIN = 'c1b5735835923e328f8b4950d6ba927875e5b669'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--emulator', type=Path, required=True)
parser.add_argument('--firmware', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--os', choices=['1.53', '1.54'], required=True)
parser.add_argument('--legacy', action='store_true', help='Measure the pre-fix 0.13.2 layout')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = args.out.resolve()
if out.exists() or out.is_relative_to(root):
    parser.error('--out must be new and outside the checkout')
emulator = args.emulator.resolve()
git_env = {**os.environ, 'GIT_CONFIG_GLOBAL': os.devnull, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_TERMINAL_PROMPT': '0'}
revision = subprocess.check_output(['git', '-C', str(emulator), 'rev-parse', 'HEAD'], text=True, env=git_env).strip()
if revision != PIN or subprocess.check_output(['git', '-C', str(emulator), 'status', '--porcelain', '--untracked-files=no'], text=True, env=git_env).strip():
    parser.error('use a clean pinned digiemu checkout: ' + PIN)
sys.path.insert(0, str(emulator))
from emu.fwcheck import prepare
from emu.bootstrap import first_run
from emu.session import Session, run_script
from emu.fwcompare import parse_script

out.mkdir(mode=0o700)
paths, device = prepare(str(args.firmware.resolve()), str(out))
first_run(paths, progress=lambda event: print(event.text, flush=True) if event.kind in ['note', 'done'] else None)
session = Session(paths.gui, paths.syx, audio=False, hle=False)
kit_address = 0x4199ec44 if args.os == '1.54' else 0x4199dc44
active_address = 0x4197c6b4 if args.os == '1.54' else 0x4197b6b4


def u32(address):
    return struct.unpack('>I', session.m.uc.mem_read(address, 4))[0]


def state():
    kit = u32(kit_address)
    return {
        'activeTrack': u32(active_address),
        'machines': [session.m.uc.mem_read(kit + 0x9e + 0xa2 * track, 1)[0] for track in range(8)],
        'slots': [[struct.unpack('>H', session.m.uc.mem_read(kit + 0x20 + 0xa2 * track + 0x14 + 2 * slot, 2))[0]
                   for slot in range(17, 25)] for track in range(8)],
    }


def run(plan):
    run_script(session, parse_script(plan + '\n'))
    if session.halted:
        raise RuntimeError(session.halted)


def turn(encoder, delta):
    # Successive detents exercise the panel driver's filter, unlike one large packet.
    run(('turn ' + encoder + ' ' + str(delta) + ' 40\n') * 16 + 'wait 400')


results = []
try:
    run('wait 1000\npress FUNC\ntap SRC\nrelease FUNC\n' + 'tap DOWN\n' * 6 + 'tap YES\ntap AMP\ntap SRC')
    assert state()['activeTrack'] == 0 and state()['machines'][0] == 22, state()
    for model in ['SAW', 'PULSE']:
        if model == 'PULSE':
            run('press FUNC\ntap SRC\nrelease FUNC\ntap DOWN\ntap YES\ntap AMP\ntap SRC')
            assert state()['machines'][0] == 23, state()
        initial = state()
        changes = []
        expected = list(range(17, 25)) if model == 'SAW' or args.legacy else [17, 18, 19, 22, 23, 24, 21, 20]
        for index, encoder in enumerate('ABCDEFGH'):
            before = state()
            turn(encoder, 1)
            after = state()
            changed = [slot + 17 for slot, (left, right) in enumerate(zip(before['slots'][0], after['slots'][0])) if left != right]
            wanted = [] if model == 'SAW' and encoder == 'D' else [expected[index]]
            assert before['slots'][1:] == after['slots'][1:], ('other track changed', model, encoder)
            assert changed == wanted, (model, encoder, changed, wanted)
            changes.append({'encoder': encoder, 'changedSlots': changed, 'before': before['slots'][0], 'after': after['slots'][0]})
        for encoder in 'ABCDEFGH':
            turn(encoder, -1)
        run('tap SRC 70 40\ntap SRC 70 800')
        results.append({'model': model, 'machine': state()['machines'][0], 'initialSlots': initial['slots'][0],
                        'encoderChanges': changes, 'afterReturnSlots': state()['slots'][0]})
    report = {
        'firmwareSha256': hashlib.sha256(args.firmware.read_bytes()).hexdigest(), 'os': args.os,
        'legacy': args.legacy, 'emulatorRevision': revision, 'hle': False, 'audio': False, 'cycleTiming': False,
        'inputs': session.inputs, 'results': results, 'halted': session.halted,
        'limits': ['Stored-slot software evidence only; hardware, audio, timing, complete memory bounds, persistence, reboot and stress are unverified.',
                   'P-lock and LFO execution are unverified; their stored mappings are unchanged in the source.'],
    }
    (out / 'encoder-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'os': args.os, 'legacy': args.legacy, 'result': 'PASS'}), flush=True)
finally:
    session.close()
