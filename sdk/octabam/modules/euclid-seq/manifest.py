"""EUCLID SEQ: Analog Rytm-style Euclidean trig generator for audio tracks.

The generator writes the current pattern's real trig mask, so the stock
sequencer plays the result with its own tempo, track speed, swing, locks and
conditions; no clock is added. Four guarded sites:

- TRACK TRIG EDIT's key layer is pushed and popped through one operand each
  (0x4007c0a8, 0x4007b48c). Both name a module copy of that layer: the five
  stock key records (copied from the local OS) plus RIGHT, which has no
  stock binding there and opens the EUCLID page from the TRIGS row.
- The grid editor's place-a-trig path (0x40051970) and remove-on-release
  path (0x400601aa) are skipped while EUC is on for the selected track.
  Holding an existing trig for parameter locks is unchanged.

Settings are runtime state in DRAM; the trigs they produce are ordinary
pattern data. Measured and inferred facts: README.md and TESTING.md.
"""

from remix.schema import Category, Proof, Gate, Detour, Kind, Linked, Module, StockCopy
from remix.stock_guard import stock_guard

TTE_LAYER_PUSH = stock_guard(0x4007c0a8, 6, "204e9dcd1cc14b442a0cf5aeeed02c8a93a2a246085e2417c8a2b14213193899")
TTE_LAYER_POP = stock_guard(0x4007b48c, 6, "204e9dcd1cc14b442a0cf5aeeed02c8a93a2a246085e2417c8a2b14213193899")

MODULE = Module(
    name="euclid-seq",
    key="EUCLID SEQ",
    kind=Kind.CF_PATCH,
    doc="Euclidean trig generator with its own page; writes real trigs.",
    category=Category.MACHINES, author="bretth18", author_url="https://github.com/bretth18",
    proof=Proof.UNTESTED, proof_note="Development build; emulator checks in progress, no hardware run.",
    linked=(Linked("euclid-seq", "modules/euclid-seq/control.s", cpu="5475", dram=True, stock_copies=(
        StockCopy("es_tte_keys", stock_guard(0x400d0154, 130, "52881cb3a2a898fe691550b21f48a86f2f3f4236603e864961fa0b90e5924584")),
    )),),
    detours=(
        Detour(0x4007c0a8, TTE_LAYER_PUSH, "euclid-seq", "es_tte_layer",
               "TRACK TRIG EDIT pushes its layer with RIGHT added", kind="lea"),
        Detour(0x4007b48c, TTE_LAYER_POP, "euclid-seq", "es_tte_layer",
               "TRACK TRIG EDIT pops the same layer", kind="lea"),
        Detour(0x40051970, stock_guard(0x40051970, 8, "1fd2db3629cb25fe689a166acc85db231dfdc6ebc095c7d3c7a77bccfb0d2b8c"),
               "euclid-seq", "es_press_stub", "EUC on: a TRIG press does not place a trig", pad_to=8),
        Detour(0x400601aa, stock_guard(0x400601aa, 6, "49a3883a931e935c64b433487887fa5c6d92134f7fe6b4cf3a164629d86eae40"),
               "euclid-seq", "es_release_stub", "EUC on: a TRIG release does not remove a trig"),
    ),
    gates=(Gate("modules/euclid-seq/verify.py", remix_arg=False),),
)
