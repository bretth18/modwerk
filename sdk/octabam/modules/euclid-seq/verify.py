"""Euclid Seq gates.

Host gate: compiles gen.c with the host C compiler and compares every
reachable setting against an independent Python formulation (pulse j of k
over n steps sits at ceil(j*n/k)), plus hand-checked patterns.
"""
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
                    str(HERE / "gen.c"), "-o", str(out)], check=True)
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


if __name__ == "__main__":
    sys.exit(main())
