# SPDX-License-Identifier: MIT
"""Exact private trust-storage generation; no board admission or firmware."""
import importlib
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
ADAPTER = ROOT / 'sdk/machines/octatrack/module-adapters'
sys.path.insert(0, str(ADAPTER))
import machine_declarations as declarations
fixtures = importlib.import_module('test_machine_layout')


class DeclarationTests(unittest.TestCase):
    setUp = fixtures.LayoutTests.setUp
    declaration = fixtures.LayoutTests.declaration
    validate = fixtures.LayoutTests.validate
    def entry(self, data=None, **changes):
        data = self.package if data is None else data
        doc, recipe, digest = self.declaration(data, **changes)
        return dict(package=data, declaration=doc, recipe=recipe, reviewed_sha256=digest, source_root=self.root)

    def test_fixed_empty_and_reviewed_storage(self):
        empty = declarations.empty()
        self.assertEqual((len(empty), empty[:7], set(empty[7:])), (720, b'MWMD\1\0\20', {0}))
        table = declarations.generate([self.entry()])
        self.assertEqual((len(table), table[5], table[52]), (720, 1, 4))
        self.assertEqual(table[16:48].hex(), self.validate().package_sha256)
        for bad in ([self.entry(), self.entry()], [self.entry()] * 17, [dict(self.entry(), reviewed_sha256='0'*64)],
                    [dict(self.entry(), extra=True)], [self.entry(stateLayoutRevision=0)]):
            with self.assertRaises(ValueError): declarations.generate(bad)

    def test_filling_preserves_all_other_bytes_symbols_and_bounds(self):
        empty, table = declarations.empty(), declarations.generate([self.entry()])
        before = b'prefix'*4 + empty + b'identity'+b'guard'*4
        offset, symbols = 24, dict(table=24, arena=0x47080000, guard=744)
        after = declarations.fill_reserved(before, offset, table)
        self.assertTrue(declarations.assert_stable_layout(before, after, symbols, dict(symbols), offset)['stable'])
        for bad in (offset-1, -1, True, len(before)):
            with self.assertRaises(ValueError): declarations.fill_reserved(before, bad, table)
        with self.assertRaises(ValueError): declarations.fill_reserved(after, offset, table)
        for image, changed in ((after+b'x', symbols), (after, dict(symbols, arena=0x47080010)),
                               (b'changed!'+after[8:], symbols)):
            with self.assertRaises(ValueError): declarations.assert_stable_layout(before, image, symbols, changed, offset)
        changed = after[:744]+b'Identity'+after[752:]
        self.assertTrue(declarations.assert_stable_layout(before, changed, symbols, symbols, offset, [(744,752)])['stable'])
        with self.assertRaises(ValueError): declarations.assert_stable_layout(before, changed, symbols, symbols, offset, [(20,750)])



if __name__ == '__main__': unittest.main()
