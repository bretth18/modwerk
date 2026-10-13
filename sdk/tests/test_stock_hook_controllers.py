"""Exact imported source and real native controller relocation preparation."""
import importlib.util
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
ADAPTERS = ROOT / 'sdk/machines/octatrack/module-adapters'
sys.path.insert(0, str(ADAPTERS))
import stock_hook_controllers as controllers
spec = importlib.util.spec_from_file_location('stock_hook_controller_builder', ROOT / 'sdk/runtime/loader/build.py')
builder = importlib.util.module_from_spec(spec); spec.loader.exec_module(builder)
SDK = ROOT / 'sdk/octabam'


class StockHookControllers(unittest.TestCase):
    def test_every_imported_controller_input_is_pinned_and_unknown_modules_refuse(self):
        for name in controllers.UNITS:
            with tempfile.TemporaryDirectory() as tmp:
                sdk = Path(tmp)
                for relative, text in controllers.sources(name, SDK).items():
                    path = sdk / relative; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(text.encode())
                self.assertEqual(controllers.sources(name, sdk), controllers.sources(name, SDK))
                path.write_bytes((text + '\n').encode())
                with self.assertRaisesRegex(ValueError, 'source changed'):
                    controllers.sources(name, sdk)
        for name in ('analog-bassdrum', 'character', '../output-matrix'):
            with self.assertRaisesRegex(ValueError, 'No reviewed'):
                controllers.sources(name, SDK)

    @unittest.skipUnless(shutil.which('m68k-elf-as'), 'ColdFire assembler unavailable')
    def test_actual_authored_reference_and_two_origin_native_reconstruction(self):
        for name in controllers.UNITS:
            for imports in (None, {'modwerk_controller_write_begin': 0x47410000, 'modwerk_controller_write_end': 0x47410100}):
                with tempfile.TemporaryDirectory() as tmp:
                    result = controllers.compile_original(name, SDK, builder, Path(tmp),
                        pool_origins=(0x40c10000, 0x40c20000), fixture_imports=imports)
                    self.assertGreater(len(result['image']), 0)
                    self.assertEqual(len(result['nativePools']), 2)
                    self.assertIsNone(result['encodedSha256'])
                    self.assertFalse(result['productionLeaseBound'])
                    self.assertFalse(result['admission'])
                    self.assertFalse(result['matrixModeEnabled'])

    @unittest.skipUnless(shutil.which('m68k-elf-as'), 'ColdFire assembler unavailable')
    def test_native_adaptation_requires_strong_backend_and_refuses_unqualified_mode_writes(self):
        for name in controllers.UNITS:
            with tempfile.TemporaryDirectory() as tmp:
                source=Path(tmp)/'controller.s'; obj=Path(tmp)/'controller.o'
                source.write_text(controllers.adapted_source(name, SDK))
                subprocess.run(['m68k-elf-as', '-mcpu=54455', source, '-o', obj], check=True, capture_output=True)
                symbols=subprocess.check_output(['m68k-elf-nm',obj],text=True)
                for entry in ('modwerk_controller_write_begin','modwerk_controller_write_end'):
                    self.assertIn(' U '+entry, symbols)
                self.assertNotIn(' W ',symbols)
                if name=='output-matrix':
                    self.assertIn('set_mode:\n        rts\n',source.read_text())
        for imports in ({}, {'modwerk_controller_write_begin': 0x08000000, 'modwerk_controller_write_end': 0x47410100}):
            with tempfile.TemporaryDirectory() as tmp:
                with self.assertRaisesRegex(ValueError, 'exact bounded strong'):
                    controllers.compile_original('output-matrix', SDK, builder, Path(tmp), fixture_imports=imports)


if __name__ == '__main__': unittest.main()
