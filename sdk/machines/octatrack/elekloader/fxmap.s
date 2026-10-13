| SPDX-License-Identifier: GPL-3.0-or-later
| The project's map of module effect handles in project.work (fxmap.c; build_core.py --dsp-loader):
| stock's loader skips every line that starts with '#', so the map rides as '#MODWERK_FX=' lines.
| PLAY MODES and SCALE QUANTIZER patch the loader's head, its comment check and the writer
| (sdk/octabam/modules/playmodes/INVESTIGATION.md, "The project file"), so these detours sit beside
| theirs and both modules still install over stock bytes; the end of the engine's project load is the
| one Octabam's publication hooks use (dl_project_end); fxmap.c owns it.
        .text
        .global mw_project_begin, mw_project_line, mw_project_write, mw_project_end

| 0x400866e2, in the loader's head after 58(sp) took its inverse of `storing` (nonzero on the
| parse-only pass). Displaced: clrl %sp@(50) ; clrl %sp@(54).
mw_project_begin:
        clr.l   50(%sp)
        clr.l   54(%sp)
        lea     -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        moveq   #0,%d0
        tst.l   16+58(%sp)
        bne.s   1f
        moveq   #1,%d0                          | storing
1:      move.l  %d0,-(%sp)
        jsr     modwerk_fxmap_begin
        addq.l  #4,%sp
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea     16(%sp),%sp
        jmp     0x400866ea

| 0x40088224, the loop's next line, where every line ends: stock's, and each '#' line the comment
| check, PLAY MODES or SCALE QUANTIZER skipped. d3 = the line (NUL-ended, without CR LF), 58(sp)
| nonzero on the parse-only pass; the stack is the loop's on every path. d0/d1/a0/a1 are free: stock
| calls through a0 before it reads any of them. Displaced: pea 0x400b44b5.
mw_project_line:
        movea.l %d3,%a0
        mvs.b   (%a0),%d0
        moveq   #35,%d1                         | '#'
        cmp.l   %d1,%d0
        bne.s   1f
        move.l  58(%sp),-(%sp)
        move.l  %d3,-(%sp)
        jsr     modwerk_fxmap_line
        addq.l  #8,%sp
1:      pea     0x400b44b5
        jmp     0x4008822a

| 0x400888c8, the writer, after PATTERN_CHANGE_AUTO_SILENCE_TRACKS's line went out: d0 = its write's
| result, d3 = the file, d2 the stock line's buffer (callee-saved). Our lines follow it unless that
| write failed, which stock checks next. Displaced: lea %sp@(28),%sp ; tstl %d0.
mw_project_write:
        lea     28(%sp),%sp
        tst.l   %d0
        blt.s   1f
        move.l  %d0,-(%sp)
        move.l  %d3,-(%sp)
        jsr     modwerk_fxmap_write
        addq.l  #4,%sp
        move.l  (%sp)+,%d0
1:      tst.l   %d0
        jmp     0x400888ce

| 0x4008540e, the engine's project load done, d2 its result (negative: failed).
| Displaced: movel %d2,%sp@- ; moveal %fp@(-566),%a0.
mw_project_end:
        lea     -60(%sp),%sp
        movem.l %d0-%d7/%a0-%a6,(%sp)
        move.l  %d2,-(%sp)
        jsr     modwerk_fxmap_loaded            | the base's other project-load work goes in there too
        addq.l  #4,%sp
        movem.l (%sp),%d0-%d7/%a0-%a6
        lea     60(%sp),%sp
        move.l  %d2,-(%sp)
        movea.l -566(%fp),%a0
        jmp     0x40085414
