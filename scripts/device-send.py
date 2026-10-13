#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""device-send.py 'SEQUENCE' - one line to `npm run device -- serve`, its reply printed (macOS nc hangs up before it)."""
import os, socket, sys
s = socket.socket(socket.AF_UNIX)
s.connect(os.environ.get('MODWERK_DEV_SOCKET', '/tmp/modwerk-dev.sock'))
s.sendall((' '.join(sys.argv[1:]) + '\n').encode())
sys.stdout.write(s.makefile().read())
