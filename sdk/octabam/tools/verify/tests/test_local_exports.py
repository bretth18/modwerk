"""Explicit composition exports retain bytes and reject invented linker names."""
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools"))
from remix import platform_build
from remix.schema import Linked

TOOLS = all(shutil.which(t) for t in ("m68k-elf-as", "m68k-elf-ld", "m68k-elf-objcopy", "m68k-elf-nm"))

class ExportDeclarationTests(unittest.TestCase):
    def test_invalid_and_reserved_names_are_refused(self):
        for names in (["entry"], ("entry", "entry"), ("bad-name",), ("_end",), ("_edata",), ("__bss_start",), (1,)):
            with self.subTest(names=names), self.assertRaises(ValueError):
                Linked("unit", "unit.s", exports=names)

@unittest.skipUnless(TOOLS, "needs the m68k-elf toolchain")
class LocalExportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="octabam_exports_")
        self.work = pathlib.Path(self.tmp.name)
        self.source = self.work / "unit.s"
        self.source.write_text(".text\nentry: moveq #7,%d0\n rts\n.data\nstate: .long 0\n.equ absolute,123\n")
        self.obj = self.work / "unit.o"
        subprocess.run(["m68k-elf-as", "-mcpu=54455", "-o", str(self.obj), str(self.source)], check=True)

    def tearDown(self):
        self.tmp.cleanup()

    def section(self, name):
        destination = self.work / (name.removeprefix(".") + ".bin")
        subprocess.run(["m68k-elf-objcopy", "-O", "binary", "-j", name, str(self.obj), str(destination)], check=True)
        return destination.read_bytes()

    def test_globalizing_existing_labels_changes_no_section_bytes(self):
        before = {name: self.section(name) for name in (".text", ".data")}
        platform_build.promote_symbols(self.obj, ("entry", "state"))
        self.assertEqual(before, {name: self.section(name) for name in before})
        symbols = subprocess.check_output(["m68k-elf-nm", str(self.obj)], text=True)
        self.assertIn(" T entry", symbols)
        self.assertIn(" D state", symbols)

    def test_missing_and_absolute_symbols_are_refused_without_mutation(self):
        original = self.obj.read_bytes()
        for name in ("missing", "absolute"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                platform_build.promote_symbols(self.obj, (name,))
            self.assertEqual(self.obj.read_bytes(), original)

    def test_explicit_export_resolves_cross_unit_reference(self):
        caller = self.work / "caller.s"
        caller.write_text(".text\n.global call\ncall: jmp entry\n")
        units = [("K", Linked("unit", str(self.source), dram=True, exports=("entry",))),
                 ("K", Linked("caller", str(caller), dram=True))]
        raw, symbols = platform_build.link_runtime(units, self.work / "link", {}, 0x40a00000)
        self.assertEqual(raw[:4], bytes.fromhex("70074e75"))
        self.assertEqual(symbols["entry"], 0x40a00000)
        at = symbols["call"] - 0x40a00000
        self.assertEqual(int.from_bytes(raw[at + 2:at + 6], "big"), symbols["entry"])

if __name__ == "__main__":
    unittest.main()
