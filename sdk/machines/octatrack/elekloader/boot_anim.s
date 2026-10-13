| SPDX-License-Identifier: GPL-3.0-or-later
| Copyright (C) 2026 Modwerk contributors
|
| The base's startup (boot_anim.c) in place of the stock logo loop: build_core.py puts a jmp here on
| the loop's first instruction (0x400559c6). The stock loop keeps the boot window in d6, which the code
| after the loop uses again; C preserves d2-d7/a2-a6. ColdFire V4e; assemble with -mcpu=54455.

        .section .run, "ax"
        .globl  modwerk_boot_loop
modwerk_boot_loop:
        move.l  %d6, -(%sp)             | the boot window
        jsr     modwerk_boot_run
        addq.l  #4, %sp
        jmp     0x40055b7e              | the stock code after the loop; it resets every LED
