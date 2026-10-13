| SPDX-License-Identifier: GPL-3.0-or-later
| The shared wide dial (build_core.py --dsp-loader): a labelled control with more than five values draws
| its value over the plain dial's whole arc. Octabam's tools/build/wide_dial.py, with its table in base
| RAM: fxpage.c lists each listed module page's wide formatters and their maxima there, 0-ended.
        .text
        .global mw_wide_dial

| 0x40047a3c, the dial draw: a2 = the slot's formatter, d2 = its value. Displaced: moveq #2,%d6 ;
| and.l %d5,%d6 ; beq.s 0x40047a8a.
mw_wide_dial:
        lea     -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        lea     modwerk_wide_table,%a0
1:      move.l  (%a0)+,%a1
        tst.l   %a1
        beq.s   3f
        cmpa.l  %a2,%a1
        beq.s   2f
        addq.l  #4,%a0
        bra.s   1b
2:      move.l  (%a0),%d1                       | value * 127 / maximum, rounded, the value at most the maximum
        move.l  %d2,%d0
        cmp.l   %d1,%d0
        bls.s   4f
        move.l  %d1,%d0
4:      move.l  %d1,%a1
        moveq   #127,%d1
        mulu.l  %d1,%d0
        move.l  %a1,%d1
        lsr.l   #1,%d1
        add.l   %d1,%d0
        move.l  %a1,%d1
        divu.l  %d1,%d0
        move.l  %d0,%d2
3:      movem.l (%sp),%d0-%d1/%a0-%a1
        lea     16(%sp),%sp
        moveq   #2,%d6
        and.l   %d5,%d6
        beq.s   5f
        jmp     0x40047a42
5:      jmp     0x40047a8a
