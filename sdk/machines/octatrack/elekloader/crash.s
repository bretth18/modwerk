| SPDX-License-Identifier: GPL-3.0-or-later
| Crash recovery (crash.c): an error exception writes what it knows to battery RAM, then restarts the unit through
| boot.s's soft reset (DSPs parked, panel and USB reset; nothing armed, so the flashed base boots, as a power
| cycle would). Stock's own handler shows the exception screen and halts until a power cycle.
| The record (crash.c's struct crash): magic, count, the exception frame's two longs (format, vector, FS and SR;
| PC), d0-d7, a0-a6, the stack pointer, eight longs above the frame. ColdFire V4e; assemble with -mcpu=54455.
        .set    REC,   0x100ff800      | battery RAM nothing else uses (fxmap.c)
        .set    MAGIC, 0x4d574352      | "MWCR"
        .text
        .global mw_crash
mw_crash:
        move.w  #0x2700,%sr
        move.l  %a0,(REC+48).l
        lea     (REC).l,%a0
        movem.l %d0-%d7,(16,%a0)
        movem.l %a1-%a6,(52,%a0)
        move.l  %sp,(76,%a0)
        move.l  (%sp),(8,%a0)
        move.l  (4,%sp),(12,%a0)
        lea     (8,%sp),%a1
        lea     (80,%a0),%a2
        moveq   #8,%d0
1:      move.l  (%a1)+,(%a2)+
        subq.l  #1,%d0
        bne.s   1b
        move.l  #MAGIC,%d0
        cmp.l   (%a0),%d0
        beq.s   2f
        clr.l   (4,%a0)
        clr.l   (112,%a0)
2:      addq.l  #1,(4,%a0)
        move.l  %d0,(%a0)
        jmp     (modwerk_boot_reset).l
