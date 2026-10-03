"""MIDI SCENES -- MIDI-driven scene locks, built from bkkbrls-del/midisc.

Stock 1.40C has no per-scene parameter lock over MIDI: XF morph reads one
live 8x30 lock table only the panel writes. midisc adds a second table
(MSC, `scene<<8 | track<<5 | flat`, 4096 bytes) and rewires scene hold,
XF morph, part save/reload and the scene clear/copy/paste rows to read it
when a MIDI event is driving. The panel path is untouched.

Source: `upstream/` is his repository (submodule, tracking 1.40MIDISC8.2).
His caves are written in his Python encoder; his `tools/gas_port.py`
regenerates `gas/*.s` from the same builders and proves each region
assembles to his bytes at his addresses (`tools/verify/verify_midiscenes.py`
re-runs that). Nothing in `upstream/` is edited here.

Placement: every unit is `dram=True`, linked into octabam's platform
runtime and depacked at boot into the arena reserve (docs/remixer/
PLACEMENT.md). Inside the OS this module changes only the detour and poke
sites below, plus the boot redirect when no other module supplies it.

Not carried: his MIDI CONTROL CC48/55/56 tick rows (UI-table pokes, not a
cave); CCs behave as stock. The apply_part entry (0x40009094) stays stock
since his 1.40MSCN6, so Octakit owns it alone. His own 1.40MIDISC8 image
fails project load under the port because his CAVE2 (0x400d2ee6) overruns
a live descriptor's enable words at 0x400d3014/18; this build links every
unit into DRAM and is immune (measured).

On hardware as OKMS1 (remix ok-ms), confirmed by him -- and Part Reload
trapped on it: Octakit's replacement of the stock reload validates its
caller's return address and his `reload` stub substitutes it
(subst_return below). Refused by the ledger without KITS RELOAD
(modules/kits-reload), which keeps the stock jsr and hooks the return
sites for rel_after.
"""

from remix.stock_guard import stock_guard

from remix.schema import Gate, Category, Proof, Claims, Detour, Kind, Linked, Module, Poke

UP = "modules/midi-scenes/upstream/gas/"
H = bytes.fromhex

# Link order: a unit can only reference symbols of units before it.
UNITS = (
    Linked("msc", UP + "msc.s", dram=True),
    Linked("state", UP + "state.s", dram=True),
    Linked("seam", UP + "seam.s", dram=True),                 # part_window: no deps
    Linked("cave2", UP + "cave2.s", dram=True),               # rebuild, freeze_alt
    Linked("safe_cave", UP + "safe_cave.s", dram=True),       # pack/unpack/... call part_window, rebuild
    Linked("reload_cave", UP + "reload_cave.s", dram=True),   # rel_after: freeze_alt + pack/unpack
    Linked("code2", UP + "code2.s", dram=True),               # reload -> rel_after
    Linked("scene_paste", UP + "scene_paste.s", dram=True),
    Linked("seam_bank", UP + "seam_bank.s", dram=True),       # bank_sw/bank_inv call pack/unpack
    Linked("stub", UP + "stub.s", dram=True),
    Linked("project_cave", UP + "project_cave.s", dram=True),
    Linked("enc_unlock", UP + "enc_unlock.s", dram=True),
)

DETOURS = (
    Detour(0x400534CE, stock_guard(0x400534ce, 10, "0a34a9dae47506440d691aa67432e14ddd2067beefb8fd0a710b9d2602bd2ab6"), "stub", "hold_a", "scene-hold dispatch, engine A", pad_to=10),
    Detour(0x40052ECE, stock_guard(0x40052ece, 10, "c48200c62540f2bbf816fc02f6345c909f39c4a82c6e6db5871503b874f94aa6"), "stub", "hold_b", "scene-hold dispatch, engine B", pad_to=10),
    Detour(0x4004E348, stock_guard(0x4004e348, 6, "655d6cde4464d3fc4b96a5d4042196495b50b875d84102083b78853d87049b33"), "stub", "dial", "scene-held dial readout"),
    Detour(0x400343BC, stock_guard(0x400343bc, 6, "ef8b9ca3b718a0a3a2211fe3c4f46e8929feb159071ae75a8020b3428fefe195"), note="per-track ADDI dispatch -> stock", target=0x400343C4),
    Detour(0x4003445E, stock_guard(0x4003445e, 6, "ef8b9ca3b718a0a3a2211fe3c4f46e8929feb159071ae75a8020b3428fefe195"), note="per-page ADDI dispatch -> stock", target=0x40034466),
    Detour(0x400343E8, stock_guard(0x400343e8, 6, "a6b7abe55b36f6f401bdf3e42ae6914e7ed8bab6e6c8aeb2679c6bc3d5aa3617"), "stub", "taddi", "scene-locked track offset", kind="jsr"),
    Detour(0x4003448E, stock_guard(0x4003448e, 6, "6e095c0ed8bb13c8e2f1ed5964cc2aa9e525bc73af9a5e48dce20afec3af21f0"), "stub", "paddi", "scene-locked page offset", kind="jsr"),
    Detour(0x40034764, stock_guard(0x40034764, 6, "a6b7abe55b36f6f401bdf3e42ae6914e7ed8bab6e6c8aeb2679c6bc3d5aa3617"), "stub", "taddi", "MIDI lock-LED paint, engine A", kind="jsr"),
    Detour(0x40034950, stock_guard(0x40034950, 6, "a6b7abe55b36f6f401bdf3e42ae6914e7ed8bab6e6c8aeb2679c6bc3d5aa3617"), "stub", "taddi", "MIDI lock-LED paint, engine B", kind="jsr"),
    Detour(0x40031F44, stock_guard(0x40031f44, 8, "ca0e2748da716f189ef5678b1f45efd14403edf3e213734eda507773d491e9b4"), "stub", "pad", "pad-has-locks indicator", pad_to=8),
    Detour(0x400434CA, stock_guard(0x400434ca, 6, "4fc2250cd387d3091460994656740d63a8f1278f4b4d68e746740952ccfc2f16"), "stub", "press", "encoder-press refresh"),
    Detour(0x40054CB6, stock_guard(0x40054cb6, 6, "a94cfc1a5ffc3afea8bb6e6462532b16371415b1f68bf30a7831840c08f56ed8"), "stub", "release", "scene-pad release mix"),
    Detour(0x40062F24, stock_guard(0x40062f24, 6, "1b5449969cf7d2e5e4ad604545148cb6f6ae52abf834b0ca1cf51be4fbc00e48"), "stub", "clr_sc", "CLEAR SCENE menu row", kind="jsr"),
    Detour(0x40062FBE, stock_guard(0x40062fbe, 6, "95a65977926591c138e4e38d6934e763c743f4abc11d2744cbb6ee5fefb074ac"), "stub", "cpy_sc", "COPY SCENE menu row", kind="jsr"),
    Detour(0x40062E3C, stock_guard(0x40062e3c, 6, "17d3a295805f15920e3c1faae63ec3f70244430c108aa6b0e00a461c123db360"), "scene_paste", "pst_sc", "PASTE SCENE menu row", kind="jsr"),
    Detour(0x4002E828, stock_guard(0x4002e828, 6, "e0790c8446179e7e7631acc3cce1fc78c56b72899c36ed1272f16a8db3fa769f"), "project_cave", "clr_pt", "FUNC+Part clear", kind="jsr"),
    Detour(0x40053A9E, stock_guard(0x40053a9e, 10, "94cfbe1bad48e5e4815e66723dc09019463cada7a7d6dd797ee097b800be568d"), "enc_unlock", "hook_a", "scene+encoder unlock, engine A", pad_to=10),
    Detour(0x40054392, stock_guard(0x40054392, 10, "99f93dbc184930d7c5fcef6f3b40b01f0d69c1e0992588d311f2f7686dd4c7ed"), "enc_unlock", "hook_b", "scene+encoder unlock, engine B", pad_to=10),
    Detour(0x4003F3A2, stock_guard(0x4003f3a2, 6, "5962065952cddcc9abd772416a3f5a49d83d6bb967439bcdc2e8ff04a048cab3"), "safe_cave", "morph", "XF morph tail (SAFE_CAVE since 1.40MSCN6)"),
    Detour(0x40061E78, stock_guard(0x40061e78, 6, "da273da9ea374a8f9bc12ec7e2f622d1d5ce7e78d2d655e93655ae9977286e2d"), "stub", "xf1", "post-XF continuation 1"),
    Detour(0x40062C32, stock_guard(0x40062c32, 6, "e98feec5aee0adf15225ef81ddf90c904a73d8f3b086fd3aa2eebf4719eb0c96"), "safe_cave", "xf2", "post-XF continuation 2"),
    Detour(0x40052AE0, stock_guard(0x40052ae0, 6, "8bba7275f6d14bc415fde1897a16d9e4a95dc8ae741ade0e062abe0a870f6c65"), "code2", "scene_done", "scene-recall completion A"),
    Detour(0x40052A10, stock_guard(0x40052a10, 6, "8bba7275f6d14bc415fde1897a16d9e4a95dc8ae741ade0e062abe0a870f6c65"), "code2", "scene_done", "scene-recall completion B"),
    Detour(0x4005538A, stock_guard(0x4005538a, 8, "2d6e09987ff507dbdb14dd2b4e1036b3d9f36c5796205447cf16d47c1b10fb5f"), "code2", "write_mix", "part-window write, remixed", pad_to=8),
    Detour(0x4009D1DE, stock_guard(0x4009d1de, 10, "b8c681ab6db08000f18dfba4a3641067372a0fb5abc576b2055f49851744e643"), "safe_cave", "plock", "post-plock scene rebuild", pad_to=10),
    Detour(0x4002DD12, stock_guard(0x4002dd12, 6, "9baa9fb225a4812b3da68abdc177cb33292fa2cee05d0139476818d7977a194f"), "safe_cave", "save", "Part Save menu action", kind="jsr"),
    # `reload` and `apply_bridge` park the site's return address in apply_ret
    # and return the stock callee through their own continuation
    # (subst_return): Octakit's part reload validates that address and traps
    # on his -- the two reload sites need the KITS RELOAD bridge beside her.
    Detour(0x4002DD56, stock_guard(0x4002dd56, 6, "e3a25614d992a47510ed88acb1be409d15ccd8e17b57bd97863cf48108ac307c"), "code2", "reload", "Part Reload, menu path", kind="jsr", subst_return=True),
    Detour(0x4005E05A, stock_guard(0x4005e05a, 6, "e3a25614d992a47510ed88acb1be409d15ccd8e17b57bd97863cf48108ac307c"), "code2", "reload", "Part Reload, non-menu path", kind="jsr", subst_return=True),
    Detour(0x400622AA, stock_guard(0x400622aa, 6, "20f4db6e89e2ca275d05fe67bd35c50968fbf1171358af7a97d5210201a230bd"), "seam_bank", "bank_sw", "bank-pointer refresh on switch A", kind="jsr"),
    Detour(0x40087D44, stock_guard(0x40087d44, 6, "20f4db6e89e2ca275d05fe67bd35c50968fbf1171358af7a97d5210201a230bd"), "stub", "bank_pub", "bank publish (no pack) on switch B", kind="jsr"),
    Detour(0x4001FBD0, stock_guard(0x4001fbd0, 6, "20f4db6e89e2ca275d05fe67bd35c50968fbf1171358af7a97d5210201a230bd"), "seam_bank", "bank_inv", "bank-pointer refresh on init A", kind="jsr"),
    Detour(0x40025AA2, stock_guard(0x40025aa2, 6, "20f4db6e89e2ca275d05fe67bd35c50968fbf1171358af7a97d5210201a230bd"), "seam_bank", "bank_inv", "bank-pointer refresh on init B", kind="jsr"),
    Detour(0x400622C6, stock_guard(0x400622c6, 6, "afad0d9908862e673b0130a710d92307779db90afc4d4f985f7cc058a5b9f1a9"), "project_cave", "after_proj", "post-project-load CKPT seed + unpack", kind="jsr"),
    Detour(0x4002DCD4, stock_guard(0x4002dcd4, 6, "70a7c68740cd38dfb8585d9708da810bc6709b021c989f39012925a23162363d"), "safe_cave", "save", "SAVE ALL's lea -> the ported Save", kind="lea"),
    # The part-change UI sites go through his apply bridge (pack, stock
    # apply, unpack + mix); STOCK_APPLY itself stays stock.
    Detour(0x4002B59A, stock_guard(0x4002b59a, 6, "7c8333d86904fe92c238f0bd9ef23551df1f712ec5901abac19f10333dd18692"), "safe_cave", "apply_bridge", "part-change UI apply -> bridge, site 1", kind="jsr", subst_return=True),
    Detour(0x4002B8F8, stock_guard(0x4002b8f8, 6, "7c8333d86904fe92c238f0bd9ef23551df1f712ec5901abac19f10333dd18692"), "safe_cave", "apply_bridge", "part-change UI apply -> bridge, site 2", kind="jsr", subst_return=True),
    Detour(0x4004A8FC, stock_guard(0x4004a8fc, 6, "7c8333d86904fe92c238f0bd9ef23551df1f712ec5901abac19f10333dd18692"), "safe_cave", "apply_bridge", "set pattern's part then apply -> bridge, site 3", kind="jsr", subst_return=True),
    Detour(0x40029AF8, stock_guard(0x40029af8, 6, "156ec3ed8b04117cf3baac21cf3e71e6d4e9ffed5ff1cdc8858221b9704da891"), "safe_cave", "apply_bridge", "part-change UI apply (jmp) -> bridge",
           subst_return=True),
)

POKES = (
    Poke(0x40034754, stock_guard(0x40034754, 2, "7bdb08fa04994418cc3888650522434eddc440782c695752b17696658db61575"), H("4e71"), "MIDI lock LEDs: scan MSC too, engine A (bne->nop)"),
    Poke(0x4003493E, stock_guard(0x4003493e, 2, "a89aad5cb9834d06e8ebfa5695b54d1ac6bdba2c3deb109738472e69db48b911"), H("4e71"), "MIDI lock LEDs: scan MSC too, engine B (bne->nop)"),
    Poke(0x4004A9B0, stock_guard(0x4004a9b0, 2, "9d6c12aea7e359d0e9e45a0331a6190ace7f782aeb9762700846c8fd5a1af54b"), H("6012"), "never re-apply the part after Part Save (bne->bra)"),
    Poke(0x4004AA8E, stock_guard(0x4004aa8e, 2, "9d6c12aea7e359d0e9e45a0331a6190ace7f782aeb9762700846c8fd5a1af54b"), H("6012"), "never re-apply the part after Part Clear (bne->bra)"),
)

MODULE = Module(
    name="midi-scenes",
    key="MIDI SCENES",
    kind=Kind.CF_PATCH,
    category=Category.PARTS, author="bkkbrls-del/midisc", author_url="https://github.com/bkkbrls-del/midisc",
    proof=Proof.HARDWARE, proof_note="`ok-ms` on his unit, 14 Sep 2026",
    doc="MIDI-driven scene locks (hold/morph/save/reload/clear/copy/paste), "
        "built from bkkbrls-del/midisc as linker-placed units.",
    linked=UNITS,
    detours=DETOURS,
    pokes=POKES,
    # his MIDI-track lock store: the 144-byte freeze twin (0x90492) then the
    # 144-byte sparse blob (0x90522) inside every Part window (his memory_map)
    claims=Claims(part_window=((0x90492, 288, "MSC freeze twin + sparse blob"),)),
    gates=(Gate('tools/verify/verify_midiscenes.py', remix_arg=False),),
)
