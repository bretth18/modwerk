| SPDX-License-Identifier: GPL-3.0-or-later
| Authored synthetic instruction blocks for firmware-free resume CPU tests.
        .section .run, "ax"
        .globl fixture_settings, fixture_render_in, fixture_render_out
fixture_settings:
        movea.l (%a2), %a0
        pea 85.w
fixture_render_in:
        move.l #0x135790, %d0
fixture_render_out:
        movem.l -40(%a6), %d0-%d3/%a0-%a2

        | Independent synthetic-state helpers. Record: acc[4], ext[2], mask, mode.
        .globl fixture_emac_set, fixture_emac_get, fixture_end
fixture_emac_set:
        movea.l 4(%sp), %a0
        move.l #0, %macsr
        movem.l (%a0), %d0-%d7
        move.l %d0, %acc0
        move.l %d1, %acc1
        move.l %d2, %acc2
        move.l %d3, %acc3
        move.l %d4, %accext01
        move.l %d5, %accext23
        move.l %d6, %mask
        move.l %d7, %macsr
        rts
fixture_emac_get:
        movea.l 4(%sp), %a0
        move.l %macsr, %d7
        move.l #0, %macsr
        move.l %mask, %d6
        move.l %accext23, %d5
        move.l %accext01, %d4
        move.l %acc3, %d3
        move.l %acc2, %d2
        move.l %acc1, %d1
        move.l %acc0, %d0
        movem.l %d0-%d7, (%a0)
        move.l %d7, %macsr
        rts
fixture_end:
