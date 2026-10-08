"""Verify the draft overlay, or stage it in a new disposable SDK copy.

Reads source identities only in --verify mode. Never writes the approved SDK.
Run pending native source only inside the isolation boundary in TESTING.md.
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
FILES = {'bd909.asm': 'modules/analog-bassdrum/bd909.asm',
         'dsp909.py': 'modules/analog-bassdrum/dsp909.py',
         'dsp808.py': 'modules/analog-bassdrum/dsp808.py',
         'build-ab_image.py': 'tools/build/ab_image.py'}
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def verify(sdk):
    record = json.loads((HERE / 'draft.json').read_text())
    for relative, digest in record['baseFiles'].items():
        path = sdk / relative
        if path.is_symlink() or sha(path) != digest:
            raise ValueError('Draft base identity changed: ' + relative)
    for relative, digest in record['candidateFiles'].items():
        path = HERE / relative
        if path.is_symlink() or sha(path) != digest:
            raise ValueError('Draft source identity changed: ' + relative)
    return record


def stage(sdk, output):
    verify(sdk)
    if output.resolve().is_relative_to(sdk.resolve()):
        raise ValueError('Output must be outside the approved SDK')
    if output.exists():
        raise ValueError('Use a new disposable output directory')
    # Symlinks and build/firmware outputs are never input to the candidate.
    for path in sdk.rglob('*'):
        if path.is_symlink() and 'vendor' not in path.parts:
            raise ValueError('Source symlink: ' + str(path))
    shutil.copytree(sdk, output, ignore=shutil.ignore_patterns('vendor', 'out', '__pycache__', '*.pyc', '.DS_Store'))
    for local, relative in FILES.items():
        shutil.copy2(HERE / local, output / relative)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sdk', type=Path, default=HERE.parents[1] / 'octabam')
    parser.add_argument('--verify', action='store_true')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.verify:
        verify(args.sdk.resolve())
        print('PASS draft base/source identities; publication remains pending')
    elif args.output:
        stage(args.sdk.resolve(), args.output.resolve())
    else:
        parser.error('Pass --verify or --output <new temporary SDK directory>')


if __name__ == '__main__':
    main()
