# SPDX-License-Identifier: GPL-3.0-or-later
"""Authored reconstruction contracts; synthetic data only, no firmware."""
import hashlib
import importlib.util
from pathlib import Path
import unittest

ADAPTER = Path(__file__).resolve().parents[1] / 'machines/octatrack/module-adapters/stock_recipe.py'
spec = importlib.util.spec_from_file_location('runtime_stock_recipe', ADAPTER)
recipe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recipe)


class ReconstructionTests(unittest.TestCase):
    def fixture(self):
        image = bytes(range(16)) + bytes([255]) * 512
        sources = {'authored.s': '1' * 64}
        records = dict(schema=1, imageSha256=hashlib.sha256(image).hexdigest(), sources=sources,
                       copies=[dict(offset=0, length=16, address=0x40001000, sha256=hashlib.sha256(image[:16]).hexdigest(),
                                    purpose='independently assembled synthetic fixture')],
                       fills=[dict(offset=16, length=512, value=255, sha256=hashlib.sha256(image[16:]).hexdigest(),
                                   purpose='authored constant initialized array')])
        return image, sources, records

    def test_reconstructs_original_without_carrying_its_literal_spans(self):
        image, sources, records = self.fixture()
        output, copies, fills = recipe.apply(image, [], records, sources)
        self.assertEqual(output, bytes(len(image)))
        self.assertEqual((copies[0][:3], fills), ((0, 0x40001000, 16), [(16, 512, 255)]))
        rebuilt = bytearray(output)
        rebuilt[:16] = image[:16]  # fake running stock, not an extracted fixture
        rebuilt[16:] = bytes([fills[0][2]]) * fills[0][1]
        self.assertEqual(bytes(rebuilt), image)

    def test_source_image_and_compiled_span_are_all_pinned(self):
        image, sources, records = self.fixture()
        for changed in ({'schema': 2}, {'imageSha256': '0' * 64}, {'sources': {}},
                        {'copies': [{**records['copies'][0], 'sha256': '0' * 64}]}):
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                recipe.apply(image, [], {**records, **changed}, sources)

    def test_overlap_relocation_bounds_and_unreviewed_records_fail_closed(self):
        image, sources, records = self.fixture()
        for changed in ({'copies': [{**records['copies'][0], 'length': 33}]},
                        {'copies': [{**records['copies'][0], 'offset': -1}]},
                        {'copies': [{**records['copies'][0], 'purpose': ''}]},
                        {'fills': [{**records['fills'][0], 'value': 254}]},
                        {'fills': [{**records['fills'][0], 'length': 513}]},
                        {'fills': records['fills'] * 2}):
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                recipe.apply(image, [], {**records, **changed}, sources)
        with self.assertRaisesRegex(ValueError, 'relocation'):
            recipe.apply(image, [4], records, sources)


if __name__ == '__main__':
    unittest.main()
