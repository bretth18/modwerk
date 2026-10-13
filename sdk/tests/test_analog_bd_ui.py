# SPDX-License-Identifier: MIT
"""Read-only private AB root plans: identity, aliases and paused consumers."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
ADAPTER = ROOT / 'sdk/machines/octatrack/module-adapters'


class AnalogBdUiTests(unittest.TestCase):
    def test_hash_only_native_observations_match_exact_unwired_source(self):
        doc=json.loads((ADAPTER/'analog_bd_ui_observations.json').read_text())
        self.assertEqual(doc['schema'],'modwerk-private-ab-ui-observations-v1')
        self.assertFalse(doc['fullBoot'])
        self.assertFalse(doc['descriptorAndPartConsumersQualified'])
        self.assertFalse(doc['productionStableLockQualified'])
        for name,digest in doc['sourcePins'].items():
            self.assertEqual(hashlib.sha256((ROOT/name).read_bytes()).hexdigest(),digest,name)
        self.assertEqual(len(doc['runs']),22)
        self.assertEqual({r['variant'] for r in doc['runs']},{'0','1','2','3','4','5','6','7','qz-1','qz-2','qz-3'})
        for run in doc['runs']:
            self.assertEqual(run['calls'],12)
            self.assertEqual(run['stockCloseCallbackBoundaries'],2)
            self.assertEqual(run['retainedRefusals'],4)
            self.assertTrue(run['exactPreinstallRootRestore'])
            self.assertTrue(run['syntheticHelperIdentity'])
            for name in ('unknownExports','productionLease','encodedPackage','hardware','admission'):
                self.assertFalse(run[name])

    def test_actual_coldfire_helper_and_native_driver_link(self):
        gcc,ld,nm=[shutil.which('m68k-elf-'+name) for name in ('gcc','ld','nm')]
        if not all((gcc,ld,nm)):
            self.skipTest('ColdFire compiler required')
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp);objects=[]
            for name in ('analog_bd_ui','machine_lifetime','analog_bd_ui_driver'):
                obj=folder/(name+'.o');objects.append(obj)
                subprocess.run([gcc,'-mcpu=5475','-msoft-float','-O2','-ffreestanding','-fno-builtin',
                                '-fno-jump-tables','-fno-asynchronous-unwind-tables','-fomit-frame-pointer',
                                '-Wall','-Wextra','-Werror','-I'+str(ADAPTER),'-I'+str(ROOT/'sdk/runtime/loader'),
                                '-I'+str(ROOT/'sdk/runtime/upload'),'-c',str(ADAPTER/(name+'.c')),'-o',str(obj)],
                               check=True,capture_output=True)
            script=folder/'helper.ld';script.write_text('SECTIONS { . = 0x47400000; .text : { *(.text*) *(.rodata*) *(.data*) } .bss : { *(.bss*) *(COMMON) } /DISCARD/ : { *(.comment) *(.eh_frame) } }')
            output=folder/'helper.elf'
            subprocess.run([ld,'--no-warn-rwx-segments','-T',str(script),*map(str,objects),'-o',str(output)],check=True,capture_output=True)
            symbols=subprocess.check_output([nm,str(output)],text=True)
            self.assertNotIn(' U ',symbols)
            self.assertIn(' T ab_ui_retirement_plan',symbols)
            self.assertIn(' T native_capture',symbols)

    def test_exact_snapshot_and_closed_current_paused_retirement_negatives(self):
        cc = shutil.which('cc')
        if not cc:
            self.skipTest('native C compiler required')
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'probe'
            subprocess.run([cc, '-std=c99', '-Wall', '-Wextra', '-Werror', '-pedantic',
                            '-I' + str(ADAPTER), '-I' + str(ROOT / 'sdk/runtime/loader'),
                            '-I' + str(ROOT / 'sdk/runtime/upload'),
                            *[str(ADAPTER / (name + '.c')) for name in
                              ('analog_bd_ui', 'machine_lifetime', 'test_analog_bd_ui')], '-o', str(output)],
                           check=True, capture_output=True)
            subprocess.run([str(output)], check=True, capture_output=True)


if __name__ == '__main__':
    unittest.main()
