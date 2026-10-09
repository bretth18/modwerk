#!/usr/bin/env python3
"""Regenerate the checked-in control.s from gen.c, native.c and hooks.s.
Run the compiler in the isolated toolchain image; firmware is not an input.
"""
from pathlib import Path
import argparse
import subprocess
import tempfile

FLAGS = ['-mcpu=5475', '-msoft-float', '-O2', '-ffreestanding', '-fno-builtin',
         '-fno-common', '-fno-jump-tables', '-fno-asynchronous-unwind-tables',
         '-fno-ident', '-fomit-frame-pointer', '-fno-zero-initialized-in-bss',
         '-Wall', '-Wextra', '-Werror']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    here = Path(__file__).resolve().parent
    if args.output.exists():
        parser.error('Output exists; use a fresh private build directory.')
    with tempfile.TemporaryDirectory(prefix='euclid-seq-cf.') as directory:
        work = Path(directory)
        unity = work / 'euclid_seq.c'
        unity.write_text('#include "gen.c"\n#include "native.c"\n')
        assembly = work / 'euclid_seq.s'
        subprocess.run(['m68k-elf-gcc', *FLAGS, '-I', str(here), '-S', str(unity), '-o', str(assembly)], check=True)
        args.output.write_text(assembly.read_text() + '\n#APP\n' + (here / 'hooks.s').read_text())
    print('Prepared authored ColdFire source.')


if __name__ == '__main__':
    main()
