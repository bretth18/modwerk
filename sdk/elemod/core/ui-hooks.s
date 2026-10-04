| SPDX-License-Identifier: GPL-3.0-or-later
| Original adapters for the public tick/draw/key/encoder event contracts.
| Each patched stock site is a verified absolute C call with stack arguments.
| Tick runs before the compose check; draw runs after the stock drawing.
| Event handlers cannot alter the stock call's general registers or status.
        .section .run, "ax"
        .macro save_context
        lea -64(%sp), %sp
        movem.l %d0-%d7/%a0-%a6, (%sp)
        move.w %sr, %d0
        move.l %d0, 60(%sp)
        .endm
        .macro restore_context
        move.l 60(%sp), %d0
        move.w %d0, %sr
        movem.l (%sp), %d0-%d7/%a0-%a6
        lea 64(%sp), %sp
        .endm

        .globl mw_hook_tick
mw_hook_tick:
        save_context
        move.l 68(%sp), -(%sp)
        jsr mw_dispatch_tick
        addq.l #4, %sp
        restore_context
        jmp mw_stock_tick

        .globl mw_hook_draw
mw_hook_draw:
        | Duplicate the caller's ctrl/bmp arguments for the original C call.
        move.l 8(%sp), -(%sp)
        move.l 8(%sp), -(%sp)
        jsr mw_stock_draw
        addq.l #8, %sp
        save_context
        movea.l 68(%sp), %a0
        movea.l 72(%sp), %a1
        lea -8(%sp), %sp
        move.l %a1, (%sp)
        move.l %a0, 4(%sp)
        jsr mw_dispatch_draw
        addq.l #8, %sp
        restore_context
        rts

        .macro input_hook event
        .globl mw_hook_\event
mw_hook_\event:
        save_context
        movea.l 68(%sp), %a0
        movea.l 72(%sp), %a1
        lea -8(%sp), %sp
        move.l %a0, (%sp)
        move.l %a1, 4(%sp)
        jsr mw_dispatch_\event
        addq.l #8, %sp
        tst.l %d0
        bne.s .Ltaken\@
        restore_context
        jmp mw_stock_\event
.Ltaken\@:
        move.l %d0, (%sp)
        restore_context
        rts
        .endm
        input_hook key
        input_hook enc
