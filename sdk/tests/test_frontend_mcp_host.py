# SPDX-License-Identifier: GPL-3.0-or-later
"""Real native Windows CLI refusal, before any private workspace is created."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class FrontendMcpHost(unittest.TestCase):
    @unittest.skipUnless(os.name == 'nt' and shutil.which('node'), 'Native Windows Node regression')
    def test_native_windows_stdio_startup_fails_closed_without_private_files(self):
        with tempfile.TemporaryDirectory() as temp:
            parent = Path(temp)
            workspace, credentials = parent / 'not-created', parent / 'credentials.json'
            credentials.write_text('untouched invalid synthetic credential fixture')
            result = subprocess.run([shutil.which('node'), str(ROOT / 'scripts/frontend-mcp.mjs'),
                '--data-dir', str(workspace), '--session-file', str(credentials),
                '--frontend-root', str(parent / 'missing-source')], capture_output=True, text=True, timeout=30)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(result.stdout, '')
            self.assertIn('Native Windows MCP is unavailable', result.stderr)
            self.assertLess(len(result.stderr), 2049)
            self.assertNotIn(str(parent), result.stderr)
            self.assertFalse(workspace.exists())
            self.assertEqual(credentials.read_text(), 'untouched invalid synthetic credential fixture')
