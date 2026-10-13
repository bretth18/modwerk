| SPDX-License-Identifier: GPL-3.0-or-later
| Copyright (C) 2026 Modwerk contributors
| ROM remains available while the loader calls the stock RAM/hardware setup.
        .text
        .globl modwerk_boot_draw_gate, modwerk_boot_rom_replay, modwerk_boot_active
modwerk_boot_draw_gate:
        lea -8(%sp),%sp
        movem.l %d0,(%sp)
        move.w %sr,%d0
        move.l %d0,4(%sp)
        tst.l modwerk_boot_active
        beq.s .Linactive
        move.l 4(%sp),%d0
        move.w %d0,%sr
        movem.l (%sp),%d0
        lea 8(%sp),%sp
        jmp modwerk_boot_frame_hook
.Linactive:
        move.l 4(%sp),%d0
        move.w %d0,%sr
        movem.l (%sp),%d0
        lea 8(%sp),%sp
modwerk_boot_rom_replay:
        .space 6
        jmp 0x40013cb4
        .org 76
modwerk_boot_active:
        .long 0
