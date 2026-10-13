#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Private actual CF source/lease fixtures. No USB, admission or timing proof.

Queue under /tmp/modwerk-check.lock. Original MAIN and all native outputs stay
outside Git; firmware never enters CI. Fixture Begin/End are trusted synthetic
ABI events, not a production identity resolver or observed board ACKs.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

import stock_hook_controllers as controllers

ROOT = Path(__file__).resolve().parents[4]
MAIN_SHA256 = '164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e'
ARCHIVES = ('libot_machine.a', 'mc68k/lib68kEmu.a', 'dsp56300/dsp56kEmu/libdsp56kEmu.a',
            'dsp56300/dsp56kBase/libdsp56kBase.a', 'dsp56300/asmjit/libasmjit.a')
IMPORTS = {'modwerk_controller_write_begin': 0x47410000, 'modwerk_controller_write_end': 0x47410100}
ORIGINS = (0x40c10000, 0x40c20000)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--main', type=Path, required=True)
    parser.add_argument('--native', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if controllers.sha(args.main.read_bytes()) != MAIN_SHA256:
        raise ValueError('The independent source fixture requires the exact original reviewed 1.40C MAIN.')
    os.umask(0o077)
    out = controllers._private.private_directory(args.out)
    if any(out.iterdir()):
        raise ValueError('Use a new empty private fixture output directory.')
    native = args.native.expanduser().resolve()
    archives = [native / 'out/emu' / path for path in ARCHIVES]
    if not all(path.is_file() for path in archives):
        raise ValueError('Built native Octabam emulator archives are required.')
    source = Path(__file__).with_name('stock_hook_controller_fixture.cpp')
    command = ['c++', '-O2', '-std=c++17', '-I' + str(native / 'tools/emu/ot_emu'),
               '-I' + str(native / 'vendor'), '-I' + str(native / 'vendor/dsp56300/source'),
               source, *archives, '-lpthread', '-o', out / 'probe']
    subprocess.run(command, check=True)
    spec = importlib.util.spec_from_file_location('trusted_controller_builder', ROOT / 'sdk/runtime/loader/build.py')
    builder = importlib.util.module_from_spec(spec); spec.loader.exec_module(builder)
    results = []
    for name in controllers.UNITS:
        for guarded in (False, True):
            work = out / (name + ('-scoped' if guarded else '-original'))
            result = controllers.compile_original(name, ROOT / 'sdk/octabam', builder, work,
                pool_origins=ORIGINS, fixture_imports=IMPORTS if guarded else None)
            symbols = work / 'symbols.txt'
            controllers._private.save(symbols, ''.join(f'{key} {value}\n' for key, value in result['symbols'].items()).encode())
            for origin in ORIGINS:
                image = controllers.cave_runtime.placed(result['image'], result['offsets'], origin)
                raw = work / f'{origin:x}.private.raw'
                controllers._private.save(raw, image)
                argv = [out / 'probe', args.main, raw, symbols, hex(origin), name]
                if guarded: argv.append('guarded')
                execution = subprocess.run(argv, text=True, capture_output=True)
                controllers._private.save(work / f'{origin:x}.log', (execution.stdout + execution.stderr).encode())
                execution.check_returncode()
                line = next(line for line in execution.stdout.splitlines() if line.startswith('PASS actual ColdFire'))
                print(line, flush=True)
                results.append(dict(module=name, guardedFixture=guarded, origin=origin,
                    imageBytes=len(image), imageSha256=controllers.sha(image), bss=result['bss'],
                    symbols=result['symbols'], entries=result['entries'],
                    sourceHashes=result['sourceHashes'], preparationHashes=result['preparationHashes'],
                    adaptedSourceSha256=result['adaptedSourceSha256'],
                    output=line, encodedSha256=None, productionLeaseBound=False,
                    admission=False, matrixModeEnabled=False))
    receipt = dict(schema=1, mainSha256=MAIN_SHA256, nativeFixtureSha256=controllers.sha(source.read_bytes()),
        archives={str(path.relative_to(native)): controllers.sha(path.read_bytes()) for path in archives},
        results=results, limits=['Trusted synthetic Begin/End ABI events; no real board identity, generation, packet ACK or retirement proof.',
            'Executed instructions are not modeled cycles or physical timing. No DSP audio/headroom or complete-base qualification.',
            'Matrix mode changes are refused in the scoped derivative; the separate original full-bank conversion oracle is not a runtime retirement transaction.',
            'Unqualified original menu, descriptor, encoder and project-load functions remain outside prepared entry admission.'])
    controllers._private.save(out / 'receipt.json', receipt)


if __name__ == '__main__':
    main()
