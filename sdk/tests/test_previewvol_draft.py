"""Static Preview Vol import checks. Never import or evaluate its manifest."""
import ast
import hashlib
import json
from pathlib import Path
import unittest

APP = Path(__file__).resolve().parents[2]
REPORT = json.loads((APP / 'sdk/imports/previewvol-906fc354.json').read_text())
DRAFT = APP / REPORT['destination']


class PreviewVolDraft(unittest.TestCase):
    def test_pinned_import_identity_and_source_hygiene(self):
        self.assertEqual(REPORT['repository'], 'https://github.com/repeat98/octamad')
        self.assertEqual(REPORT['revision'], '906fc354536d9a1d6ccd90a87fcf3c1f6edb6488')
        self.assertEqual(REPORT['sourcePath'], 'modules/previewvol')
        self.assertEqual(REPORT['destination'], 'sdk/drafts/previewvol')
        self.assertEqual({item['path'] for item in REPORT['files']},
                         {'manifest.py', 'previewvol.s', 'OCTAMAD.md', 'LICENSE'})
        for item in REPORT['files']:
            path = DRAFT / item['path']
            self.assertFalse(path.is_symlink())
            self.assertRegex(item['sourceGitBlob'], r'^[a-f0-9]{40}$')
            self.assertRegex(item['sourceSha256'], r'^[a-f0-9]{64}$')
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),
                             item['vendoredSha256'], item['path'])
            if item['path'] != 'manifest.py':
                self.assertEqual(item['sourceSha256'], item['vendoredSha256'])
        for path in DRAFT.rglob('*'):
            self.assertFalse(path.is_symlink())
            self.assertNotIn(path.name, ['.git', 'out', 'downloads', 'vendor', '__pycache__'])
            if path.is_file():
                self.assertIn(path.suffix, ['', '.md', '.json', '.py', '.s'])
                path.read_text(encoding='utf-8')
        self.assertIn('Copyright (c) 2026 Sam Banks', (DRAFT / 'LICENSE').read_text())

    def test_both_preview_detours_use_local_fingerprint_guards(self):
        tree = ast.parse((DRAFT / 'manifest.py').read_text())
        calls = [node for node in ast.walk(tree)
                 if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)]
        detours = [node for node in calls if node.func.id == 'Detour']
        self.assertEqual(len(detours), 2)
        actual = []
        for detour in detours:
            guard = detour.args[1]
            self.assertIsInstance(guard, ast.Call)
            self.assertEqual(guard.func.id, 'stock_guard')
            address, length, digest = [ast.literal_eval(arg) for arg in guard.args]
            self.assertEqual(address, ast.literal_eval(detour.args[0]))
            self.assertEqual(length, 6)
            self.assertRegex(digest, r'^[a-f0-9]{64}$')
            actual.append({'address': address, 'bytes': length, 'sha256': digest})
        self.assertEqual(actual, REPORT['stockGuards'])
        self.assertEqual({guard['address'] for guard in actual}, {0x40094296, 0x40096EB2})
        self.assertNotIn('bytes.fromhex', (DRAFT / 'manifest.py').read_text())
        linked = [node for node in calls if node.func.id == 'Linked']
        self.assertEqual(len(linked), 1)
        self.assertEqual(ast.literal_eval(linked[0].args[1]), 'modules/previewvol/previewvol.s')
        self.assertTrue((DRAFT / 'previewvol.s').is_file())


if __name__ == '__main__':
    unittest.main()
