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
