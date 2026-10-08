"""Offline native regression runner; invoke inside the documented container."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import apply


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--toolchain', type=Path, default=Path('/opt/toolchain'))
    args = p.parse_args()
    work = args.output.resolve()
    work.mkdir(parents=True, exist_ok=True)
    sdk = HERE.parents[2] / 'octabam'
    apply.stage(sdk, work / 'native')
    (work / 'native/vendor').symlink_to(args.toolchain / 'vendor')
    baseline = work / 'baseline'
    baseline.mkdir()
    for name in ('bd909.asm', 'bd808.asm', 'dsp909.py', 'dsp808.py', 'fit909.json'):
        shutil.copy2(sdk / 'modules/analog-bassdrum' / name, baseline / name)
    for name in ('test.py', 'probe.py', 'multi-test.py', 'build-baseline.py', 'multi_host.cpp'):
        shutil.copy2(HERE / name, work / name)
    v = args.toolchain / 'vendor/dsp56300'
    libs = v / 'build/source'
    flags = ['c++', '-O3', '-DNDEBUG', '-std=gnu++17', '-DASMJIT_STATIC', '-DDSP56300_DEBUGGER=0',
             '-DDSP56K_USE_PERF_JIT_PROFILING', '-DDSP56K_USE_VTUNE_JIT_PROFILING_API',
             '-I' + str(v / 'source'), '-I' + str(v / 'source/asmjit/src')]
    link = [str(libs / lib) for lib in ('dsp56kEmu/libdsp56kEmu.a', 'dsp56kBase/libdsp56kBase.a',
                                      'asmjit/libasmjit.a', 'vtuneSdk/libvtuneSdk.a')] + ['-lpthread', '-ldl']
    host = work / 'native/out/bd909/bd909_host'
    host.parent.mkdir(parents=True)
    for source, binary in ((work / 'native/tools/harness/bd909_host/bd909_host.cpp', host),
                           (work / 'multi_host.cpp', work / 'multi_host')):
        subprocess.run(flags + [str(source)] + link + ['-o', str(binary)], check=True, cwd=work)
    # The baseline builder has the same fixed toolchain path as the gate scripts.
    if args.toolchain != Path('/opt/toolchain'):
        path = work / 'build-baseline.py'
        path.write_text(path.read_text().replace('/opt/toolchain', str(args.toolchain)))
    env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}
    for name in ('build-baseline.py', 'test.py', 'probe.py', 'multi-test.py'):
        subprocess.run([sys.executable, str(work / name)], check=True, cwd=work, env=env)
    record = apply.verify(sdk)
    digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
    report = {'schema': 1, 'moduleId': record['id'], 'candidateVersion': record['version'],
              'date': '2026-10-08', 'baseFiles': record['baseFiles'], 'candidateFiles': record['candidateFiles'],
              'qualificationFiles': {p.name: digest(p) for p in sorted(HERE.iterdir()) if p.is_file()},
              'toolchainFiles': {str(p.relative_to(v)): digest(p) for p in
                                 [v / 'build/source/dsp_host/dsp_asm', v / 'build/source/disassemble/dsp56kDisassemble',
                                  libs / 'dsp56kEmu/libdsp56kEmu.a', libs / 'dsp56kBase/libdsp56kBase.a',
                                  libs / 'asmjit/libasmjit.a', libs / 'vtuneSdk/libvtuneSdk.a']},
              'native': json.loads((work / 'report.json').read_text()),
              'stepProbe': json.loads((work / 'probe-report.json').read_text()),
              'instanceIsolation': json.loads((work / 'multi-report.json').read_text()),
              'firmwarePersistence': 'untested for candidate', 'physicalHardware': 'untested',
              'worstCaseChipCycles': 'unmeasured', 'fullChainAndMaximumFxLoad': 'untested'}
    (work / 'evidence.json').write_text(json.dumps(report, indent=2) + '\n')
    print('PASS native gates; firmware persistence/hardware qualification remains pending', flush=True)


if __name__ == '__main__':
    main()
