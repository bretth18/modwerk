| SPDX-License-Identifier: GPL-3.0-or-later
| The ColdFire's idle time (status.c): main runs the init list, then spins at 0x4001fc9c for good, and that
| spin is the idle task (Octabam's KERNEL.md: the lowest priority, run when nothing else wants the CPU).
        .text
        .global mw_idle

| 0x4001fc96, main's last init call. Displaced: jsr 0x40098a2c; this spin never returns to stock's (0x4001fc9c,
| left in place: ot_emu parks main there again after a bench call, its detoured-park convention).
| The spin adds up, in counts of the frame timer DTIM3, each pass nothing broke: a pass is far shorter than
| modwerk_idle_gap, so a longer gap is an interrupt or a task, busy time. DTIM3 runs free over all 32 bits
| (its reference reads 0xffffffff on the unit), so a difference is right across its wrap. d0-d2 are main's own.
mw_idle:
        jsr     0x40098a2c
        move.l  0xfc07c00c,%d2                  | DTCN3
1:      move.l  0xfc07c00c,%d0
        move.l  %d0,%d1
        sub.l   %d2,%d1
        move.l  %d0,%d2
        cmp.l   modwerk_idle_gap,%d1
        bhi.s   1b
        add.l   %d1,modwerk_idle_counts
        bra.s   1b
