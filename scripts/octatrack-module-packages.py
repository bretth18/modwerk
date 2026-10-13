#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Portable host entry point for the qualified Octatrack package builder."""
import importlib.util
import os
import subprocess
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1]


def main():
    spec = importlib.util.spec_from_file_location(
        'octatrack_module_packages', APP / 'sdk/machines/octatrack/elekloader/module_packages.py')
    builder = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = builder
    spec.loader.exec_module(builder)
    # The qualified builder's JSON:KEY syntax predates Windows drive letters.
    # Use its documented relative-path form, without altering any base input.
    builder.DSP = builder.DSP.relative_to(APP)
    os.chdir(APP)
    # Python's -X utf8 does not propagate to the builder's Python children.
    os.environ['PYTHONUTF8'] = '1'
    try:
        builder.main()
    except subprocess.CalledProcessError as error:
        print(error.stdout or '', end='', file=sys.stderr)
        print(error.stderr or '', end='', file=sys.stderr)
        raise SystemExit(error.returncode) from error


if __name__ == '__main__':
    main()
