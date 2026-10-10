"""EUCLID SEQ: Analog Rytm-style Euclidean trig generator for audio tracks.

The generator writes the current pattern's real trig mask, so the stock
sequencer plays the result with its own tempo, track speed, swing, locks and
conditions; no clock is added. Nineteen guarded sites:

- TRACK TRIG EDIT's key layer is pushed and popped through one operand each
  (0x4007c0a8, 0x4007b48c). Both name a module copy of that layer: the
  window's five key bindings by stock handler address plus RIGHT, which has
  no stock binding there and opens the EUCLID page from the TRIGS row.
- PATTERN SCALE's length setter (0x4004c912) regenerates EUC tracks after
  a pattern or track length change.
- The LED-row sender (0x40013634) first keeps the MKII trig-key palette in
  step: purple trigs on an EUC track in grid recording, stock red otherwise.
- The grid editor's place-a-trig path (0x40051970) and remove-on-release
  path (0x400601aa) are skipped while EUC is on for the selected track.
  Holding an existing trig for parameter locks is unchanged. The live
  recorder REC_TRIG (0x40042d1c) records nothing on an EUC track.
- The EUCLID trig mode: the TRIG MODE window lists seven rows on audio
  tracks (0x40058722 count and selected row; 0x40051f18 / 0x40051f88 the
  stored mode; 0x40035a30, 0x40035a44, 0x400359fa the row's mode, icon and
  name tables). The stock mode word keeps TRACKS while EUCLID is chosen, so
  every stock reader behaves as in TRACKS; the mode panel (0x40045826,
  0x40035f84, 0x40044932), the compact parameter page (0x4004d95c) and the
  status icon (0x40035854) show EUCLID, and FUNC+RIGHT (0x400503c4) opens
  the EUCLID page.

Settings are runtime state in DRAM; the trigs they produce are ordinary
pattern data. Measured and inferred facts: README.md and TESTING.md.
"""

from remix.schema import Category, Proof, Gate, Detour, Kind, Linked, Module
from remix.stock_guard import stock_guard

TTE_LAYER_PUSH = stock_guard(0x4007c0a8, 6, "204e9dcd1cc14b442a0cf5aeeed02c8a93a2a246085e2417c8a2b14213193899")
TTE_LAYER_POP = stock_guard(0x4007b48c, 6, "204e9dcd1cc14b442a0cf5aeeed02c8a93a2a246085e2417c8a2b14213193899")

MODULE = Module(
    name="euclid-seq",
    key="EUCLID SEQ",
    kind=Kind.CF_PATCH,
    doc="Euclidean trig generator with its own page; writes real trigs.",
    category=Category.MACHINES, author="bretth18", author_url="https://github.com/bretth18",
    proof=Proof.UNTESTED, proof_note="Development build; emulator checks pass; one functional MKII report on an earlier image.",
    linked=(Linked("euclid-seq", "modules/euclid-seq/control.s", cpu="5475", dram=True),),
    detours=(
        Detour(0x4007c0a8, TTE_LAYER_PUSH, "euclid-seq", "es_tte_layer",
               "TRACK TRIG EDIT pushes its layer with RIGHT added", kind="lea"),
        Detour(0x4007b48c, TTE_LAYER_POP, "euclid-seq", "es_tte_layer",
               "TRACK TRIG EDIT pops the same layer", kind="lea"),
        Detour(0x40051970, stock_guard(0x40051970, 8, "1fd2db3629cb25fe689a166acc85db231dfdc6ebc095c7d3c7a77bccfb0d2b8c"),
               "euclid-seq", "es_press_stub", "EUC on: a TRIG press does not place a trig", pad_to=8),
        Detour(0x400601aa, stock_guard(0x400601aa, 6, "49a3883a931e935c64b433487887fa5c6d92134f7fe6b4cf3a164629d86eae40"),
               "euclid-seq", "es_release_stub", "EUC on: a TRIG release does not remove a trig"),
        Detour(0x4004c912, stock_guard(0x4004c912, 6, "1887108eb085baabadc2f1b319f4c3e1fa521fe65b60b029eb1e78a07962fa5c"),
               "euclid-seq", "es_length_stub", "A length change regenerates EUC tracks", kind="jsr"),
        Detour(0x40042d1c, stock_guard(0x40042d1c, 8, "ffde53d71a15b4ca76d035c5d36db846efa2f20dbff56b3c6efc911dcf99f9d7"),
               "euclid-seq", "es_rec_stub", "EUC on: the live recorder records no trig on that track", pad_to=8),
        Detour(0x40013634, stock_guard(0x40013634, 8, "8ebe9e663e436dc339732fe95700e7791844e66c248c86d56fdd3fc0800ee7ec"),
               "euclid-seq", "es_led_stub", "MKII: trig keys purple on an EUC track in grid recording", pad_to=8),
        Detour(0x40058722, stock_guard(0x40058722, 38, "bb494270ca340535add9c6902d3c81b98afb099e6bc307da74a155d8e9140806"),
               "euclid-seq", "es_sel_open_stub", "TRIG MODE window: seven rows on audio tracks, EUCLID row selected in its mode", pad_to=38),
        Detour(0x40051f18, stock_guard(0x40051f18, 6, "dbaffc23c7f69b3558554c84592f6c3f26c24abc23921acb4d938d6c93967c53"),
               "euclid-seq", "es_sel_pick_up", "TRIG MODE UP: row 6 chooses EUCLID"),
        Detour(0x40051f88, stock_guard(0x40051f88, 6, "dbaffc23c7f69b3558554c84592f6c3f26c24abc23921acb4d938d6c93967c53"),
               "euclid-seq", "es_sel_pick_down", "TRIG MODE DOWN: row 6 chooses EUCLID"),
        Detour(0x40035a30, stock_guard(0x40035a30, 6, "ddaefcaa6cfbb04246404f70f54d86851cdb2852fbf2d96c52c9050c3923e56d"),
               "euclid-seq", "es_modes", "TRIG MODE rows read a seven-entry mode table", kind="lea"),
        Detour(0x40035a44, stock_guard(0x40035a44, 6, "687d4929a1a917adb937a8e1879b0e964d7f8874d2875d87eac22575935dcb4b"),
               "euclid-seq", "es_icons", "TRIG MODE rows read a seven-entry icon table", kind="lea"),
        Detour(0x400359fa, stock_guard(0x400359fa, 6, "60b2c083664814b4aeb87b25315e4fee67654423e61cac7395c34bd6f638b834"),
               "euclid-seq", "es_names", "TRIG MODE rows read a seven-entry name table", kind="lea"),
        Detour(0x40035854, stock_guard(0x40035854, 12, "323e1216b3974fb22b89db0a62cc3d4c7c084f62210420aaea889d01e4d66eb7"),
               "euclid-seq", "es_status_stub", "Status bar shows the EUCLID icon in its mode", pad_to=12),
        Detour(0x40045826, stock_guard(0x40045826, 8, "1104d7e5faaab83f275e3c3d6623f433a85cc0876ab2042c3d5d29f690ac3903"),
               "euclid-seq", "es_panel_stub", "Mode panel drawn in the EUCLID mode", pad_to=8),
        Detour(0x40035f84, stock_guard(0x40035f84, 10, "1ef4be5a58719b90f2d5b4ec30efc16c0a6fddb510e931395e478660973cf2c2"),
               "euclid-seq", "es_title_stub", "Mode panel title EUCLID", pad_to=10),
        Detour(0x40044932, stock_guard(0x40044932, 10, "bd645abebe88c6295edce929f413e86093fe176a97c1ab051287d9a5c5e226e8"),
               "euclid-seq", "es_body_stub", "Mode panel body: settings and the trig page", pad_to=10),
        Detour(0x4004d95c, stock_guard(0x4004d95c, 8, "b0dad4ce7d9e1579f078e4fe10abb10399bd4d41d595426a1e92c3c577e981c7"),
               "euclid-seq", "es_compact_stub", "Compact parameter page beside the EUCLID panel", pad_to=8),
        Detour(0x400503c4, stock_guard(0x400503c4, 8, "91fea154aed7ca7f7aed1e03380f8eba791542d2f01b3f4a9b173e2dec9df118"),
               "euclid-seq", "es_fright_stub", "EUCLID mode: FUNC+RIGHT opens the EUCLID page", pad_to=8),
    ),
    gates=(Gate("modules/euclid-seq/verify.py", remix_arg=False),),
)
