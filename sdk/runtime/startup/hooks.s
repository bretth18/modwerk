| SPDX-License-Identifier: GPL-3.0-or-later
| Copyright (C) 2026 Modwerk contributors
| Startup-only adapters for the existing sample-memory runtime, OS 1.40C.
        .text
        .globl modwerk_boot_loop, modwerk_boot_frame_hook, modwerk_boot_replay_draw
modwerk_boot_loop:
        move.l %d6,-(%sp)
        jsr modwerk_boot_run
        addq.l #4,%sp
        jmp 0x40055b7e

| The compositor's registers and flags are live at its frame-load instruction.
| Draw only while startup runs; replay comes from the verified local firmware.
modwerk_boot_frame_hook:
        lea -64(%sp),%sp
        movem.l %d0-%d7/%a0-%a6,(%sp)
        move.w %sr,%d0
        move.l %d0,60(%sp)
        tst.l modwerk_boot_active
        beq.s .Ldone
        move.l 0x400b9710,-(%sp)
        jsr modwerk_boot_draw
        addq.l #4,%sp
.Ldone:
        move.l 60(%sp),%d0
        move.w %d0,%sr
        movem.l (%sp),%d0-%d7/%a0-%a6
        lea 64(%sp),%sp
modwerk_boot_replay_draw:
        .space 6
        jmp 0x40013cb4
