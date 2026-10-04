| SPDX-License-Identifier: GPL-3.0-or-later
| Original Modwerk boot copier, using the public elemod linker symbol ABI.
| It executes in the unpacked image before the mod RAM image exists.
| The original boot call's target is resolved from verified local firmware.
        .section .boot, "ax"
        .globl mw_boot
mw_boot:
        lea -64(%sp), %sp
        movem.l %d0-%d7/%a0-%a6, (%sp)
        move.w %sr, %d0
        move.l %d0, 60(%sp)
        movea.l #__run_load, %a0
        movea.l #__run_start, %a1
        move.l #__run_words, %d0
        tst.l %d0
        beq.s .Lzero
.Lcopy:
        move.l (%a0)+, (%a1)+
        subq.l #1, %d0
        bne.s .Lcopy
.Lzero:
        movea.l #__bss_start, %a1
        move.l #__bss_words, %d0
        tst.l %d0
        beq.s .Ldone
.Lclear:
        clr.l (%a1)+
        subq.l #1, %d0
        bne.s .Lclear
.Ldone:
        move.l 60(%sp), %d0
        move.w %d0, %sr
        movem.l (%sp), %d0-%d7/%a0-%a6
        lea 64(%sp), %sp
        jmp mw_stock_boot

        .section .run, "ax"
        .globl mw_probe_data
mw_probe_data:
        .long 0x4d57524b, 0x434f5245, 0x12345678, 0x87654321
        .section .bss, "aw", @nobits
        .globl mw_probe_zero
mw_probe_zero:
        .space 16
