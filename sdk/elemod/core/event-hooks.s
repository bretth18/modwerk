| SPDX-License-Identifier: GPL-3.0-or-later
| Original SETTINGS/render adapters. Displaced instructions are filled locally.
| Render-out precedes stock EMAC restoration, so handler EMAC state cannot leak.
        .section .run, "ax"
        .macro event_save
        lea -64(%sp), %sp
        movem.l %d0-%d7/%a0-%a6, (%sp)
        move.w %sr, %d0
        move.l %d0, 60(%sp)
        .endm
        .macro event_restore
        move.l 60(%sp), %d0
        move.w %d0, %sr
        movem.l (%sp), %d0-%d7/%a0-%a6
        lea 64(%sp), %sp
        | A call replaced an inline block. Discard its extra return address.
        lea 4(%sp), %sp
        .endm

        .globl mw_hook_settings
mw_hook_settings:
        event_save
        move.l %a2, -(%sp)
        jsr mw_dispatch_settings
        addq.l #4, %sp
        event_restore
        jmp mw_resume_settings

        .macro render_hook event
        .globl mw_hook_\event
mw_hook_\event:
        event_save
        jsr mw_dispatch_\event
        event_restore
        jmp mw_resume_\event
        .endm
        render_hook render_in
        render_hook render_out

        | CI emits zero placeholders. Only the local stock reader fills them.
        .macro resume event
        .globl mw_resume_\event
mw_resume_\event:
        .space 6
        jmp mw_continue_\event
        .endm
        resume settings
        resume render_in
        resume render_out
