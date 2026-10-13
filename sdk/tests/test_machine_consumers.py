# SPDX-License-Identifier: MIT
"""Authored synthetic association checks; no stock firmware or device."""
import copy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ADAPTER = Path(__file__).resolve().parents[1] / 'machines/octatrack/module-adapters'
previous_path = sys.path[:]
try:
    sys.path.insert(0, str(ADAPTER))
    from probe_fm_consumers import reviewed_image
finally:
    # The CLI puts its private loader tools first. Importing its pure helper
    # must not redirect the SDK's separate Octabam `build` test imports.
    sys.path[:] = previous_path


class ConsumerAssociationTests(unittest.TestCase):
    def test_retained_observations_bind_actual_tool_sources_and_keep_scope_private(self):
        report = json.loads((ADAPTER / 'fm-consumer-observations.json').read_text())
        self.assertEqual({row['memberMask'] for row in report['receipts']}, {4, 5, 6, 7})
        self.assertTrue(all(report[key] is False for key in ('hardware', 'boot', 'audio', 'publicAdmission')))
        for row in report['receipts']:
            self.assertTrue(all(row[key] is False for key in ('hardware', 'boot', 'dsp', 'audio',
                                                             'exhaustiveConsumerCoverage', 'admission')))
            for name, digest in row['probeSources'].items():
                self.assertEqual(hashlib.sha256((ADAPTER / name).read_bytes()).hexdigest(), digest)
            self.assertEqual({item['observations'][0]['origin'] for item in row['origins']}, {0x47080000, 0x47100000})
            for item in row['origins']:
                observed, negatives = item['observations']
                self.assertEqual((observed['escapedPointers'], observed['resetDescriptorStages'],
                                  observed['randomizeDescriptorStages']), (0, 40, 40))
                self.assertTrue(observed['initializedInputLayer'] and observed['stockNotificationTailExecuted'])
                self.assertTrue(all(negatives.values()))

    def test_actual_known_root_collector_refuses_aliases_and_malformed_lists(self):
        cc = shutil.which('cc')
        if not cc: self.skipTest('no C compiler')
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'test'
            subprocess.run([cc, '-std=c99', '-Wall', '-Wextra', '-Werror', '-pedantic',
                            '-I', str(ADAPTER), str(ADAPTER / 'machine_lifetime.c'),
                            str(ADAPTER / 'machine_lifetime_fixture.c'), '-o', str(output)],
                           check=True, capture_output=True)
            subprocess.run([str(output)], check=True, capture_output=True)

    def fixture(self):
        original = bytes(range(32))
        encoded = bytearray(32);encoded[0] = 0x66;encoded[27] = 28
        compiled = bytearray(encoded);compiled[8:20] = original[:12];compiled[20:22] = b'\xff\xff'
        sha = lambda b: hashlib.sha256(b).hexdigest()
        recipe = dict(schema=1, imageSha256=sha(compiled), sources={'authored.c': 'a' * 64}, symbols={'authored': 0},
                      copies=[dict(offset=8, address=0x40000400, length=12, sha256=sha(original[:12]), purpose='Authored test coincidence.')],
                      fills=[dict(offset=20, length=2, value=255, sha256=sha(b'\xff\xff'), purpose='Authored test sentinel.')])
        capture = {key: recipe[key] for key in ('schema', 'imageSha256', 'sources', 'symbols')}
        return original, bytes(encoded), bytes(compiled), recipe, capture

    def test_exact_reviewed_reconstruction_and_drift_negatives(self):
        original, encoded, compiled, recipe, capture = self.fixture()
        sha = lambda b: hashlib.sha256(b).hexdigest()
        copies = [(8, 0x40000400, 12, hashlib.sha256(original[:12]).digest())]
        fills = [(20, 2, 255)]
        def verify(doc=recipe, cap=capture, raw=encoded, copied=copies, filled=fills, stock=original, digest=None):
            data = json.dumps(doc).encode()
            return reviewed_image(raw, [24], copied, filled, stock, cap, data, digest if digest is not None else sha(data))
        self.assertEqual(verify(), compiled)
        for kwargs in ({'digest': '0' * 64}, {'copied': []}, {'filled': []}, {'stock': bytes(32)},
                       {'raw': bytes(32)}, {'cap': dict(capture, symbols={'moved': 4})}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError): verify(**kwargs)
        changed = copy.deepcopy(recipe);changed['sources']['authored.c'] = 'b' * 64
        with self.assertRaisesRegex(ValueError, 'association'): verify(doc=changed)


if __name__ == '__main__': unittest.main()
