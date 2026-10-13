"""Pin and stage the 909 candidate without changing the approved SDK."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
FILES = ('fit909.json', 'dsp909.py', 'bd909.asm')


def digest(path):
    if path.is_symlink():
        raise ValueError('Source symlinks are prohibited: ' + str(path))
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(sdk):
    record = json.loads((HERE / 'draft.json').read_text())
    for relative, expected in record['baseFiles'].items():
        if digest(sdk / relative) != expected:
            raise ValueError('Approved base changed: ' + relative)
    for relative, expected in record['candidateFiles'].items():
        if digest(HERE / relative) != expected:
            raise ValueError('Candidate changed: ' + relative)
    return record


def stage(sdk, output):
    verify(sdk)
    if output.exists() or output.resolve().is_relative_to(sdk.resolve()):
        raise ValueError('Use a new output directory outside the SDK')
    shutil.copytree(sdk, output, ignore=shutil.ignore_patterns('vendor', 'out', '__pycache__', '*.pyc', '.DS_Store'))
    for name in FILES:
        shutil.copy2(HERE / name, output / 'modules/analog-bassdrum' / name)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--sdk', type=Path, default=HERE.parent.parent / 'octabam')
    p.add_argument('--output', type=Path)
    args = p.parse_args()
    if args.output:
        stage(args.sdk.resolve(), args.output.resolve())
    else:
        verify(args.sdk.resolve())
        print('PASS exact approved base and candidate identities; private candidate only')


if __name__ == '__main__':
    main()
