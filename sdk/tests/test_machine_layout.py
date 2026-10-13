# SPDX-License-Identifier: MIT
"""Exact private layout declarations refuse unreviewed/ambiguous replacements."""
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest

ADAPTER = Path(__file__).resolve().parents[1] / 'machines/octatrack/module-adapters'
spec = importlib.util.spec_from_file_location('machine_layout', ADAPTER / 'machine_layout.py')
layout = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = layout
spec.loader.exec_module(layout)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encoded(doc):
    return (json.dumps(doc, sort_keys=True, separators=(',', ':')) + '\n').encode()


def package():
    image = bytearray(64)
    image[:8] = b'MWMG\x01\x04\x00\x00'
    struct.pack_into('>I', image, 20, 16)
    header = bytearray(76)
    header[:8] = b'MWRM\x00\x08\x00\x04'
    struct.pack_into('>6I', header, 8, len(image), 0, 1, 0, 1, 0xdb769930)
    header[50:58] = b'Machines'
    struct.pack_into('>H2I', header, 66, 1, 1, 1)
    site = struct.pack('>IBBBB', 0x40005000, 8, 0, 8, 1) + sha(b'guard').encode()[:32]
    site += b'\x4e\xb9' + struct.pack('>I', 16) + b'\x4e\x71' + struct.pack('>H', 2)
    copy = struct.pack('>IIHH', 28, 0x40006000, 4, 0) + bytes(32)
    fill = struct.pack('>IIB3x', 32, 4, 255)
    return bytes(header + image + struct.pack('>I', 20) + site + copy + fill)


class LayoutTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'engine.s').write_bytes(b'authored source\n')
        self.package = package()

    def declaration(self, data=None, **changes):
        data = self.package if data is None else data
        size = struct.unpack_from('>I', data, 8)[0] if len(data) >= 12 else 0
        image = data[76:76 + size]
        sources = {'engine.s': sha(b'authored source\n')}
        recipe = encoded(dict(schema=1, imageSha256=sha(image), sources=sources))
        doc = dict(schema=layout.SCHEMA, packageSha256=sha(data), imageSha256=sha(image), compiledImageSha256=sha(image),
                   recipeSha256=sha(recipe), memberMask=image[5] if len(image) > 5 else 4,
                   stateLayoutRevision=1, parameterLayoutRevision=1, sources=sources)
        doc.update(changes)
        declaration = encoded(doc)
        return declaration, recipe, sha(declaration)

    def validate(self, data=None, **changes):
        data = self.package if data is None else bytes(data)
        declaration, recipe, reviewed = self.declaration(data, **changes)
        return layout.validate(data, declaration, recipe, reviewed_sha256=reviewed, source_root=self.root)

    def test_reviewed_exact_full_package_and_same_mask_replacement(self):
        checked = self.validate()
        self.assertEqual((checked.member_mask, checked.state_revision, checked.parameter_revision), (4, 1, 1))
        self.assertEqual(checked.package_sha256, sha(self.package))
        self.assertTrue(layout.same_mask_replacement(checked, self.validate()))

    def test_preparation_records_preserve_exact_guards_and_refuse_unbounded_input(self):
        image, relocations, sites, copies, fills = layout.recipe_records(self.package)
        self.assertEqual((len(image), relocations, len(sites)), (64, [20], 1))
        self.assertEqual(sites[0][:1] + sites[0][3:], (0x40005000, [2], 0, 8))
        self.assertEqual(copies, [(28, 0x40006000, 4, bytes(32))])
        self.assertEqual(fills, [(32, 4, 255)])
        for bad in (self.package[:-1], self.package + b'x', b'MWRM\0\6' + self.package[6:]):
            with self.assertRaises(ValueError): layout.recipe_records(bad)
        bad = bytearray(self.package);struct.pack_into('>I', bad, 76 + 20, 64)
        with self.assertRaisesRegex(ValueError, 'image relocation'): layout.recipe_records(bytes(bad))

    def test_missing_or_changed_review_is_not_inferred_from_membership(self):
        declaration, recipe, reviewed = self.declaration()
        for doc, trusted in ((None, reviewed), (declaration, None), (declaration, '0' * 64),
                             (declaration + b' ', reviewed)):
            with self.subTest(doc=doc is None, trusted=trusted), self.assertRaises(ValueError):
                layout.validate(self.package, doc, recipe, reviewed_sha256=trusted, source_root=self.root)
        for old, new in ((None, self.validate()), (self.validate(), None)):
            with self.assertRaises(ValueError):
                layout.same_mask_replacement(old, new)

    def test_state_or_parameter_revision_change_refuses_replacement(self):
        checked = self.validate()
        with self.assertRaisesRegex(ValueError, 'stored-state'):
            layout.same_mask_replacement(checked, self.validate(stateLayoutRevision=2))
        changed = bytearray(self.package)
        struct.pack_into('>H', changed, 66, 2)
        with self.assertRaisesRegex(ValueError, 'stored-state'):
            layout.same_mask_replacement(checked, self.validate(changed, parameterLayoutRevision=2))
        changed[81] = 2
        with self.assertRaisesRegex(ValueError, 'member mask'):
            layout.same_mask_replacement(checked, self.validate(changed, parameterLayoutRevision=2))
        changed[81] = 4
        struct.pack_into('>I', changed, 28, 123)
        with self.assertRaisesRegex(ValueError, 'same module'):
            layout.same_mask_replacement(checked, self.validate(changed, parameterLayoutRevision=2))

    def test_revisions_are_explicit_positive_integers(self):
        for key in ('stateLayoutRevision', 'parameterLayoutRevision', 'memberMask'):
            for value in (None, 0, True, 1.0, '1', 65536):
                with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                    self.validate(**{key: value})
        with self.assertRaises(ValueError):
            self.validate(parameterLayoutRevision=2)

    def test_file_recipe_and_source_identity_are_bound(self):
        for key in ('packageSha256', 'imageSha256', 'compiledImageSha256', 'recipeSha256'):
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.validate(**{key: '0' * 64})
        declaration, recipe, reviewed = self.declaration()
        with self.assertRaises(ValueError):
            layout.validate(self.package, declaration, recipe + b' ', reviewed_sha256=reviewed, source_root=self.root)
        (self.root / 'engine.s').write_bytes(b'different source\n')
        with self.assertRaisesRegex(ValueError, 'source changed'):
            self.validate()

    def test_compiled_recipe_and_encoded_placeholder_hashes_remain_distinct(self):
        declaration, recipe, _ = self.declaration()
        compiled = encoded(dict(json.loads(recipe), imageSha256=sha(b'compiled authored spans')))
        doc = dict(json.loads(declaration), compiledImageSha256=sha(b'compiled authored spans'), recipeSha256=sha(compiled))
        declaration = encoded(doc)
        checked = layout.validate(self.package, declaration, compiled, reviewed_sha256=sha(declaration), source_root=self.root)
        self.assertEqual(checked.package_sha256, sha(self.package))
        doc['imageSha256'] = doc['compiledImageSha256']
        declaration = encoded(doc)
        with self.assertRaises(ValueError):
            layout.validate(self.package, declaration, compiled, reviewed_sha256=sha(declaration), source_root=self.root)

    def test_declarations_reject_schema_drift_duplicates_and_unsafe_paths(self):
        for changes in (dict(schema=2), dict(extra=True), dict(sources={}), dict(sources={'../escape.s': '0' * 64}),
                        dict(sources={'/escape.s': '0' * 64}), dict(sources={'./engine.s': '0' * 64})):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.validate(**changes)
        declaration, recipe, _ = self.declaration()
        duplicate = declaration.replace(b'{', b'{"schema":"duplicate",', 1)
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            layout.validate(self.package, duplicate, recipe, reviewed_sha256=sha(duplicate), source_root=self.root)

    def test_all_truncated_records_and_trailing_bytes_fail_even_if_reviewed(self):
        for length in range(len(self.package)):
            with self.subTest(length=length), self.assertRaises(ValueError):
                self.validate(self.package[:length])
        with self.assertRaises(ValueError):
            self.validate(self.package + b'\0')

    def test_header_limits_and_group_entry_metadata(self):
        mutations = [(4, '>H', 7), (6, '>H', 5), (8, '>I', 15), (8, '>I', 131073),
                     (12, '>I', 1), (16, '>I', 2049), (20, '>I', 1), (24, '>I', 129),
                     (32, '>I', 1), (36, '>H', 1), (38, '>B', 1), (65, '>B', 1),
                     (66, '>H', 0), (68, '>I', 129), (72, '>I', 65), (80, '>B', 2),
                     (81, '>B', 0), (81, '>B', 8), (82, '>B', 1), (84, '>B', 1)]
        for offset, fmt, value in mutations:
            data = bytearray(self.package)
            struct.pack_into(fmt, data, offset, value)
            with self.subTest(offset=offset, value=value), self.assertRaises(ValueError):
                self.validate(data)

    def test_relocations_and_reconstruction_must_not_alias_metadata_or_each_other(self):
        site = 76 + 64 + 4
        copy = site + 50
        fill = copy + 44
        mutations = [(140, '>I', 8), (140, '>I', 21), (140, '>I', 62),
                     (site, '>I', 0x400de1e0), (site + 4, '>B', 33), (site + 5, '>B', 9),
                     (site + 6, '>B', 0), (site + 7, '>B', 9), (site + 48, '>H', 7),
                     (copy, '>I', 8), (copy, '>I', 20), (copy, '>I', 63), (copy + 10, '>H', 1),
                     (fill, '>I', 28), (fill, '>I', 20), (fill + 4, '>I', 0),
                     (fill + 8, '>B', 0), (fill + 9, '>B', 1)]
        for offset, fmt, value in mutations:
            data = bytearray(self.package)
            struct.pack_into(fmt, data, offset, value)
            with self.subTest(offset=offset, value=value), self.assertRaises(ValueError):
                self.validate(data)


if __name__ == '__main__':
    unittest.main()
