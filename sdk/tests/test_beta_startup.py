"""Firmware-free startup choreography and shipped-object provenance checks."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / 'sdk/runtime/startup'


class BetaStartup(unittest.TestCase):
    def test_authored_package_provenance_and_empty_stock_replay(self):
        pkg = json.loads((ROOT / 'src/engine/assets/beta-startup.json').read_text())
        self.assertIs(pkg['stockRead'], False)
        for name, digest in pkg['sources'].items():
            self.assertEqual(hashlib.sha256((HERE / name).read_bytes()).hexdigest(), digest, name)
        for artifact, replay in ((pkg, b'modwerk_boot_replay_draw'), (pkg['romGate'], b'modwerk_boot_rom_replay')):
            data = bytes.fromhex(artifact['code'])
            self.assertEqual(len(data), artifact['bytes'])
            self.assertEqual(hashlib.sha256(data).hexdigest(), artifact['sha256'])
            u16 = lambda off: struct.unpack_from('>H', data, off)[0]
            u32 = lambda off: struct.unpack_from('>I', data, off)[0]
            sections = [struct.unpack_from('>10I', data, u32(32) + i * u16(46)) for i in range(u16(48))]
            self.assertFalse(any(s[1] == 8 and s[5] for s in sections), 'Uninitialized startup state')
            symbols = next(s for s in sections if s[1] == 2)
            strings = sections[symbols[6]]
            for off in range(symbols[4], symbols[4] + symbols[5], symbols[9]):
                name, value, size, info, other, section = struct.unpack_from('>IIIBBH', data, off)
                start = strings[4] + name
                if data[start:data.index(b'\0', start)] == replay:
                    at = sections[section][4] + value
                    self.assertEqual(data[at:at + 6], b'\0' * 6)
                    break
            else:
                self.fail('Stock replay symbol missing')

    @unittest.skipUnless(shutil.which('cc'), 'Host C compiler unavailable')
    def test_mki_mkii_frame_bounds_led_choreography_and_colour_restore(self):
        spec = importlib.util.spec_from_file_location('base_art', HERE / 'base_art.py')
        art = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(art)
        with tempfile.TemporaryDirectory(prefix='modwerk-startup-host-') as temp:
            work = Path(temp)
            (work / 'boot_art.h').write_text(art.header('3.0.0'))
            pixels = sorted(art.final_pixels('3.0.0'))
            (work / 'boot_expect.h').write_text('#define BOOT_EXPECT %d\nstatic const unsigned char boot_expect[][2] = {%s};\n' %
                                             (len(pixels), ','.join('{%d,%d}' % p for p in pixels)))
            subprocess.run(['cc', '-std=c99', '-Wall', '-Wextra', '-Werror', '-DMODWERK_HOST', '-I', str(work),
                            str(HERE / 'test_boot_anim.c'), '-o', str(work / 'host')], check=True, capture_output=True)
            subprocess.run([str(work / 'host')], check=True, capture_output=True)
