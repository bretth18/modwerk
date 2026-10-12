"""EUCLID SEQ: Analog Rytm-style Euclidean trig generator for audio tracks.

The generator writes the current pattern's real trig mask, so the stock
sequencer plays the result with its own tempo, track speed, swing, locks and
conditions; no clock is added. Forty-eight guarded sites:

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
- The grid recording trig shift (0x400502f8, FUNC+LEFT/RIGHT) leaves an
  EUC track's trigs alone.

- LFO destinations: LFO SETUP's PMTR knob (0x400392cc) continues past FX2
  into PL1, PL2, RO1, RO2, TRO and OP, and its formatter (0x4003bf64)
  prints them. The Part stores the LFO's own speed as a stock-safe
  placeholder; the module's table holds the destination. Both copies of
  the LFO engine (0x40003c98, 0x4000d032) route such an LFO to a module
  buffer instead of the speed.
- Live pulses: the sequencer's step evaluation reads mask 0 twice
  (0x4009d37c, 0x4009d418); on a modulated EUC track both take the
  modulated generator's pulse instead of the stored trig. The grid LED
  painter's TRIGS word (0x40034df4) shows the live pulses while playing.

- Copies: the settings follow their track, pattern and Part through stock
  copy, paste, clear and undo, and LFO destinations through Part save and
  reload. Fourteen sites sit on the instruction after a stock memcpy of a
  pattern, track, TRACK TRIG EDIT trig data or Part returns (0x40026ed4,
  0x40026f64, 0x4002b9e2, 0x40029796, 0x4002b69a, 0x4002b6a8, 0x4002b436,
  0x40029558, 0x4002a42e, 0x40029358, 0x4002931c, 0x40029a84, 0x4004a946,
  0x4004ab36): its (dst, src, n) are still on the stack. Play Modes
  detours some of those memcpy calls themselves, just before, so the two
  compose. The audio track clear (0x40039df4) and the Part clear
  (0x4004a9d0) reset what they clear at their entries.

Settings live in battery RAM 0x100f9000..0x100fd010 (a power cycle reads
no project file) and in the project file's "#EUCLID_SEQ=" lines:
0x400866e2 (loader head: a storing pass starts from the defaults),
0x40088224 (the loader's next-line point: read our lines), 0x400888d2
(writer: our lines). Play Modes and the quantizer hook the loader and the
writer at other sites (0x400866cc/d4, 0x400867a2/aa, 0x400888aa/b2), so
the three compose. The trigs the settings produce are ordinary pattern
data. Measured and inferred facts: README.md and TESTING.md.
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
        Detour(0x400866e2, stock_guard(0x400866e2, 8, "6b5f250f244620fe2acc97ddca8e7e1fa03b3b7a174ef7dc7bada335f1777378"),
               "euclid-seq", "es_proj_begin_stub", "project load: a storing pass starts from the defaults", pad_to=8),
        Detour(0x40088224, stock_guard(0x40088224, 6, "5cf9e6109ce8cb58a9bf4dc66339e546dd063412195eeb9d8290218748e8fdd2"),
               "euclid-seq", "es_proj_line_stub", "project load: read the #EUCLID_SEQ= lines", kind="jmp"),
        Detour(0x400888d2, stock_guard(0x400888d2, 8, "c93f3a2c7188693aeda0ad3c695584bdf927b5c8ce67892c744d1fe7040dd274"),
               "euclid-seq", "es_proj_write_stub", "project write: the #EUCLID_SEQ= lines", pad_to=8),
        Detour(0x400502f8, stock_guard(0x400502f8, 8, "46b27fc228d5cf396d75ebd685f6bd7f537d281b36cb8db06a5f14c8281b6b80"),
               "euclid-seq", "es_shift_stub", "EUC on: the grid recording trig shift leaves that track alone", pad_to=8),
        Detour(0x40003c98, stock_guard(0x40003c98, 12, "572dcfb8560305392d68a8beade8e979de6795f715e766bd789e1cd1bdc355e9"),
               "euclid-seq", "es_lfo_a_stub", "LFO engine: a EUCLID destination modulates the module's buffer", pad_to=12),
        Detour(0x4000d032, stock_guard(0x4000d032, 12, "572dcfb8560305392d68a8beade8e979de6795f715e766bd789e1cd1bdc355e9"),
               "euclid-seq", "es_lfo_b_stub", "Frame builder's LFO engine copy: the same routing", pad_to=12),
        Detour(0x4009d37c, stock_guard(0x4009d37c, 14, "febf267cb010307615e7d5344e958a4d1ee386d978d0e820d308fe357ab76363"),
               "euclid-seq", "es_eva_stub", "Step evaluation, any-trig test: the modulated pulse on an EUC track", pad_to=14),
        Detour(0x4009d418, stock_guard(0x4009d418, 8, "cfc43a06b2af06380c9720d9c5b48d5ed9f2d30b0a07a6f66b491f9ff40a676d"),
               "euclid-seq", "es_evb_stub", "Step evaluation, sample-trig test: the modulated pulse on an EUC track", pad_to=8),
        Detour(0x4009d576, stock_guard(0x4009d576, 8, "d2413a44017fc1d879fcda30e5152cf64c09afc43a9f82ca5676e3d44521f16a"),
               "euclid-seq", "es_slide_a_stub", "Slide look-ahead: the next live pulse; the search always ends", pad_to=8),
        Detour(0x4009d5dc, stock_guard(0x4009d5dc, 8, "d2413a44017fc1d879fcda30e5152cf64c09afc43a9f82ca5676e3d44521f16a"),
               "euclid-seq", "es_slide_b_stub", "Slide look-ahead loop: the same", pad_to=8),
        Detour(0x40034df4, stock_guard(0x40034df4, 6, "258c7e0d64525403dca91e7332e02ca7e06cec6d02bd989b5c585d374f6d6455"),
               "euclid-seq", "es_ledw_stub", "Grid trig LEDs show an EUC track's live pulses while playing"),
        Detour(0x400392cc, stock_guard(0x400392cc, 8, "a57855f641d419b81f08ce2f502a1bf18363df142106b0b0ab926fc65b1c0948"),
               "euclid-seq", "es_pmtr_stub", "LFO SETUP PMTR: six EUCLID destinations after FX2", pad_to=8),
        Detour(0x4003bf64, stock_guard(0x4003bf64, 8, "88c3015bea265af524001c19cb4e3b9743131f26f46f5d0e58dfb2f8622283c1"),
               "euclid-seq", "es_fmt_stub", "PMTR formatter: EUC PL1..OP", pad_to=8),
        Detour(0x400503c4, stock_guard(0x400503c4, 8, "91fea154aed7ca7f7aed1e03380f8eba791542d2f01b3f4a9b173e2dec9df118"),
               "euclid-seq", "es_fright_stub", "EUCLID mode: FUNC+RIGHT opens the EUCLID page", pad_to=8),
        Detour(0x40026ed4, stock_guard(0x40026ed4, 8, "da2cb4d6518b5f01824c67892e93d73a3918c265b990c5b52754303ce22d1d29"),
               "euclid-seq", "es_cp_pattern_out", "Pattern copy: the settings go to the module clipboard", pad_to=8),
        Detour(0x40026f64, stock_guard(0x40026f64, 8, "06bd76523083bbbe6d37711d11ec7670e4108a5d73719ac40a26e1e92996545a"),
               "euclid-seq", "es_cp_pattern_undo", "Pattern paste or clear: the settings go to the module undo copy", pad_to=8),
        Detour(0x4002b9e2, stock_guard(0x4002b9e2, 10, "b47fd979c549207cae7620b7bda5f65d3c8ff242cb8fae12a44798328e2f77f4"),
               "euclid-seq", "es_cp_pattern_in", "Pattern paste or undo: the settings come from the clipboard or undo copy", pad_to=10),
        Detour(0x40029796, stock_guard(0x40029796, 10, "c7c30e8031c99deb5cf89200288de243d62231694a859bc5c58482162144ca4c"),
               "euclid-seq", "es_cp_track_out", "Track copy, or a paste undo copy: the settings and LFO destinations go along", pad_to=10),
        Detour(0x4002b69a, stock_guard(0x4002b69a, 10, "906440efd69f8005264f873a69807ec5042becb03f70c3ca66c6a973983ef4b2"),
               "euclid-seq", "es_cp_track_in", "Track paste or undo: the settings and LFO destinations come along", pad_to=10),
        Detour(0x4002b6a8, stock_guard(0x4002b6a8, 10, "a4c5733cc540969a33b55259af4910d57b5a90afdd9de9d32993324873ac9f65"),
               "euclid-seq", "es_cp_track_mirror", "Track paste: an EUC track follows its new length", pad_to=10),
        Detour(0x4002b436, stock_guard(0x4002b436, 10, "b05e5d2436ea16e5b51fcafa34041f61e74c669bb2b443f65c7189b68fa88d61"),
               "euclid-seq", "es_cp_track_restore", "Track clear undo: the settings come back", pad_to=10),
        Detour(0x40029558, stock_guard(0x40029558, 10, "bca3271d6668b92a4399607424cd6970b2d876a808b80e755d93e6e3b9338d08"),
               "euclid-seq", "es_cp_trigs_out", "TRACK TRIG EDIT TRIGS row copy or undo copy: the settings go along", pad_to=10),
        Detour(0x4002a42e, stock_guard(0x4002a42e, 8, "3e92663a56c056ccae33bad469a93fc735acd134dc93b6f3d4556dc8944560e4"),
               "euclid-seq", "es_cp_trigs_in", "TRACK TRIG EDIT TRIGS row paste or undo: the settings come along", pad_to=8),
        Detour(0x40029358, stock_guard(0x40029358, 8, "8de83e61d47cd63b65f41b4b803fbbfb4d033b94096ebdb9914ad230521da366"),
               "euclid-seq", "es_cp_part_out", "Part copy: its LFO destinations go to the module clipboard", pad_to=8),
        Detour(0x4002931c, stock_guard(0x4002931c, 8, "594eb185d92c4cae36e617dc47d5e68ff7e47f52e735a6625c0dfe9c01ed63b9"),
               "euclid-seq", "es_cp_part_undo", "Part paste or clear: its LFO destinations go to the undo copy", pad_to=8),
        Detour(0x40029a84, stock_guard(0x40029a84, 6, "49a3883a931e935c64b433487887fa5c6d92134f7fe6b4cf3a164629d86eae40"),
               "euclid-seq", "es_cp_part_in", "Part paste or undo: its LFO destinations come along"),
        Detour(0x4004a946, stock_guard(0x4004a946, 6, "f199e89e6f28f48a9645cec4e37965815ba767bcb59c9c3411b6829a87900446"),
               "euclid-seq", "es_cp_part_save", "Part save: its LFO destinations go to the saved table"),
        Detour(0x4004ab36, stock_guard(0x4004ab36, 6, "f199e89e6f28f48a9645cec4e37965815ba767bcb59c9c3411b6829a87900446"),
               "euclid-seq", "es_cp_part_reload", "Part reload: its LFO destinations come back from the saved table"),
        Detour(0x40039df4, stock_guard(0x40039df4, 8, "0c6d3f0bfd198ddc78800e6503eccdc6cbc5c442209d882244584eda864e93ca"),
               "euclid-seq", "es_clear_stub", "Track clear: the settings back to the defaults (EUC off)", pad_to=8),
        Detour(0x4004a9d0, stock_guard(0x4004a9d0, 8, "9b78b6778f56449ca9429e734d2140df96316ae0e9eea0b9d6eea089f82ddbd0"),
               "euclid-seq", "es_part_clear_stub", "Part clear: its LFO destinations cleared", pad_to=8),
    ),
    gates=(Gate("modules/euclid-seq/verify.py", remix_arg=False),),
)
