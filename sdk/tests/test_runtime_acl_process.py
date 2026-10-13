# SPDX-License-Identifier: GPL-3.0-or-later
"""Bounded ACL process startup, authentic Windows inspection and no-byte failure."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('runtime_acl_deadline_fixture', ROOT / 'scripts/runtime_private_paths.py')
paths = importlib.util.module_from_spec(spec)
spec.loader.exec_module(paths)

def acl(directory=True):
    sid = 'S-1-5-21-1-2-3-1001'
    return dict(user=sid, owner=sid, directory=directory, protected=True,
        rules=[dict(sid=sid, kind='Allow', rights=paths.FULL_CONTROL,
                    inheritance=3 if directory else 0, propagation=0)])

class AclProcess(unittest.TestCase):
    def test_fixed_noninteractive_process_has_one_bounded_startup_budget(self):
        result = subprocess.CompletedProcess([], 0, json.dumps(acl()), '')
        with patch.object(paths.subprocess, 'run', return_value=result) as run:
            self.assertEqual(paths.windows_acl(Path('private fixture'), protect=True), acl())
        run.assert_called_once()
        args, options = run.call_args
        self.assertEqual(args[0][1:5], ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command'])
        self.assertEqual(args[0][5], paths.ACL_SCRIPT)
        self.assertEqual(options['timeout'], 60)
        self.assertEqual(options['env']['MODWERK_RUNTIME_PRIVATE_ACTION'], 'protect')
        self.assertTrue(options['capture_output'] and options['check'])
        self.assertNotIn('shell', options)

    def test_timeout_is_not_retried_or_exposed_and_empty_artifact_is_removed(self):
        error = subprocess.TimeoutExpired(['private command'], 60, output='private/path SECRET', stderr='private stderr')
        with patch.object(paths.subprocess, 'run', side_effect=error) as run, self.assertRaises(ValueError) as raised:
            paths.windows_acl(Path('private fixture'))
        run.assert_called_once()
        self.assertEqual(str(raised.exception), 'Windows private-output DACL verification timed out after 60 seconds.')
        self.assertTrue(raised.exception.__suppress_context__)
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'private-result.raw'
            parent = subprocess.CompletedProcess([], 0, json.dumps(acl()), '')
            with patch.object(paths, 'WINDOWS', True), patch.object(paths.subprocess, 'run', side_effect=[parent, error]) as run:
                with self.assertRaisesRegex(ValueError, 'timed out'):
                    paths.save(output, b'synthetic artifact bytes')
            self.assertEqual(run.call_count, 2)
            self.assertFalse(output.exists())

    @unittest.skipUnless(os.name == 'nt', 'Actual native Windows DACL process regression')
    def test_native_inspection_survives_startup_longer_than_previous_deadline(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = paths.private_directory(Path(tmp) / 'owner-only')
            before = paths.windows_acl(folder)
            paths.check_windows_acl(before, directory=True)
            # Delay only process startup; the complete production inspection
            # and its owner/rule validation still run on the actual NT DACL.
            delayed = 'Start-Sleep -Milliseconds 16000\n' + paths.ACL_SCRIPT
            start = time.monotonic()
            with patch.object(paths, 'ACL_SCRIPT', delayed):
                after = paths.windows_acl(folder)
            elapsed = time.monotonic() - start
            self.assertGreaterEqual(elapsed, 16)
            self.assertLess(elapsed, 60)
            self.assertEqual(after, before)
            paths.check_windows_acl(after, directory=True)
            print('Native owner-only DACL inspection after delayed startup: %.2f seconds' % elapsed, flush=True)

if __name__ == '__main__':
    unittest.main()
