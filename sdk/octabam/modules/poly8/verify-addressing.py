#!/usr/bin/env python3
"""Assemble POLY8 without firmware and verify its local PC-relative addresses.

GNU as can silently wrap an out-of-range local PC16 displacement. Checking
its resolved instruction bytes catches writes into a neighbouring module,
even when the linker sees no remaining relocation to validate.
"""
import argparse
from pathlib import Path
import re
import subprocess
import tempfile


def verify(source):
    with tempfile.TemporaryDirectory(prefix="poly8-addressing-") as work:
        obj = Path(work) / "polyphony.o"
        listing = Path(work) / "polyphony.lst"
        subprocess.run(["m68k-elf-as", "-mcpu=54455", "-al=" + str(listing),
                        "-o", str(obj), str(source)], check=True, capture_output=True)
        rows = subprocess.check_output(["m68k-elf-nm", obj], text=True).splitlines()
        symbols = {row[2]: int(row[0], 16) for line in rows
                   if len(row := line.split()) == 3 and row[1].lower() == "t"}
        checked = 0
        errors = []
        for line in listing.read_text().splitlines():
            if "(%pc)" not in line:
                continue
            row = re.match(r"^\s*(\d+)\s+([0-9a-fA-F]+)\s+([0-9A-F]{4})\s+([0-9A-F]{4})\s+\t(.*)$", line)
            assert row, "Unsupported PC-relative instruction listing: " + line
            number, address, opcode, displacement, text = row.groups()
            target = re.search(r"([A-Za-z_.][A-Za-z0-9_.]*)\(%pc\)", text)
            assert target and target[1] in symbols, "Unknown local PC-relative target: " + text
            # All current POLY8 forms have a single signed displacement word
            # immediately after the opcode. No index or full extension form.
            assert int(opcode, 16) & 0x3f == 0x3a, "Unsupported PC-relative encoding: " + line
            delta = int(displacement, 16)
            if delta & 0x8000:
                delta -= 0x10000
            actual = (int(address, 16) + 2 + delta) & 0xffffffff
            expected = symbols[target[1]]
            if actual != expected:
                errors.append(f"line {number}: {target[1]} resolves to 0x{actual:x}, expected 0x{expected:x}")
            checked += 1
        assert checked >= 100, "POLY8 address scan did not cover the runtime"
        assert not errors, "PC-relative address corruption: " + "; ".join(errors)
        return checked


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path(__file__).with_name("polyphony.s"))
    args = parser.parse_args()
    print(f"PASS: {verify(args.source.resolve())} compiled local PC-relative addresses resolve to their declared storage/code")
