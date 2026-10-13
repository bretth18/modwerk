# SPDX-License-Identifier: GPL-3.0-or-later
"""Native linked preparation regressions using authored, firmware-free fixtures."""
import hashlib
import importlib.util
from pathlib import Path
import shutil
import struct
import sys
import tempfile
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'sdk/machines/octatrack/module-adapters'))
import runtime_tables
import runtime_units
spec = importlib.util.spec_from_file_location('table_fixture_builder', ROOT / 'sdk/runtime/loader/build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


@unittest.skipUnless(shutil.which('m68k-elf-as') and shutil.which('m68k-elf-ld'), 'ColdFire binutils unavailable')
class RuntimeUnits(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.sdk = self.root / 'sdk'
        self.sdk.mkdir()
        (self.sdk / 'row.s').write_text('.include "remix.inc"\n.text\n.global entry\nentry:\n.ifdef SC_KEY\nnop\n.endif\nrts\n')
        self.unit = SimpleNamespace(label='row', source='row.s', defsyms=(), stock_copies=(),
                                    include=lambda selected: '.set SC_KEY,1\n' if 'SC' in selected else '| no SC\n',
                                    reference_for=lambda selected: (0x40003000, hashlib.sha256(
                                        bytes.fromhex('4e714e75' if 'SC' in selected else '4e75')).hexdigest()))
        table = SimpleNamespace(old=0x40001000, count=16, insert_at=2,
                                symbols=(('row', 'entry'),), refs=((0x40002002, 0x40001000),))
        self.module = SimpleNamespace(key='TEST', linked=(self.unit,), tables=(table,), detours=(), pokes=(),
                                      symbol_refs=(), requires=(), keeps=(), dram_regions=(), overrides=(),
                                      cf_patches=(), dsp=None)
        self.data = struct.pack('>16I', *range(0x40004000, 0x40004040, 4))
        self.guard = runtime_tables.capture(table, self.read)

    def read(self, address, n):
        if 0x40001000 <= address and address + n <= 0x40001040:
            return self.data[address - 0x40001000:address - 0x40001000 + n]
        if address == 0x40002002 and n == 4:
            return struct.pack('>I', 0x40001000)
        raise ValueError('Outside authored synthetic fixture')

    def prepare(self, name='work', selected=frozenset({'TEST'}), selected_builder=builder):
        return runtime_units.compile_linked(self.module, self.sdk, selected_builder, self.root / name,
                                            'm68k-elf-', selected, [self.guard], self.read)

    def test_real_assembly_and_callable_variant_match_their_own_references(self):
        normal = self.prepare()
        variant = self.prepare('with-sc', {'TEST', 'SC'})
        self.assertTrue(normal['tableOracle'] and variant['tableOracle'])
        self.assertEqual(normal['origins'], [0, 0x10000])
        self.assertEqual(len(normal['copies']), 3)
        self.assertNotEqual(normal['referenceProofs'][0]['sha256'], variant['referenceProofs'][0]['sha256'])
        self.assertEqual(len(normal['sites']), 1)

    def test_source_drift_and_mismatched_callable_variant_are_refused(self):
        (self.sdk / 'row.s').write_text('.text\n.global entry\nentry:\nnop\nrts\n')
        with self.assertRaisesRegex(ValueError, 'reference changed'):
            self.prepare()
        (self.sdk / 'row.s').write_text('.include "remix.inc"\n.text\n.global entry\nentry:\n.ifdef SC_KEY\nnop\n.endif\nrts\n')
        normal_reference = self.unit.reference_for({'TEST'})
        self.unit.reference_for = lambda selected: normal_reference
        with self.assertRaisesRegex(ValueError, 'reference changed'):
            self.prepare('wrong-variant', {'TEST', 'SC'})

    def test_missing_relocation_is_detected_by_fresh_high_origin_image(self):
        broken = SimpleNamespace(**vars(builder))
        original = builder.link_units
        def omit(objects, cross, origin, work):
            image, symbols, bss, offsets = original(objects, cross, origin, work)
            self.assertTrue(offsets)
            return image, symbols, bss, offsets[1:]
        broken.link_units = omit
        with self.assertRaisesRegex(ValueError, 'high-origin'):
            self.prepare(selected_builder=broken)

    def test_dependencies_external_sources_and_changed_table_guards_are_refused(self):
        self.module.requires = ('unported',)
        with self.assertRaisesRegex(ValueError, 'unported resource'):
            self.prepare()
        self.assertFalse((self.root / 'work').exists())
        self.module.requires = ()
        self.unit.source = '../outside.s'
        with self.assertRaisesRegex(ValueError, 'external symbols'):
            self.prepare()
        self.unit.source = 'row.s'
        self.data = b'\1' + self.data[1:]
        with self.assertRaisesRegex(ValueError, 'stock table'):
            self.prepare('changed-stock')


if __name__ == '__main__':
    unittest.main()
