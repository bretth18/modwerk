"""LOFI AMF FIX -- stock LO-FI's AMF coefficient multiply is `mpysu x0,y0,a`
(signed x unsigned) on two magnitudes; the fix is `mpyuu`. Ported from
bryantysinger/octa-bt-pt (his report: "LO-FI's AMF knob jumps the pitch
backward at certain values"). The rest of that tool generates per-user
parameter defaults and is not ported.

Imported from sambanks/octabam modules/lofi-amf-fix at
063a42626a40f863c0e1b056155b74f8b5666004 (Sam Banks's declaration; the fix
itself is Bryan Tysinger's). Modwerk transform: the two writes are declared
as plain `Poke`s, and the stock word each one expects is a lazy
address/length/SHA-256 guard read from the developer's own OS at build
time, so no stock bytes are carried here. Upstream expressed the same two
writes as pokes returned by a `CavePatch.emit` at a never-written cave
address; the shared builder serialises a module's `pokes`, so the
declaration moves there unchanged in effect (same addresses, same guard,
same written word).

Sites: DSP P:0x01bef in payload A (tracks 5-8) and P:0x019af in payload B
(tracks 1-4), resolved to image addresses with tools/build/dsp_modmap.py
upstream. Upstream's 128x128 AMF x Fine sweep (zero monotonicity
violations after the fix) is not reproduced here.
"""

from remix.schema import Category, Proof, Kind, Module, Poke
from remix.stock_guard import stock_guard

# Image vaddr of each DSP word: payload_va + module_data_offset
# + (dsp_word_addr - module_p_addr) * 3, as dsp_modmap.py resolves it.
AMF_VADDR_A = 0x400F4BBB   # payload A (tracks 5-8), DSP P:0x01bef
AMF_VADDR_B = 0x40107B0C   # payload B (tracks 1-4), DSP P:0x019af

# The stock word at both sites, guarded by identity (3 bytes, little-endian
# in the image); the build reads it from the local verified 1.40C only.
STOCK_AMF_MUL_SHA256 = "7a4ab30f26d6c9ce57e2792642a3696ccdd8ffadb7b3542383da636d163c9f10"

MPYUU_X0_Y0_A = bytes.fromhex("cd2701")   # mpyuu x0,y0,a (little-endian 24-bit)


MODULE = Module(
    name="lofi-amf-fix",
    key="LOFI AMF FIX",
    kind=Kind.CF_PATCH,
    category=Category.FIXES, author="bryantysinger/octa-bt-pt", author_url="https://github.com/bryantysinger/octa-bt-pt",
    proof=Proof.CHECK, proof_note="both words disassembled against stock (upstream)",
    doc="Fixes stock LO-FI's AMF knob: mpysu -> mpyuu, both payloads. "
        "Ported from bryantysinger/octa-bt-pt.",
    pokes=(
        Poke(AMF_VADDR_A, stock_guard(AMF_VADDR_A, 3, STOCK_AMF_MUL_SHA256), MPYUU_X0_Y0_A,
             "LO-FI AMF coefficient, payload A (tracks 5-8): signed x unsigned -> unsigned x unsigned"),
        Poke(AMF_VADDR_B, stock_guard(AMF_VADDR_B, 3, STOCK_AMF_MUL_SHA256), MPYUU_X0_Y0_A,
             "LO-FI AMF coefficient, payload B (tracks 1-4): signed x unsigned -> unsigned x unsigned"),
    ),
)
