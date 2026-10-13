"""Stock-free negatives for private insertion-aware runtime table preparation."""
import copy
import hashlib
from pathlib import Path
import struct
import sys
from types import SimpleNamespace
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'machines/octatrack/module-adapters'))
import runtime_tables as tables


class RuntimeTables(unittest.TestCase):
    def setUp(self):
        self.table = SimpleNamespace(old=0x40001000, count=16, insert_at=2,
                                     symbols=(('menu', 'new_row'),), refs=((0x40002002, 0x40001000),))
        self.data = struct.pack('>16I', *range(0x40004000, 0x40004040, 4))
        self.stock = {0x40001000: self.data, 0x40002002: struct.pack('>I', self.table.old)}
        self.guard = tables.capture(self.table, self.read)

    def read(self, address, length):
        for base, data in self.stock.items():
            if base <= address and address + length <= base + len(data):
                return data[address - base:address - base + length]
        raise ValueError('Outside synthetic stock')

    def test_insert_keeps_prefix_and_suffix_separate_and_bounded(self):
        plan = tables.prepare(self.table, self.guard, 'grown', self.read)
        self.assertEqual([(c['offset'], c['length']) for c in plan['copies']], [(0, 8), (12, 32), (44, 24)])
        self.assertEqual(plan['assembly'], '.text\n.balign 4\n.global grown\ngrown:\n.space 8\n.long new_row\n.space 56\n')
        self.assertNotIn(self.data.hex(), str(plan))

    def test_bound_copies_reconstruct_native_insertion_oracle(self):
        plan = tables.prepare(self.table, self.guard, 'grown')
        image = bytearray(80)
        struct.pack_into('>I', image, 8, 0x28)
        copies = tables.bind(plan, {'grown': 0}, image, [8])
        for offset, address, length, digest in copies:
            data = self.read(address, length)
            self.assertEqual(hashlib.sha256(data).digest(), digest)
            image[offset:offset + length] = data
        self.assertEqual(list(struct.unpack('>17I', image[:68])),
                         tables.expected_words(self.table, self.read, {'new_row': 0x28}))

    def test_append_and_front_insert_use_their_actual_layout(self):
        for insert in (0, 16, None):
            table = copy.copy(self.table)
            table.insert_at = insert
            plan = tables.prepare(table, tables.capture(table, self.read), 'grown')
            inserted = 16 if insert is None else insert
            self.assertEqual([c['offset'] for c in plan['copies']], [4, 36] if inserted == 0 else [0, 32])

    def test_wrong_insertion_or_partial_guard_fails(self):
        for key, value in [('insertAt', 16), ('count', 15), ('symbols', [['menu', 'other']]), ('sha256', 'bad')]:
            guard = copy.deepcopy(self.guard)
            guard[key] = value
            with self.assertRaises(ValueError):
                tables.prepare(self.table, guard, 'grown')
        guard = copy.deepcopy(self.guard)
        guard['copies'][1]['length'] += 4
        with self.assertRaises(ValueError):
            tables.prepare(self.table, guard, 'grown')

    def test_changed_stock_or_reference_fails(self):
        self.stock[0x40001000] = b'\x01' + self.data[1:]
        with self.assertRaises(ValueError):
            tables.prepare(self.table, self.guard, 'grown', self.read)
        self.stock[0x40001000] = self.data
        self.stock[0x40002002] = bytes(4)
        with self.assertRaises(ValueError):
            tables.capture(self.table, self.read)

    def test_copy_cannot_hide_authored_code_or_relocation(self):
        plan = tables.prepare(self.table, self.guard, 'grown')
        image = bytearray(68)
        image[0] = 1
        with self.assertRaises(ValueError):
            tables.bind(plan, {'grown': 0}, image, [8])
        image[0] = 0
        with self.assertRaises(ValueError):
            tables.bind(plan, {'grown': 0}, image, [12])
        with self.assertRaises(ValueError):
            tables.bind(plan, {'grown': 4}, image, [12])

    def test_unbounded_or_injected_symbol_declarations_fail(self):
        for key, value in [('count', 257), ('insert_at', -1), ('old', 0x40001001),
                           ('symbols', (('menu', 'new_row\n.byte 1'),))]:
            table = copy.copy(self.table)
            setattr(table, key, value)
            with self.assertRaises(ValueError):
                tables.capture(table, self.read)


if __name__ == '__main__':
    unittest.main()
