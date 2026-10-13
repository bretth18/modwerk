# SPDX-License-Identifier: GPL-3.0-or-later
"""The base's startup art (sdk/runtime/startup/base_art.py and base.json) and the public startup it
leaves alone. The animation itself (boot_anim.c) has its host test in the elekloader recipe tests.
No firmware."""
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
STARTUP = ROOT / 'sdk/runtime/startup'


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


build = load('startup_build', STARTUP / 'build.py')
base_art = load('base_art', STARTUP / 'base_art.py')


class PublicStartupTests(unittest.TestCase):
    def test_public_writes_are_unchanged(self):
        recorded = json.loads((ROOT / 'docs/media/startup/verification.json').read_text())['writes']
        got = build.writes()
        self.assertEqual([hashlib.sha256(data).hexdigest() for _, data in got], [w['replacementSha256'] for w in recorded])


class BaseArtTests(unittest.TestCase):
    def test_final_frame_has_room_and_text_beside_the_mark(self):
        pixels = base_art.final_pixels('0.3.1')
        base, (mx, my), tiles, disc, frame, cell, cells = base_art.layers('0.3.1')
        size = len(base['mark']['rows'])
        self.assertEqual(len(pixels), 912)
        self.assertGreaterEqual(min(y for _, y in pixels), 8)            # room at the top edge
        self.assertGreaterEqual(63 - max(y for _, y in pixels), 8)       # and at the bottom
        text = {p for c in cells for p in c[5]}
        self.assertTrue(all(x <= mx - 11 or x >= mx + size + 10 for x, _ in text), 'NEW and BETA keep clear of the mark')
        self.assertEqual(''.join('N' if c[0] == 0 else 'B' for c in cells), 'NNN' + 'B' * 4)  # NEW, then BETA (owner, 12 October 2026)
        self.assertEqual(len(tiles), 8 * 21)                               # eight 5 x 5 tiles with rounded corners
        self.assertEqual(max(c[4] for c in cells), 7)                      # the small 7-pixel type

    def test_versions(self):
        for good in ('0.3.1', '0.4.0', '0.10.1', '9.9.9', '10.10.100'):
            self.assertEqual(base_art.final_pixels(good), base_art.final_pixels('0.3.1'))  # the screen says BETA, not the version
        for bad in ('0.3', '0.3.1-dev', 'x'):
            with self.assertRaises(ValueError):
                base_art.final_pixels(bad)

    def test_header_carries_the_version_and_the_art(self):
        text = base_art.header('0.3.1')
        self.assertIn('#define BOOT_VERSION "0.3.1"', text)
        self.assertIn('static const uint8_t boot_disc[6]', text)
        self.assertIn('#define BOOT_GLYPHS 7', text)


if __name__ == '__main__':
    unittest.main()
