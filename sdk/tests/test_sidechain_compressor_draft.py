"""Read-only sidechain integrity checks: AST/data only; never import its source."""
import ast
import hashlib
import json
from pathlib import Path
import unittest

APP = Path(__file__).resolve().parents[2]
RECORD = json.loads((APP / 'sdk/imports/sidechain-compressor-f80ecfe.json').read_text())
DRAFT = APP / RECORD['root']


class SidechainDraft(unittest.TestCase):
    def test_pins_and_authored_file_identities(self):
        self.assertEqual(RECORD['revision'], 'f80ecfeabc187a33403588678e707443161afc96')
        self.assertEqual(RECORD['authorPin']['revision'], 'd3e0801a5f666abc04bc05fc1cb37969d7fb38d0')
        paths = [entry['path'] for entry in RECORD['files']]
        self.assertEqual(len(paths), len(set(paths)))
        self.assertEqual(set(paths), {'manifest.py', 'upstream/LICENSE',
            'upstream/octabam-modules/sidechain-compressor/README.md',
            'upstream/tools/patch_sidechain.s', 'upstream/tools/patch_sc_dsp3.asm',
            'upstream/tools/sc_tables.py', 'upstream/tools/dsp_asm_util.py',
            'upstream/tools/sc_assemble_oracle.py'})
        for entry in RECORD['files']:
            data = (DRAFT / entry['path']).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), entry['vendoredSha256'], entry['path'])
            self.assertRegex(entry['sourceGitBlob'], r'^[a-f0-9]{40}$')
            self.assertEqual(entry['revision'], RECORD['authorPin']['revision'])
            if 'transforms' not in entry:
                self.assertEqual(entry['sourceSha256'], entry['vendoredSha256'])
                self.assertEqual(entry['sourceGitBlob'], hashlib.sha1(
                    b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest())
                self.assertEqual(entry['sourceBytes'], len(data))
        self.assertIn('Zac', (DRAFT / 'LICENSE').read_text())
        self.assertIn('MIT', (DRAFT / 'LICENSE').read_text())

    def test_only_lazy_local_guards_and_per_core_hook_sites(self):
        tree = ast.parse((DRAFT / 'manifest.py').read_text())
        calls = [n for n in ast.walk(tree) if isinstance(n, ast.Call)
                 and isinstance(n.func, ast.Name)]
        hooks = [n for n in calls if n.func.id == 'DspHook']
        self.assertEqual(len(hooks), 3)
        expected_sites = [{'A': 0x4a7, 'B': 0x29c},
                          {'A': 0x1ab1, 'B': 0x1871},
                          {'A': 0x50e, 'B': 0x303}]
        self.assertEqual([ast.literal_eval(n.args[0]) for n in hooks], expected_sites)
        actual = []
        for hook in hooks:
            guard = hook.args[1]
            self.assertIsInstance(guard, ast.Call)
            self.assertEqual(guard.func.id, 'stock_dsp_words')
            payload, address, words, digest = [ast.literal_eval(arg) for arg in guard.args]
            self.assertEqual(address, ast.literal_eval(hook.args[0])['A'])
            actual.append((payload, address, words, digest))
        self.assertEqual(actual, [(g['payload'], g['address'], g['words'], g['sha256'])
                                  for g in RECORD['stockGuards']])
        menu = next(n for n in calls if n.func.id == 'MenuEntry')
        self.assertTrue(ast.literal_eval(next(k.value for k in menu.keywords if k.arg == 'stock_dsp')))
        ranges = [n for n in calls if n.func.id == 'DspRange']
        self.assertEqual([(ast.literal_eval(n.args[1]), ast.literal_eval(n.args[2]))
                          for n in ranges], [(0x7f0, 0x210), (0x3dfe, 0x202)])
        oracle = ast.parse((DRAFT / 'upstream/tools/sc_assemble_oracle.py').read_text())
        self.assertEqual(len(oracle.body), 1)
        self.assertIsInstance(oracle.body[0], ast.FunctionDef)
        self.assertEqual(oracle.body[0].name, 'sc_assemble')

    def test_current_captures_and_evidence_are_bound_to_source(self):
        document = json.loads((DRAFT / 'octamod.module.json').read_text())
        capture = json.loads((DRAFT / 'media/capture.json').read_text())
        proof = json.loads((DRAFT / 'reports/native-evidence.json').read_text())
        self.assertEqual(document['version'], RECORD['moduleVersion'])
        self.assertEqual(document['source']['revision'], RECORD['revision'])
        self.assertEqual(capture['source']['revision'], RECORD['revision'])
        self.assertEqual(capture['source']['authorRevision'], RECORD['authorPin']['revision'])
        self.assertEqual(capture['moduleVersion'], document['version'])
        self.assertEqual(capture['imageSha256'], proof['imageSha256'])
        self.assertEqual(proof['moduleVersion'], document['version'])
        self.assertEqual(len(document['media']), 3)
        self.assertEqual(capture['emulatorBuild']['tests'],
                         {'ot_emac_test': 'passed', 'ot_periph_test': 'passed'})
        for path, digest in capture['nativeSourceFileHashes'].items():
            self.assertEqual(hashlib.sha256((DRAFT / path).read_bytes()).hexdigest(), digest, path)
        for entry in document['media']:
            self.assertEqual(entry['captureType'], 'emulator')
            self.assertEqual(entry['otUi']['moduleVersion'], document['version'])
            self.assertEqual(entry['otUi']['imageSha256'], proof['imageSha256'])
            self.assertEqual(hashlib.sha256((DRAFT / entry['path']).read_bytes()).hexdigest(),
                             capture['screenshots'][Path(entry['path']).name])
        self.assertEqual([p['payload'] for p in proof['standaloneInstructionParity']], ['A', 'B'])
        for p in proof['standaloneInstructionParity']:
            self.assertEqual((p['codeWords'], p['tableWords']), (340, 48))
            self.assertEqual(p['normalizedDifferences'], [138, 209, 210])
            self.assertTrue(p['stockCompressorDispatchPreserved'])
        self.assertTrue(proof['rejections']['syntheticKeybusAndWindowOverlap'])
        self.assertTrue(proof['rejections']['changedBaseRefused'])
        self.assertEqual(proof['rejections']['independentlyProbed'], ['private-keybus', 'shared-key-window'])
        self.assertTrue(proof['rejections']['disjointClaimAccepted'])
        self.assertTrue(all(v is None for v in proof['qualification'].values()))

    def test_build_ready_release_has_narrow_hardware_waiver(self):
        self.assertEqual(RECORD['root'], 'sdk/octabam/modules/sidechain-compressor')
        for path in ['sdk/catalog.json', 'src/catalog/module-documents.json']:
            entries = json.loads((APP / path).read_text())['modules']
            self.assertIn('sidechain-compressor', {entry['id'] for entry in entries})
        for path in ['sdk/module-qualification-baseline.json', 'sdk/module-release-waivers.json']:
            entries = json.loads((APP / path).read_text())['modules']
            self.assertNotIn('sidechain-compressor', {entry['id'] for entry in entries})
        document = json.loads((DRAFT / 'octamod.module.json').read_text())
        self.assertNotIn('build', document)
        q = document['tests']['qualification']
        self.assertEqual(q['hardware']['kind'], 'owner-waived')
        self.assertEqual(q['memory']['totalBytes'], 23292)
        self.assertEqual([c['processor'] for c in q['cycles']], ['dsp', 'coldfire'])
        self.assertTrue(all(c['maxConfiguration'] < c['budget'] for c in q['cycles']))
        for path in DRAFT.rglob('*'):
            self.assertFalse(path.is_symlink(), str(path))
            self.assertNotIn(path.name, ['.git', 'out', 'downloads', 'vendor', '__pycache__'])
            if path.is_file():
                self.assertIn(path.suffix, ['', '.md', '.json', '.py', '.cpp', '.s', '.asm', '.svg', '.png'])
                if path.suffix == '.png':
                    self.assertTrue(path.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'))
                else:
                    path.read_text(encoding='utf-8')


if __name__ == '__main__':
    unittest.main()
