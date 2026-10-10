| Euclid Seq hooks. Appended to the compiled C by prepare.py.
| C calls clobber d0-d1/a0-a1; the stubs save them and keep the condition
| codes the stock code reads after each site.

        .text
        .balign 2
        .global es_press_stub, es_release_stub

| 0x40051970: a TRIG press on an empty step in the grid editor places a
| trig (masks and condition word, RAM and battery mirror). With EUC on for
| the track it leaves through the routine's common exit instead, the same
| exit the hold-an-existing-trig paths take.
es_press_stub:
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        jsr es_blocked
        tst.l %d0
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        bne.s 1f
        move.l %d6,%d2
        and.l %d3,%d2
        move.w %d2,(0,%a1,%a0.l*2)
        jmp 0x40051978
1:      jmp 0x40051c84

| 0x400601aa: releasing a held trig without a lock edit removes it. With EUC
| on, skip to the path's own end (0x4006066c); the held state was already
| cleared before this site.
es_release_stub:
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        jsr es_blocked
        tst.l %d0
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        bne.s 1f
        move.l 0x46c82456,%a0
        jmp 0x400601b0
1:      jmp 0x4006066c

| 0x4004c912: PATTERN SCALE's length setter, after storing a pattern or track
| length. Replays the displaced call; the stock track rebuild follows.
        .global es_length_stub
es_length_stub:
        jsr 0x400339d8
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        jsr es_length_changed
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        rts

| 0x40042d1c: REC_TRIG(track, context), the live recorder. On an EUC track
| it returns -1 (no step recorded), as when recording is off.
        .global es_rec_stub
es_rec_stub:
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        move.l 20(%sp),-(%sp)
        jsr es_rec_blocked
        addq.l #4,%sp
        tst.l %d0
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        beq.s 1f
        moveq #-1,%d0
        rts
1:      link.w %fp,#-56
        movem.l %d2-%d7/%a2-%a5,(%sp)
        jmp 0x40042d24

| 0x40013634: the stock LED-row sender. Keep the MKII trig colour in step
| first, then replay its three displaced instructions.
        .global es_led_stub
es_led_stub:
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        jsr es_led_sync
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        move.l %d3,-(%sp)
        move.l %d2,-(%sp)
        move.l 12(%sp),%d2
        jmp 0x4001363c

| ---- the EUCLID trig mode ---------------------------------------------------
| es_mode is nonzero while EUCLID is the chosen trig mode; it counts only on
| audio tracks (0x80000012 = 0). The stock mode word stays TRACKS meanwhile.
        .macro ES_ACTIVE no
        tst.b es_mode
        beq \no
        tst.l 0x80000012
        bne \no
        .endm

| 0x40058722 (38 bytes): the TRIG MODE window initialises its list with
| 6 rows (3 on MIDI tracks) and selects the current mode's row. Same calls,
| 7 rows on audio tracks, row 6 selected in the EUCLID mode.
        .global es_sel_open_stub
es_sel_open_stub:
        jsr es_sel_count
        move.l %d0,-(%sp)
        move.l #3,-(%sp)
        pea 0x46c7d330
        jsr 0x4007ec60
        jsr es_sel_row
        move.l %d0,-(%sp)
        jmp 0x40058748

| 0x40051f18 / 0x40051f88: UP and DOWN in the window store the new row's
| mode (a0 = its entry in the stock table). Row 6 stores TRACKS and sets
| es_mode; any other row clears it.
        .global es_sel_pick_up, es_sel_pick_down
es_sel_pick_up:
        move.l (%a0),-(%sp)
        jsr es_sel_pick
        addq.l #4,%sp
        move.l %d0,0x460d16f0
        jmp 0x40051f1e
es_sel_pick_down:
        move.l (%a0),-(%sp)
        jsr es_sel_pick
        addq.l #4,%sp
        move.l %d0,0x460d16f0
        jmp 0x40051f8e

| 0x40035854 (12 bytes): the status bar's trig-mode icon, icons[mode].
        .global es_status_stub
es_status_stub:
        lea es_icons,%a0
        move.l 0x460d16f0,%d0
        bne.s 1f
        ES_ACTIVE 1f
        moveq #6,%d0
1:      jmp 0x40035860

| 0x40045826 (8 bytes): the mode panel is drawn for any mode but TRACKS.
        .global es_panel_stub
es_panel_stub:
        tst.l 0x460d16f0
        bne.s 2f
        ES_ACTIVE 1f
2:      jmp 0x4004582e
1:      jmp 0x4004589c

| 0x40035f84 (10 bytes): the panel's title bar.
        .global es_title_stub
es_title_stub:
        tst.l 0x460d16f0
        bne.s 2f
        ES_ACTIVE 1f
        jsr es_title
1:      jmp 0x400360a6
2:      jmp 0x40035f8e

| 0x40044932 (10 bytes): the panel's body (keyboard, slots, slices...).
        .global es_body_stub
es_body_stub:
        move.l 0x460d16f0,%d0
        bne.s 2f
        ES_ACTIVE 1f
        jsr es_body
1:      jmp 0x400453f8
2:      jmp 0x4004493c

| 0x4004d95c (8 bytes): the parameter page is compact beside the panel.
        .global es_compact_stub
es_compact_stub:
        tst.l 0x460d16f0
        bne.s 1f
        ES_ACTIVE 2f
1:      moveq #-1,%d0
        jmp 0x4004d964
2:      moveq #0,%d0
        jmp 0x4004d964

| 0x400503c4 (8 bytes): the FUNC layer's RIGHT handler (code, edge). In the
| EUCLID mode it opens the page; otherwise stock (in grid recording it
| shifts the track's trigs).
| Trig shift entry 0x400502f8 (FUNC+LEFT/RIGHT in grid recording; args on
| the stack, nothing live in scratch registers): skip on an EUC track.
        .global es_shift_stub
es_shift_stub:
        jsr es_shift_blocked
        tst.l %d0
        beq.s 1f
        rts
1:      move.l %d3,-(%sp)
        move.l %d2,-(%sp)
        movea.l 12(%sp),%a1
        jmp 0x40050300

        .global es_fright_stub
es_fright_stub:
        move.l 8(%sp),-(%sp)
        jsr es_func_right
        addq.l #4,%sp
        tst.l %d0
        beq.s 1f
        rts
1:      move.l 4(%sp),%d1
        move.l 8(%sp),%d0
        jmp 0x400503cc

        .data
        .balign 4
        .global es_tte_layer, es_page_layer

| TRACK TRIG EDIT's own layer: the window's five key bindings (stock handler
| addresses, 1.40C 0x400d0154: UP and DOWN repeat after 15 then every 5
| ticks), one added RIGHT record, and the stock encoder table as is.
es_tte_layer:
        .long 0,es_tte_keys,0x400d01f0,0,0
es_tte_keys:
        .byte 0x33,0
        .long 0x4007bff8,0,0x4007bff8,0,0
        .word 15,5
        .byte 0x20,0
        .long 0x4007bfa0,0,0x4007bfa0,0,0
        .word 15,5
        .byte 0x31,0
        .long 0x4007b4d8,0,0,0,0
        .word 0,0
        .byte 0x32,0
        .long 0x4007b4d4,0,0,0,0
        .word 0,0
        .byte 0x2d,0
        .long 0x4007bf6c,0x4007bf6c,0,0,0
        .word 0,0
        .byte 0x21,0
        .long es_tte_right,0,0,0,0
        .word 0,0
        .byte 0xff,0
        .long 0,0,0,0,0
        .word 0,0

| The EUCLID page: YES toggles EUC, NO closes, UP/DOWN are held.
| A-F and LEVEL edit the settings.
es_page_layer:
        .long 0,es_page_keys,es_page_encs,0,0,-1,-1
es_page_keys:
        .irp k,0x31,0x32,0x33,0x20
        .byte \k,0
        .long es_key,es_key,es_key,0,0
        .word 0,0
        .endr
        .byte 0xff,0
        .long 0,0,0,0,0
        .word 0,0
es_page_encs:
        .irp k,0,1,2,3,4,5,6
        .byte \k,0
        .long es_knob,0,0,0,0
        .endr
        .byte 0xff,0
        .long 0,0,0,0,0

| The TRIG MODE list's tables with a seventh entry. Rows 0-5 name the stock
| mode values, names and icon records by address; row 6 is EUCLID.
        .global es_modes, es_names, es_icons
es_modes:
        .long 0,1,2,3,4,5,6
es_names:
        .long 0x400b5f4b,0x400b5366,0x400b5370,0x400b6cb9,0x400b5376,0x400b5381,es_name
es_icons:
        .long 0x400beaaa,0x400beae6,0x400bea82,0x400bea96,0x400beabe,0x400bead2,es_icon
| Icon record as the stock ones: width 12, height 5, one long per column,
| the column bits, the mask. The picture: E(5,12) as full-height bars,
| the other steps as a centre dot.
es_icon:
        .long 12,5,1,es_icon_bits,es_icon_mask
es_icon_bits:
        .long 0xf8000000,0x20000000,0x20000000,0xf8000000,0x20000000,0xf8000000
        .long 0x20000000,0x20000000,0xf8000000,0x20000000,0xf8000000,0x20000000
es_icon_mask:
        .rept 12
        .long 0xf8000000
        .endr
es_name:
        .asciz "EUCLID"
        .balign 4
