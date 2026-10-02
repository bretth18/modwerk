"""Capture preflight and failed-load refusal; no firmware, native source or emulator."""
from contextlib import redirect_stderr
import hashlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch

APP = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('capture_module_ui', APP / 'scripts/capture-module-ui.py')
capture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capture)


class CapturePreflight(unittest.TestCase):
    def test_project_loading_requires_all_three_options(self):
        with patch('sys.argv', ['capture', '--emulator', 'unused', '--image', 'unused',
                                '--image-sha256', '0' * 64, '--plan', 'unused',
                                '--output', 'unused', '--project-name', 'DEMO']), \
                patch.object(capture.subprocess, 'Popen') as spawn, redirect_stderr(io.StringIO()) as error:
            with self.assertRaises(SystemExit):
                capture.main()
            self.assertIn('requires --card, --set-name and --project-name together', error.getvalue())
            spawn.assert_not_called()

    def test_local_folder_names_cannot_be_paths(self):
        for name in ['../DEMO', '..', 'DEMO\\OTHER', 'DEMO\nOTHER']:
            with self.subTest(name=name), patch('sys.argv', ['capture', '--emulator', 'unused',
                    '--image', 'unused', '--image-sha256', '0' * 64, '--plan', 'unused',
                    '--output', 'unused', '--card', 'unused', '--set-name', 'OCTAMOD',
                    '--project-name', name]), patch.object(capture.subprocess, 'Popen') as spawn, \
                    redirect_stderr(io.StringIO()) as error:
                with self.assertRaises(SystemExit):
                    capture.main()
                self.assertIn('without paths', error.getvalue())
                spawn.assert_not_called()

    def test_failed_project_load_cannot_produce_screenshots_or_panel_actions(self):
        with tempfile.TemporaryDirectory(prefix='capture-preflight-test.') as directory:
            work = Path(directory)
            # Entirely original synthetic fixtures, never firmware or a card dump.
            image, card, emulator, plan = [work / name for name in ('image', 'card', 'emulator', 'plan.json')]
            for path in (image, card, emulator):
                path.write_bytes(b'Original synthetic capture-test fixture')
            plan.write_text('[{"capture":"ot-controls.png"}]')
            argv = ['capture', '--emulator', str(emulator), '--image', str(image),
                    '--image-sha256', hashlib.sha256(image.read_bytes()).hexdigest(),
                    '--plan', str(plan), '--output', str(work / 'captures'),
                    '--card', str(card), '--set-name', 'OCTAMOD', '--project-name', 'DEMO']
            port, lcd, selector = MagicMock(), MagicMock(), MagicMock()
            port.poll.return_value = None
            selector.select.return_value = [(None, None)]
            with patch('sys.argv', argv), patch.object(capture, 'load', return_value=lcd), \
                    patch.object(capture.subprocess, 'Popen', return_value=port) as spawn, \
                    patch.object(capture.selectors, 'DefaultSelector', return_value=selector), \
                    patch.object(capture.os, 'read', return_value=b'ready sample=0 frames=0\n'):
                with self.assertRaisesRegex(RuntimeError, 'project did not finish loading'):
                    capture.main()
            command = spawn.call_args.args[0]
            self.assertIn('--mount', command)
            self.assertIn('DEMO', command)
            port.stdin.write.assert_not_called()
            lcd.png.assert_not_called()
            self.assertEqual(list((work / 'captures').iterdir()), [])
            port.terminate.assert_called_once()


if __name__ == '__main__':
    unittest.main()
