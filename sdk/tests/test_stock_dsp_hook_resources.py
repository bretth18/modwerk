"""Stock-free resource regressions for the private stock-DSP hook base."""
import importlib.util
import os
from pathlib import Path
import re
import shutil
import tempfile
import unittest
import sys

ROOT = Path(__file__).resolve().parents[2]
FOLDER = ROOT / 'sdk/machines/octatrack/elekloader'
sys.path.insert(0, str(ROOT / 'sdk/machines/octatrack/module-adapters'))
import resident_source
loader = resident_source.load_loader()


class HookResources(unittest.TestCase):
    def test_core_one_counter_is_outside_real_analog_banks_and_dispatch(self):
        # The native AB record spans TABLES .. VOICES808 + four 64-word voices.
        native = (ROOT / 'sdk/octabam/tools/build/ab_image.py').read_text()
        values = {key: int(re.search(r'^' + key + r'\s*=\s*(0x[0-9a-fA-F]+)', native, re.M)[1], 16)
                  for key in ('TABLES', 'VOICES808', 'VOICE_STRIDE')}
        low, high = values['TABLES'], values['VOICES808'] + 4 * values['VOICE_STRIDE']
        self.assertLessEqual(low, 0x2840)
        self.assertGreater(high, 0x2840)  # old counter would overwrite an actual coefficient
        self.assertFalse(low <= loader.CORE1_IDLE < high)
        self.assertGreaterEqual(loader.CORE1_IDLE, loader.TABLE_HOME + 2 * 128)
        self.assertLess(loader.CORE1_IDLE, 0x8000)  # measured private X, below peripheral space
        for ids in (32, 128):
            text = loader.receiver_source(loader.RECEIVER.read_text(), (0x7c8, 0x7c9), 1200, probe='X', tag='B', ids=ids)
            self.assertNotIn('@', text)
            self.assertNotIn('$2840', text)
            stop = loader.TABLE_END
            start = loader.TABLE_HOME + 2 * ids
            chunk = int(re.search(r'do\s+#(\d+),xwfillend', text)[1])
            writes = [address for first in range(start, stop, chunk) for address in range(first, first + chunk)]
            self.assertEqual(writes[-1], stop - 1)
            self.assertNotIn(loader.CORE1_IDLE, writes)
            wait = text[text.index('c1wait:'):text.index('c1over:')]
            self.assertLess(wait.index('move    #>0,a'), wait.index('do      forever'))

    def test_drifted_receiver_or_overgrown_dispatch_refuses_before_build(self):
        source = loader.RECEIVER.read_text()
        for changed in (source.replace('x:>@IDLECOUNTER@', 'x:>$2840', 1), source + '\n@IDLECOUNTER@\n'):
            with self.assertRaisesRegex(ValueError, 'review the port'):
                loader.receiver_source(changed, (0x7c8, 0x7c9), 1200, tag='B')
        for ids in (31, 129, 65535):
            with self.assertRaises(ValueError):
                loader.receiver_source(source, (0x7c8, 0x7c9), 1200, tag='B', ids=ids)

    @unittest.skipUnless(os.environ.get('ELEKLOADER_DSP_ASM') or shutil.which('dsp_asm'), 'explicit native DSP assembler unavailable')
    def test_actual_receiver_relocations_at_two_fresh_origins(self):
        spec = importlib.util.spec_from_file_location('hook_dsp_packages', FOLDER / 'dsp_packages.py')
        packages = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(packages)
        with tempfile.TemporaryDirectory(prefix='modwerk-hook-receiver.') as work:
            for tag in ('A', 'B'):
                for probe in (None, 'X'):
                    source = loader.receiver_source(loader.RECEIVER.read_text(), (0x7c8, 0x7c9), 1200, probe=probe, tag=tag, ids=128)
                    first, labels = packages.assemble(source, 0x1000, work)
                    second, moved = packages.assemble(source, 0x1400, work)
                    self.assertEqual(len(first), len(second))
                    self.assertEqual(moved['c1wait'] - labels['c1wait'], 0x400)
                    for old, new in zip(first, second):
                        self.assertTrue(old == new or new - old == 0x400 and 0x1000 <= old <= 0x1000 + len(first))


if __name__ == '__main__':
    unittest.main()
