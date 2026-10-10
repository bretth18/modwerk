"""Euclid Seq gates.

Host gate: compiles gen.c with the host C compiler and compares every
reachable setting against an independent Python formulation (pulse j of k
over n steps sits at ceil(j*n/k)), plus hand-checked patterns. Project
gate: compiles proj.c and checks that every saved line reads back as the
entry it came from, defaults write no line, and malformed lines are ignored.
"""
import random
import ctypes
import itertools
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OPS = ("OR", "XOR", "AND", "SUB")


class EsParams(ctypes.Structure):
    _fields_ = [(name, ctypes.c_uint8) for name in ("len", "pl1", "pl2", "ro1", "ro2", "tro", "op")]


def build():
    cc = shutil.which("cc") or shutil.which("gcc") or shutil.which("clang")
    if not cc:
        raise SystemExit("[FAIL] no host C compiler")
    out = Path(tempfile.mkdtemp()) / "libgen.so"
    subprocess.run([cc, "-std=c99", "-O2", "-Wall", "-Wextra", "-Werror", "-shared", "-fPIC",
                    str(HERE / "gen.c"), str(HERE / "proj.c"), "-o", str(out)], check=True)
    lib = ctypes.CDLL(str(out))
    lib.es_mask.argtypes = (ctypes.POINTER(EsParams), ctypes.c_uint8 * 8)
    lib.es_mask.restype = None
    return lib


def c_steps(lib, n, pl1, pl2, ro1, ro2, tro, op):
    mask = (ctypes.c_uint8 * 8)()
    lib.es_mask(ctypes.byref(EsParams(n, pl1, pl2, ro1, ro2, tro, op)), mask)
    # Stock layout: step s is byte 7-(s-1)//8, bit (s-1)%8.
    steps = [bool(mask[7 - i // 8] >> (i % 8) & 1) for i in range(64)]
    return steps


def ref_generator(n, k, r):
    k = min(k, n)
    hits = {-(-j * n // k) for j in range(k)} if k else set()
    return [((i - r) % n) in hits for i in range(n)]


def ref_steps(n, pl1, pl2, ro1, ro2, tro, op):
    a, b = ref_generator(n, pl1, ro1), ref_generator(n, pl2, ro2)
    f = {0: lambda x, y: x or y, 1: lambda x, y: x != y, 2: lambda x, y: x and y, 3: lambda x, y: x and not y}[op]
    combined = [f(x, y) for x, y in zip(a, b)]
    out = [combined[(i - tro) % n] for i in range(n)]
    return out + [False] * (64 - n)


def show(steps, n):
    return "".join("x" if s else "." for s in steps[:n])


def main():
    lib = build()
    failures = 0

    def expect(label, got, want):
        nonlocal failures
        if got != want:
            failures += 1
            print(f"[FAIL] {label}: got {got} want {want}")

    # Hand-checked patterns.
    expect("E(3,8)", show(c_steps(lib, 8, 3, 0, 0, 0, 0, 0), 8), "x..x..x.")
    expect("E(5,8)", show(c_steps(lib, 8, 5, 0, 0, 0, 0, 0), 8), "x.x.xx.x")
    expect("E(4,16)", show(c_steps(lib, 16, 4, 0, 0, 0, 0, 0), 16), "x...x...x...x...")
    expect("E(3,8) RO1=1", show(c_steps(lib, 8, 3, 0, 1, 0, 0, 0), 8), ".x..x..x")
    expect("E(3,8) TRO=2", show(c_steps(lib, 8, 3, 0, 0, 0, 2, 0), 8), "x.x..x..")
    expect("OR 4|3 /8", show(c_steps(lib, 8, 4, 3, 0, 0, 0, 0), 8), "x.xxx.x.")
    expect("XOR 4^3 /8", show(c_steps(lib, 8, 4, 3, 0, 0, 0, 1), 8), "..xxx...")
    expect("AND 4&3 /8", show(c_steps(lib, 8, 4, 3, 0, 0, 0, 2), 8), "x.....x.")
    expect("SUB 4-3 /8", show(c_steps(lib, 8, 4, 3, 0, 0, 0, 3), 8), "..x.x...")
    expect("PL>LEN clamps", show(c_steps(lib, 5, 9, 0, 0, 0, 0, 0), 5), "xxxxx")
    expect("zero pulses", show(c_steps(lib, 16, 0, 0, 0, 0, 0, 0), 16), "." * 16)
    expect("LEN 0", c_steps(lib, 0, 3, 3, 0, 0, 0, 0), [False] * 64)
    expect("E(1,64) last byte", c_steps(lib, 64, 1, 0, 63, 0, 0, 0)[63], True)

    # Exhaustive over lengths and pulses; sampled rotations and every op.
    checked = 0
    for n in range(1, 65):
        rots = sorted({0, 1, n // 3, n - 1, n, n + 5}) if n > 1 else [0, 1]
        for pl1, pl2 in itertools.product(range(n + 2), (0, 1, n // 2, n)):
            for ro1, tro in itertools.product(rots, rots[:3]):
                for op in range(4):
                    ro2 = (ro1 * 7 + 3) % (n + 1)
                    got = c_steps(lib, n, pl1, pl2, ro1, ro2, tro, op)
                    want = ref_steps(n, pl1, pl2, ro1 % n, ro2 % n, tro % n, op)
                    checked += 1
                    if got != want:
                        failures += 1
                        if failures < 10:
                            print(f"[FAIL] n={n} pl1={pl1} pl2={pl2} ro1={ro1} ro2={ro2} tro={tro} {OPS[op]}")
    if failures:
        raise SystemExit(f"[FAIL] euclid-seq generator: {failures} mismatches")
    print(f"[OK] euclid-seq generator: {checked} settings match the reference; hand patterns match")
    project(lib)


Entry = ctypes.c_uint8 * 8


def project(lib):
    lib.es_line_format.argtypes = (ctypes.c_char_p, ctypes.c_uint, Entry)
    lib.es_line_parse.argtypes = (ctypes.c_char_p, ctypes.POINTER(ctypes.c_uint), Entry)
    lib.es_entry_default.argtypes = (Entry,)
    failures = 0

    def parse(text):
        index, v = ctypes.c_uint(0), Entry()
        r = lib.es_line_parse(text.encode(), ctypes.byref(index), v)
        return r, index.value, bytes(v)

    rng = random.Random(1)
    lines = 0
    for index in list(range(0, 2048, 7)) + [0, 7, 8, 127, 128, 2047]:
        for _ in range(40):
            e = bytes([0x80 | rng.randint(0, 1), rng.randint(0, 64), rng.randint(0, 64), rng.randint(0, 63),
                       rng.randint(0, 63), rng.randint(0, 63), rng.randint(0, 3), 0])
            buf = ctypes.create_string_buffer(48)
            n = lib.es_line_format(buf, index, Entry(*e))
            text = buf.value.decode()
            lines += 1
            if n != len(text) or not text.endswith("\r\n") or n >= 48:
                failures += 1; print(f"[FAIL] format {index} {e.hex()}: {text!r}")
            got = parse(text[:-2])
            if got != (2, index, e):
                failures += 1; print(f"[FAIL] round trip {index} {e.hex()}: {text!r} -> {got}")
    buf = ctypes.create_string_buffer(48)
    lib.es_line_format(buf, 0, Entry(0x81, 5, 0, 0, 0, 0, 1, 0))
    if buf.value != b"#EUCLID_SEQ=A01:1:1,5,0,0,0,0,1\r\n":
        failures += 1; print(f"[FAIL] sample line {buf.value!r}")
    lib.es_line_format(buf, 2047, Entry(0x80, 64, 3, 63, 2, 1, 3, 0))
    if buf.value != b"#EUCLID_SEQ=P16:8:0,64,3,63,2,1,3\r\n":
        failures += 1; print(f"[FAIL] sample line {buf.value!r}")
    for e, want in ((bytes(8), 1), (bytes([0x80, 4, 0, 0, 0, 0, 0, 0]), 1), (bytes([0x81, 4, 0, 0, 0, 0, 0, 0]), 0),
                    (bytes([0x80, 5, 0, 0, 0, 0, 0, 0]), 0), (bytes([0x80, 65, 0, 0, 0, 0, 0, 0]), 1)):
        if bool(lib.es_entry_default(Entry(*e))) != bool(want):
            failures += 1; print(f"[FAIL] default {e.hex()}")
    for text, want in (("PATTERN=1", 0), ("#PLAY_MODES=A01:00000000000000000", 0), ("#EUCLID_SEQ", 0),
                       ("#EUCLID_SEQ=Q01:1:1,5,0,0,0,0,1", 1), ("#EUCLID_SEQ=A00:1:1,5,0,0,0,0,1", 1),
                       ("#EUCLID_SEQ=A17:1:1,5,0,0,0,0,1", 1), ("#EUCLID_SEQ=A01:9:1,5,0,0,0,0,1", 1),
                       ("#EUCLID_SEQ=A01:1:2,5,0,0,0,0,1", 1), ("#EUCLID_SEQ=A01:1:1,65,0,0,0,0,1", 1),
                       ("#EUCLID_SEQ=A01:1:1,5,0,64,0,0,1", 1), ("#EUCLID_SEQ=A01:1:1,5,0,0,0,0,4", 1),
                       ("#EUCLID_SEQ=A01:1:1,5,0,0,0,0", 1), ("#EUCLID_SEQ=A01:1:1,5,0,0,0,0,1,2", 1),
                       ("#EUCLID_SEQ=A01:1:1,5,,0,0,0,1", 1), ("#EUCLID_SEQ=A01:1:1,5,0,0,0,0,1 ", 1),
                       ("#EUCLID_SEQ=A01:1:1,1000,0,0,0,0,1", 1), ("#EUCLID_SEQ=", 1)):
        r = parse(text)[0]
        if r != want:
            failures += 1; print(f"[FAIL] parse {text!r}: {r} want {want}")
    if failures:
        raise SystemExit(f"[FAIL] euclid-seq project lines: {failures} mismatches")
    print(f"[OK] euclid-seq project lines: {lines} entries round-trip; defaults and malformed lines handled")


if __name__ == "__main__":
    sys.exit(main())
