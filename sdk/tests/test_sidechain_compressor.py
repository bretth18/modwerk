"""Read-only Sidechain Compressor integrity checks: AST and data only; never import its source."""
import ast
import hashlib
import json
from pathlib import Path
import unittest

APP = Path(__file__).resolve().parents[2]
RECORD = json.loads((APP / 'sdk/imports/sidechain-compressor-f80ecfe.json').read_text())
FOLDER = APP / RECORD['root']
IMAGE = '4fd5fcb49ed17cd4e707d407a6e42a64ec30b50aefaad3b1eeb1bb804493aef0'


def proofs(name):
    return json.loads((APP / 'src/engine/assets' / name).read_text())['proofs']


class SidechainCompressor(unittest.TestCase):
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
            data = (FOLDER / entry['path']).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), entry['vendoredSha256'], entry['path'])
            self.assertRegex(entry['sourceGitBlob'], r'^[a-f0-9]{40}$')
            self.assertEqual(entry['revision'], RECORD['authorPin']['revision'])
            if 'transforms' not in entry:
                self.assertEqual(entry['sourceSha256'], entry['vendoredSha256'])
                self.assertEqual(entry['sourceGitBlob'], hashlib.sha1(
                    b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest())
                self.assertEqual(entry['sourceBytes'], len(data))
        self.assertIn('Zac', (FOLDER / 'LICENSE').read_text())
        self.assertIn('MIT', (FOLDER / 'LICENSE').read_text())

    def test_only_lazy_local_guards_hooks_replacement_and_declared_ranges(self):
        tree = ast.parse((FOLDER / 'manifest.py').read_text())
        calls = [n for n in ast.walk(tree) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)]
        hooks = [n for n in calls if n.func.id == 'DspHook']
        self.assertEqual(len(hooks), 3)
        self.assertEqual([ast.literal_eval(n.args[0]) for n in hooks],
                         [{'A': 0x4a7, 'B': 0x29c}, {'A': 0x1ab1, 'B': 0x1871}, {'A': 0x50e, 'B': 0x303}])
        actual = []
        for hook in hooks:
            guard = hook.args[1]
            self.assertIsInstance(guard, ast.Call)
            self.assertEqual(guard.func.id, 'stock_dsp_words')
            payload, address, words, digest = [ast.literal_eval(arg) for arg in guard.args]
            self.assertEqual(address, ast.literal_eval(hook.args[0])['A'])
            actual.append((payload, address, words, digest))
        self.assertEqual(actual, [(g['payload'], g['address'], g['words'], g['sha256']) for g in RECORD['stockGuards']])
        # It is stock COMPRESSOR: the module replaces its row and keeps its dispatch.
        menu = next(n for n in calls if n.func.id == 'MenuEntry')
        keywords = {k.arg: ast.literal_eval(k.value) for k in menu.keywords if k.arg in ('replaces', 'stock_dsp', 'fx2_id')}
        self.assertEqual((keywords['replaces'], keywords['stock_dsp'], keywords['fx2_id']), ('COMPRESSOR', True, 0x18))
        ranges = [n for n in calls if n.func.id == 'DspRange']
        self.assertEqual([(ast.literal_eval(n.args[1]), ast.literal_eval(n.args[2])) for n in ranges],
                         [(0x7f0, 0x210), (0x3dfe, 0x202)])
        oracle = ast.parse((FOLDER / 'upstream/tools/sc_assemble_oracle.py').read_text())
        self.assertEqual(len(oracle.body), 1)
        self.assertIsInstance(oracle.body[0], ast.FunctionDef)
        self.assertEqual(oracle.body[0].name, 'sc_assemble')

    def test_evidence_is_bound_to_the_module_and_to_the_committed_proofs(self):
        document = json.loads((FOLDER / 'octamod.module.json').read_text())
        capture = json.loads((FOLDER / 'media/capture.json').read_text())
        software = json.loads((FOLDER / 'evidence/software.json').read_text())
        builder = json.loads((FOLDER / 'evidence/common-builder.json').read_text())
        q = document['tests']['qualification']
        self.assertEqual(document['version'], RECORD['moduleVersion'])
        self.assertEqual(document['source']['revision'], RECORD['revision'])
        for version in (capture['moduleVersion'], software['moduleVersion'], builder['moduleVersion'], q['moduleVersion']):
            self.assertEqual(version, document['version'])
        # One image identity everywhere: the shared builder's native image of the module alone.
        for sha in (capture['imageSha256'], software['imageSha256'], q['imageSha256'],
                    builder['images']['sharedBuilderNative']['sha256'], builder['emulator']['imageSha256']):
            self.assertEqual(sha, IMAGE)
        self.assertEqual(capture['source']['manifestSha256'], hashlib.sha256((FOLDER / 'manifest.py').read_bytes()).hexdigest())
        self.assertEqual(len(document['media']), 3)
        for entry in document['media']:
            self.assertEqual(entry['captureType'], 'emulator')
            self.assertEqual(entry['otUi']['moduleVersion'], document['version'])
            self.assertEqual(entry['otUi']['imageSha256'], IMAGE)
            name = Path(entry['path']).name
            self.assertEqual(hashlib.sha256((FOLDER / entry['path']).read_bytes()).hexdigest(), capture['screenshots'][name])
            self.assertEqual(capture['composedImage']['screenshots'][name], capture['screenshots'][name])
        # The record's counts are the committed fingerprints' counts.
        both = (proofs('sidechain-composition-proofs.json') + proofs('sidechain-visible-proofs.json')
                + proofs('sidechain-analog-bd-proofs.json'))
        self.assertEqual(builder['composition']['selections'], len(both))
        self.assertEqual(builder['composition']['nativeBuilt'], sum('error' not in p for p in both))
        self.assertEqual(builder['composition']['nativeRefused'], sum('error' in p for p in both))
        self.assertEqual(sum(builder['composition']['refusedByReason'].values()), builder['composition']['nativeRefused'])
        self.assertEqual(builder['composition']['identicalOutright'], sum('error' not in p and p['bytes'] == 1112560 for p in both))
        self.assertEqual(builder['differenceFromStandalone']['sidechainOwnedBytesDiffering'], 0)

    def test_nothing_of_the_abandoned_standalone_release_remains(self):
        for path in ['release-layout.json', 'tools/compile_package.py', 'tools/verify_native.py', 'reports']:
            self.assertFalse((FOLDER / path).exists(), path)
        document = json.loads((FOLDER / 'octamod.module.json').read_text())
        text = json.dumps(document['compatibility']) + (FOLDER / 'README.md').read_text()
        for phrase in ('Frozen WIP', 'select no companion', 'refuses all fourteen', 'No Core Logger is appended'):
            self.assertNotIn(phrase, text)
        self.assertEqual(document['compatibility']['conflicts'], ['midi-scenes', 'analog-bassdrum'])
        for path in ['sdk/octabam/modules/sidechain-compressor/README.md']:
            self.assertTrue((APP / path).exists())

    def test_release_has_a_narrow_hardware_waiver_and_a_clean_folder(self):
        self.assertEqual(RECORD['root'], 'sdk/octabam/modules/sidechain-compressor')
        for path in ['sdk/catalog.json', 'src/catalog/module-documents.json']:
            entries = json.loads((APP / path).read_text())['modules']
            self.assertIn('sidechain-compressor', {entry['id'] for entry in entries})
        for path in ['sdk/module-qualification-baseline.json', 'sdk/module-release-waivers.json']:
            entries = json.loads((APP / path).read_text())['modules']
            self.assertNotIn('sidechain-compressor', {entry['id'] for entry in entries})
        document = json.loads((FOLDER / 'octamod.module.json').read_text())
        self.assertNotIn('build', document)
        q = document['tests']['qualification']
        self.assertEqual(q['hardware']['kind'], 'owner-waived')
        self.assertEqual(q['memory']['totalBytes'], 23292)
        self.assertEqual([c['processor'] for c in q['cycles']], ['dsp', 'coldfire'])
        self.assertTrue(all(c['maxConfiguration'] < c['budget'] for c in q['cycles']))
        for path in FOLDER.rglob('*'):
            self.assertFalse(path.is_symlink(), str(path))
            self.assertNotIn(path.name, ['.git', 'out', 'downloads', 'vendor'])
            if '__pycache__' in path.parts:
                continue
            if path.is_file():
                self.assertIn(path.suffix, ['', '.md', '.json', '.py', '.cpp', '.s', '.asm', '.svg', '.png'])
                if path.suffix == '.png':
                    self.assertTrue(path.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'))
                else:
                    path.read_text(encoding='utf-8')


if __name__ == '__main__':
    unittest.main()
