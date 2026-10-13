# SPDX-License-Identifier: GPL-3.0-or-later
"""The portable package entry point forwards private preparation arguments."""
from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ModulePackagesCliTests(unittest.TestCase):
    def test_private_preparation_can_resolve_its_builder_module(self):
        # Exercise the actual wrapper with a private preparation entry point.
        # The published builder can remain older than that staged entry point;
        # no stock image, packages or catalogue are needed for this regression.
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            wrapper = root / 'scripts/octatrack-module-packages.py'
            wrapper.parent.mkdir()
            shutil.copy2(ROOT / 'scripts/octatrack-module-packages.py', wrapper)
            builder = root / 'sdk/machines/octatrack/elekloader/module_packages.py'
            builder.parent.mkdir(parents=True)
            builder.write_text('''from __future__ import annotations
import argparse, json, os, sys
from dataclasses import dataclass
from pathlib import Path
APP = Path(__file__).resolve().parents[4]
DSP = APP / 'src/engine/assets/dsp-packages.json'
@dataclass
class Preparation:
    ports: str
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare-ports', required=True)
    args = parser.parse_args()
    generator = sys.modules[__name__]
    print(json.dumps({'ports': Preparation(args.prepare_ports).ports,
                      'builder': generator.__name__,
                      'dsp': str(generator.DSP),
                      'cwd': str(Path.cwd()), 'utf8': os.environ['PYTHONUTF8']}))
''')
            result = subprocess.run([sys.executable, '-B', wrapper, '--prepare-ports',
                                     'recorder-loop-fix,playmodes'], cwd=ROOT,
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(json.loads(result.stdout), {
                'ports': 'recorder-loop-fix,playmodes',
                'builder': 'octatrack_module_packages',
                'dsp': str(Path('src/engine/assets/dsp-packages.json')),
                'cwd': str(root.resolve()), 'utf8': '1'})


if __name__ == '__main__':
    unittest.main()
