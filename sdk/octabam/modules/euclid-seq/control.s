#NO_APP
	.file	"euclid_seq.c"
	.text
	.align	2
	.type	entry, @function
entry:
	move.l 1187521622,%d0
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	cmp.l #1074667999,%d0
	jls .L4
	add.l #-1074668000,%d0
	move.l %d0,%d1
	move.l #635712,%d2
	remu.l %d2,%d3:%d1
	divu.l %d2,%d1
	tst.l %d3
	jne .L4
	cmp.l #10171391,%d0
	jhi .L4
	mvz.b 269161680,%d0
	moveq #15,%d2
	cmp.l %d0,%d2
	jcs .L5
	mov3q.l #7,%d3
	cmp.l 12(%sp),%d3
	jcs .L5
	tst.l -2147483630
	jne .L5
	lsl.l #4,%d1
	add.l %d0,%d1
	lsl.l #3,%d1
	move.l 12(%sp),%d0
	add.l %d1,%d0
	mvz.w %d0,%d0
	lsl.l #3,%d0
	add.l #settings,%d0
	move.l %d0,%a0
	tst.b (%a0)
	jlt .L1
	clr.w %d1
	clr.b %d2
	move.l #-2147221504,(%a0)
	move.w %d1,4(%a0)
	move.b %d2,6(%a0)
.L1:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L4:
	move.b 269161680,%d0
.L5:
	move.l (%sp)+,%d2
	clr.l %d0
	move.l (%sp)+,%d3
	rts
	.size	entry, .-entry
	.align	2
	.globl	es_close_cb
	.type	es_close_cb, @function
es_close_cb:
	tst.l es_window
	jeq .L9
	pea es_window
	jsr 1074093492
	pea es_page_layer
	jsr 1073943660
	clr.l es_window
	mov3q.l #1,1187497772
	mov3q.l #-1,-(%sp)
	jsr 1074059592
	lea (12,%sp),%sp
.L9:
	rts
	.size	es_close_cb, .-es_close_cb
	.section	.rodata.str1.1,"aMS",@progbits,1
.LC0:
	.string	"EUC:ON"
.LC1:
	.string	"EUC:OFF"
.LC2:
	.string	"OP:"
	.text
	.align	2
	.type	draw, @function
draw:
	lea (-76,%sp),%sp
	movem.l #31868,(%sp)
	tst.l es_window
	jne .L30
.L13:
	movem.l (%sp),#31868
	lea (76,%sp),%sp
	rts
.L30:
	mvz.b 269161676,%d3
	move.l %d3,-(%sp)
	jsr entry
	move.l es_window,%d2
	add.l #36,%d2
	move.l %d2,-(%sp)
	move.l %d0,%a4
	jsr 1073960572
	addq.l #8,%sp
	tst.l %a4
	jeq .L13
	move.l es_window,%a0
	mvz.w #36437,%d1
	move.l 40(%a0),44(%sp)
	move.l 1187521622,%a0
	mvz.b 269161680,%d0
	mulu.w #36568,%d0
	add.l %d0,%a0
	tst.b (%a0,%d1.l)
	jeq .L15
	mulu.w #2330,%d3
	move.b 80(%a0,%d3.l),%d0
.L16:
	mvz.b 1(%a4),%d1
	mvz.b %d0,%d0
	move.l %d1,52(%sp)
	mvz.b 2(%a4),%d1
	move.l %d1,56(%sp)
	moveq #64,%d1
	cmp.l %d0,%d1
	jcc .L17
	moveq #64,%d0
.L17:
	move.l %d0,60(%sp)
	sub.l %a6,%a6
	mvz.b 3(%a4),%d0
	move.l 44(%sp),%a0
	lea names,%a3
	lea (52,%sp),%a2
	move.l %d0,64(%sp)
	mvz.b 4(%a4),%d0
	lea (-22,%a0),%a0
	move.l %a0,40(%sp)
	move.l %d0,68(%sp)
	mvz.b 5(%a4),%d0
	move.l %d0,72(%sp)
.L20:
	mov3q.l #3,%d3
	move.l %a6,%d0
	moveq #99,%d4
	remu.l %d3,%d1:%d0
	divu.l %d3,%d0
	move.l (%a3)+,-(%sp)
	mov3q.l #-1,-(%sp)
	move.l 48(%sp),%d3
	mvs.w %d0,%d0
	muls.w #34,%d1
	lsl.l #4,%d0
	move.l %d1,%a5
	sub.l %d0,%d3
	move.l %d3,-(%sp)
	pea 6(%a5)
	move.l %d2,-(%sp)
	move.l #1074505846,-(%sp)
	jsr 1073818584
	lea (24,%sp),%sp
	move.l (%a2)+,%a1
	mov3q.l #2,%d1
	move.l %a1,%d0
	lea (49,%sp),%a0
	cmp.l %a1,%d4
	jcc .L18
	moveq #99,%d0
.L18:
	moveq #9,%d5
	cmp.l %a1,%d5
	jcc .L22
	move.l %d0,%d4
	moveq #10,%d6
	divu.l %d6,%d4
	add.l #48,%d4
	move.b %d4,48(%sp)
.L19:
	moveq #10,%d6
	remu.l %d6,%d4:%d0
	clr.b %d5
	move.l %d4,%d0
	add.l #48,%d0
	move.b %d0,(%a0)
	move.l #1073818584,%a0
	move.b %d5,48(%sp,%d1.l)
	pea 48(%sp)
	mov3q.l #-1,-(%sp)
	move.l %d3,-(%sp)
	pea 24(%a5)
	move.l %d2,-(%sp)
	move.l #1074505846,-(%sp)
	jsr (%a0)
	addq.l #1,%a6
	lea (24,%sp),%sp
	mov3q.l #6,%d0
	cmp.l %a6,%d0
	jne .L20
	pea .LC2
	move.l #1073818584,%a0
	mov3q.l #-1,-(%sp)
	move.l 52(%sp),%d3
	add.l #-54,%d3
	move.l %d3,-(%sp)
	mov3q.l #6,-(%sp)
	move.l %d2,-(%sp)
	move.l #1074505846,-(%sp)
	jsr (%a0)
	move.b 6(%a4),%d0
	mov3q.l #3,%d1
	lea ops,%a0
	and.l %d1,%d0
	move.l (%a0,%d0.l*4),-(%sp)
	mov3q.l #-1,-(%sp)
	move.l #1073818584,%a0
	move.l %d3,-(%sp)
	pea 22.w
	move.l %d2,-(%sp)
	move.l #1074505846,-(%sp)
	jsr (%a0)
	lea (48,%sp),%sp
	move.b (%a4),%d0
	btst #0,%d0
	jeq .L23
	move.l #.LC0,%d0
	move.l %d0,-(%sp)
	mov3q.l #-1,-(%sp)
	move.l %d3,-(%sp)
	pea 64.w
	move.l %d2,-(%sp)
	move.l #1074505846,-(%sp)
	jsr 1073818584
	mov3q.l #1,1187497772
	lea (24,%sp),%sp
.L31:
	movem.l (%sp),#31868
	lea (76,%sp),%sp
	rts
.L15:
	mvz.w #36435,%d0
	move.b (%a0,%d0.l),%d0
	jra .L16
.L22:
	lea (48,%sp),%a0
	mov3q.l #1,%d1
	jra .L19
.L23:
	move.l #.LC1,%d0
	move.l %d0,-(%sp)
	mov3q.l #-1,-(%sp)
	move.l %d3,-(%sp)
	pea 64.w
	move.l %d2,-(%sp)
	move.l #1074505846,-(%sp)
	jsr 1073818584
	mov3q.l #1,1187497772
	lea (24,%sp),%sp
	jra .L31
	.size	draw, .-draw
	.align	2
	.globl	es_mask
	.type	es_mask, @function
es_mask:
	lea (-36,%sp),%sp
	movem.l #7420,(%sp)
	move.l 40(%sp),%a1
	move.l 44(%sp),%a2
	move.l %a2,%d1
	move.l %a2,%a0
	addq.l #8,%d1
	mvz.b (%a1),%d0
.L33:
	clr.b (%a0)+
	cmp.l %a0,%d1
	jne .L33
	tst.l %d0
	jeq .L32
	moveq #64,%d1
	cmp.l %d0,%d1
	jcs .L61
	mvz.b 5(%a1),%d1
	move.l %d0,%d4
	clr.l %d3
	remu.l %d0,%d2:%d1
	sub.l %d2,%d4
.L46:
	mvz.b 1(%a1),%d1
	cmp.l %d1,%d0
	jcc .L36
	move.l %d0,%d1
.L36:
	move.l %d4,%d2
	add.l %d3,%d2
	remu.l %d0,%d7:%d2
	move.l %d7,%a0
	add.l %d0,%a0
	tst.l %d1
	jeq .L47
	mvz.b 3(%a1),%d2
	remu.l %d0,%d7:%d2
	move.l %a0,%d2
	sub.l %d7,%d2
	move.l %d2,%d7
	remu.l %d0,%d5:%d7
	move.l %d5,%d2
	mulu.w %d1,%d2
	remu.l %d0,%d7:%d2
	cmp.l %d1,%d7
	scs %d2
	mvs.b %d2,%d2
	neg.l %d2
.L37:
	mvz.b 2(%a1),%d1
	cmp.l %d1,%d0
	jcc .L38
	move.l %d0,%d1
.L38:
	tst.l %d1
	jne .L39
	mvz.b 6(%a1),%d5
	mov3q.l #2,%d6
	cmp.l %d5,%d6
	jeq .L40
	clr.l %d7
.L41:
	mov3q.l #3,%d1
	cmp.l %d5,%d1
	jeq .L43
	subq.l #1,%d5
	tst.l %d5
	jne .L44
	eor.l %d7,%d2
.L45:
	tst.l %d2
	jeq .L40
	mov3q.l #7,%d7
	and.l %d3,%d7
	move.l %d3,%d1
	lsr.l #3,%d1
	mov3q.l #7,%a0
	sub.l %d1,%a0
	mov3q.l #1,%d1
	move.b (%a2,%a0.l),%d2
	lsl.l %d7,%d1
	or.l %d2,%d1
	move.b %d1,(%a2,%a0.l)
.L40:
	addq.l #1,%d3
	cmp.l %d0,%d3
	jne .L46
.L32:
	movem.l (%sp),#7420
	lea (36,%sp),%sp
	rts
.L39:
	mvz.b 4(%a1),%d6
	mvz.b 6(%a1),%d5
	remu.l %d0,%d7:%d6
	move.l %a0,%d6
	sub.l %d7,%d6
	remu.l %d0,%d7:%d6
	move.w %d7,%d6
	mulu.w %d1,%d6
	remu.l %d0,%d7:%d6
	mov3q.l #2,%d6
	cmp.l %d1,%d7
	scs %d1
	mvs.b %d1,%d1
	neg.l %d1
	move.l %d1,%d7
	cmp.l %d5,%d6
	jne .L41
	and.l %d1,%d2
	jra .L45
.L47:
	clr.l %d2
	jra .L37
.L44:
	or.l %d7,%d2
	jra .L45
.L43:
	mov3q.l #1,%d1
	eor.l %d1,%d7
	and.l %d7,%d2
	jra .L45
.L61:
	mvz.b 5(%a1),%d1
	moveq #64,%d0
	clr.l %d3
	move.l %d0,%d4
	remu.l %d0,%d2:%d1
	sub.l %d2,%d4
	jra .L46
	.size	es_mask, .-es_mask
	.align	2
	.type	apply.isra.0, @function
apply.isra.0:
	link.w %fp,#-72
	movem.l #15612,(%sp)
	move.l 8(%fp),-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L62
	move.l %d0,%a0
	move.b (%a0),%d1
	btst #0,%d1
	jne .L112
.L62:
	movem.l -72(%fp),#15612
	unlk %fp
	rts
.L112:
	move.l 1187521622,%a1
	move.w 10(%fp),%d3
	move.l %a1,-20(%fp)
	move.l #36437,%a1
	move.b 269161680,%d1
	move.l 1187521622,%a0
	mvz.b 269161680,%d2
	mulu.w #36568,%d2
	mulu.w #2330,%d3
	add.l %d2,%a0
	tst.b (%a0,%a1.l)
	jeq .L64
	move.b 80(%a0,%d3.l),%d2
	jeq .L62
.L114:
	mvz.b %d1,%d1
	mvz.b %d2,%d4
	move.l #268525902,%a0
	move.l -20(%fp),%d5
	mulu.w #36568,%d1
	move.l %d1,%a3
	add.l %d3,%a3
	add.l %a3,%a0
	move.l %a0,-24(%fp)
	moveq #64,%d1
	add.l %a3,%d5
	cmp.l %d4,%d1
	jcc .L66
	moveq #64,%d2
.L66:
	move.l %d0,%a0
	move.l %d5,%a2
	move.b 1(%a0),-14(%fp)
	move.b 2(%a0),-13(%fp)
	move.b 3(%a0),-12(%fp)
	move.b 4(%a0),-11(%fp)
	move.b 5(%a0),-10(%fp)
	move.b 6(%a0),-9(%fp)
	pea -8(%fp)
	pea -15(%fp)
	move.b %d2,-15(%fp)
	jsr es_mask
	addq.l #8,%sp
	move.l %d5,%a4
	move.l %d5,%d2
	addq.l #8,%d2
	move.l #268525902,%a1
	sub.l %a5,%a5
	sub.l -20(%fp),%a1
	move.l %d5,%d0
	add.l #268528105,%a3
	lea (2203,%a2),%a2
	add.l #121,%d0
	clr.l %d1
	lea (32,%a4),%a4
	move.l %d2,-28(%fp)
.L80:
	mov3q.l #7,%d7
	and.l %d1,%d7
	move.l %d1,%d2
	lsr.l #3,%d2
	mov3q.l #7,%a0
	sub.l %d2,%a0
	mov3q.l #1,%d2
	move.b -8(%fp,%a0.l),%d4
	move.l %a0,-32(%fp)
	add.l %d5,%a0
	lsl.l %d7,%d2
	move.b (%a0),%d3
	and.l %d2,%d4
	and.l %d2,%d3
	tst.b %d4
	jeq .L67
	tst.b %d3
	jeq .L113
.L74:
	addq.l #1,%d1
	addq.l #2,%a2
	addq.l #2,%a3
	add.l #32,%d0
	moveq #64,%d2
	cmp.l %d1,%d2
	jne .L80
.L115:
	tst.l %a5
	jeq .L62
	move.l -20(%fp),%a0
	add.l #635698,%a0
	mov3q.l #1,(%a0)
	mov3q.l #1,269452696
	jsr 1073905152
	jsr 1073953240
	move.l 8(%fp),-(%sp)
	jsr 1074387488
	movem.l -72(%fp),#15612
	mov3q.l #1,1187497772
	addq.l #4,%sp
	unlk %fp
	rts
.L64:
	move.l #36435,%a1
	move.b (%a0,%a1.l),%d2
	jeq .L62
	jra .L114
.L113:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	or.l %d2,%d3
	mvz.b %d3,%d7
	cmp.l %d7,%d4
	jeq .L69
	move.b %d3,(%a0)
	move.l -24(%fp),%a0
	move.l -32(%fp),%d4
	move.b %d3,(%a0,%d4.l)
.L69:
	move.l -32(%fp),%d7
	not.l %d2
	move.l -28(%fp),%a0
	lea (%a4,%d7.l),%a5
	move.b %d2,%d7
	add.l -32(%fp),%a0
.L71:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	and.l %d7,%d3
	mvz.b %d3,%d2
	cmp.l %d2,%d4
	jeq .L70
	move.b %d3,(%a0)
	move.b %d3,(%a1,%a0.l)
.L70:
	addq.l #8,%a0
	cmp.l %a0,%a5
	jne .L71
	move.l %a2,%a0
	tst.b -(%a0)
	jeq .L72
	clr.b %d2
	clr.b (%a0)
	move.b %d2,-1(%a3)
.L72:
	tst.b (%a2)
	jeq .L75
	clr.b (%a2)
	clr.b (%a3)
.L75:
	mov3q.l #1,%a5
	addq.l #1,%d1
	addq.l #2,%a2
	addq.l #2,%a3
	add.l #32,%d0
	moveq #64,%d2
	cmp.l %d1,%d2
	jne .L80
	jra .L115
.L67:
	tst.b %d3
	jeq .L74
	move.l -32(%fp),%d7
	not.l %d2
	lea (%a4,%d7.l),%a5
	move.b %d2,%d7
.L77:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	and.l %d7,%d3
	mvz.b %d3,%d2
	cmp.l %d2,%d4
	jeq .L76
	move.b %d3,(%a0)
	move.b %d3,(%a1,%a0.l)
.L76:
	addq.l #8,%a0
	cmp.l %a0,%a5
	jne .L77
	move.l %d0,%a0
	lea (-32,%a0),%a0
.L79:
	mvz.b (%a0),%d2
	cmp.l #255,%d2
	jeq .L78
	st %d4
	move.b #-1,(%a0)
	move.b %d4,(%a1,%a0.l)
.L78:
	addq.l #1,%a0
	cmp.l %a0,%d0
	jne .L79
	tst.b (%a2)
	jeq .L75
	clr.b (%a2)
	clr.b (%a3)
	jra .L75
	.size	apply.isra.0, .-apply.isra.0
	.align	2
	.globl	es_length_changed
	.type	es_length_changed, @function
es_length_changed:
	move.l %a2,-(%sp)
	move.l %d2,-(%sp)
	clr.l %d2
	lea (apply.isra.0),%a2
.L117:
	move.l %d2,-(%sp)
	jsr (%a2)
	addq.l #1,%d2
	addq.l #4,%sp
	moveq #8,%d0
	cmp.l %d2,%d0
	jne .L117
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	rts
	.size	es_length_changed, .-es_length_changed
	.align	2
	.globl	es_led_sync
	.type	es_led_sync, @function
es_led_sync:
	lea (-16,%sp),%sp
	movem.l #60,(%sp)
	tst.l 1187565964
	jeq .L121
	move.l -2147483440,%d0
	mov3q.l #2,%d1
	cmp.l %d0,%d1
	jcs .L141
	lea (levels.1),%a0
	move.l 1175263030,%d5
	mvz.b (%a0,%d0.l),%d3
	tst.l %d5
	jne .L142
.L134:
	clr.l %d0
	cmp.l led_shown.l,%d5
	jeq .L143
.L129:
	mvz.w #1888,%d1
	cmp.l 1074501324.l,%d1
	jcs .L121
.L144:
	tst.l %d0
	jeq .L130
	move.l %d3,%d4
	clr.l %d2
.L132:
	move.l %d4,-(%sp)
	clr.l -(%sp)
	move.l %d3,-(%sp)
	mov3q.l #1,-(%sp)
	move.l %d2,-(%sp)
	jsr 1073820520
	addq.l #2,%d2
	lea (20,%sp),%sp
	moveq #32,%d0
	cmp.l %d2,%d0
	jne .L132
	move.l %d5,led_shown
	move.l %d3,led_level
.L121:
	movem.l (%sp),#60
	lea (16,%sp),%sp
	rts
.L141:
	mov3q.l #2,%d0
	lea (levels.1),%a0
	move.l 1175263030,%d5
	mvz.b (%a0,%d0.l),%d3
	tst.l %d5
	jeq .L134
	jra .L142
.L143:
	cmp.l led_level.l,%d3
	jeq .L121
	mvz.w #1888,%d1
	cmp.l 1074501324.l,%d1
	jcc .L144
	jra .L121
.L142:
	move.b 269161676,%d2
	move.l 1187521622,%d0
	cmp.l #1074667999,%d0
	jls .L126
	add.l #-1074668000,%d0
	move.l %d0,%d1
	move.l #635712,%d4
	remu.l %d4,%d5:%d1
	divu.l %d4,%d1
	tst.l %d5
	jne .L126
	cmp.l #10171391,%d0
	jhi .L126
	mvz.b 269161680,%d0
	moveq #15,%d4
	cmp.l %d0,%d4
	jcs .L134
	mvz.b %d2,%d2
	mov3q.l #7,%d4
	cmp.l %d2,%d4
	jcs .L134
	tst.l -2147483630
	jne .L134
	lsl.l #4,%d1
	lea settings,%a0
	add.l %d1,%d0
	mvz.w %d0,%d0
	lsl.l #3,%d0
	add.l %d2,%d0
	lsl.l #3,%d0
	move.b (%a0,%d0.l),%d5
	mov3q.l #1,%d0
	and.l %d0,%d5
	move.l %d5,%d0
	cmp.l led_shown.l,%d5
	jne .L129
	jra .L143
.L130:
	clr.l %d4
	clr.l %d2
	jra .L132
.L126:
	move.b 269161680,%d0
	clr.l %d5
	clr.l %d0
	cmp.l led_shown.l,%d5
	jne .L129
	jra .L143
	.size	es_led_sync, .-es_led_sync
	.align	2
	.globl	es_rec_blocked
	.type	es_rec_blocked, @function
es_rec_blocked:
	move.l 1187521622,%d1
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	cmp.l #1074667999,%d1
	jls .L148
	add.l #-1074668000,%d1
	move.l %d1,%d2
	move.l #635712,%d3
	remu.l %d3,%d0:%d2
	divu.l %d3,%d2
	move.l %d2,%a0
	tst.l %d0
	jne .L148
	cmp.l #10171391,%d1
	jhi .L148
	mvz.b 269161680,%d1
	moveq #15,%d2
	cmp.l %d1,%d2
	jcs .L145
	mov3q.l #7,%d3
	cmp.l 12(%sp),%d3
	jcs .L145
	tst.l -2147483630
	jne .L145
	move.l %a0,%d0
	lsl.l #4,%d0
	lea settings,%a0
	add.l %d1,%d0
	mvz.w %d0,%d0
	mov3q.l #1,%d1
	lsl.l #3,%d0
	add.l 12(%sp),%d0
	lsl.l #3,%d0
	move.b (%a0,%d0.l),%d0
	and.l %d1,%d0
.L145:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L148:
	move.b 269161680,%d0
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	clr.l %d0
	rts
	.size	es_rec_blocked, .-es_rec_blocked
	.align	2
	.globl	es_blocked
	.type	es_blocked, @function
es_blocked:
	move.l 1175263030,%d0
	tst.l %d0
	jeq .L153
	tst.l 1175352268
	jeq .L155
	tst.l 1175352292
	jne .L156
.L155:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L156
	move.l %d0,%a0
	mov3q.l #1,%d1
	move.b (%a0),%d0
	and.l %d1,%d0
.L153:
	rts
.L156:
	clr.l %d0
	rts
	.size	es_blocked, .-es_blocked
	.section	.rodata.str1.1
.LC3:
	.string	"EUCLID"
	.text
	.align	2
	.globl	es_tte_right
	.type	es_tte_right, @function
es_tte_right:
	mov3q.l #1,%d0
	cmp.l 8(%sp),%d0
	jeq .L184
.L171:
	rts
.L184:
	tst.l 1175352268
	jeq .L171
	move.l 1175352292,%d0
	or.l es_window,%d0
	jne .L171
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L171
	pea es_close_cb
	mov3q.l #1,-(%sp)
	clr.l -(%sp)
	mov3q.l #-1,-(%sp)
	pea 58.w
	pea 110.w
	jsr 1074102940
	lea (24,%sp),%sp
	tst.l %d0
	jeq .L171
	clr.l -(%sp)
	pea .LC3
	move.l %d0,-(%sp)
	move.l %d0,es_window
	jsr 1074098360
	pea es_page_layer
	clr.l es_page_layer
	jsr 1073943700
	lea (16,%sp),%sp
	jra draw
	.size	es_tte_right, .-es_tte_right
	.align	2
	.globl	es_key
	.type	es_key, @function
es_key:
	move.l %d2,-(%sp)
	move.l 12(%sp),%d0
	tst.l es_window
	jeq .L185
	moveq #50,%d1
	cmp.l 8(%sp),%d1
	jeq .L193
	mov3q.l #1,%d2
	cmp.l %d0,%d2
	jeq .L194
.L185:
	move.l (%sp)+,%d2
	rts
.L194:
	moveq #49,%d0
	cmp.l 8(%sp),%d0
	jne .L185
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L185
	move.l %d0,%a0
	move.b (%a0),%d1
	eor.l %d2,%d1
	move.b %d1,(%a0)
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr (apply.isra.0)
	addq.l #4,%sp
	move.l (%sp)+,%d2
	jra draw
.L193:
	tst.l %d0
	jne .L185
	pea es_window
	jsr 1074093492
	pea es_page_layer
	jsr 1073943660
	clr.l es_window
	mov3q.l #1,1187497772
	mov3q.l #-1,-(%sp)
	jsr 1074059592
	lea (12,%sp),%sp
	move.l (%sp)+,%d2
	jmp 1074249808
	.size	es_key, .-es_key
	.align	2
	.globl	es_knob
	.type	es_knob, @function
es_knob:
	lea (-16,%sp),%sp
	move.l %a2,-(%sp)
	move.l %d2,-(%sp)
	move.l 28(%sp),%a0
	move.l 32(%sp),%d1
	tst.l es_window
	jeq .L195
	mov3q.l #6,%d0
	cmp.l %a0,%d0
	jcs .L195
	mov3q.l #2,%d2
	cmp.l %a0,%d2
	jeq .L195
	mvz.b 269161676,%d2
	move.l %d2,20(%sp)
	move.l %d2,-(%sp)
	move.l %d1,12(%sp)
	move.l %a0,16(%sp)
	jsr entry
	addq.l #4,%sp
	move.l 8(%sp),%d1
	move.l 12(%sp),%a0
	tst.l %d0
	jeq .L195
	move.l 1187521622,%a1
	move.l #36437,%a2
	mvz.b 269161680,%d2
	move.l %d2,16(%sp)
	mulu.w #36568,%d2
	add.l %d2,%a1
	tst.b (%a1,%a2.l)
	jeq .L197
	move.w 22(%sp),%d2
	mulu.w #2330,%d2
	move.b 80(%a1,%d2.l),%d2
	move.w %d2,%a1
.L198:
	mov3q.l #6,%d2
	cmp.l %a0,%d2
	jeq .L204
	move.w %a1,%d2
	mvz.b %d2,%d2
	move.l %d2,%a1
	moveq #64,%d2
	cmp.l %a1,%d2
	jcc .L200
	move.w #64,%a1
.L200:
	mov3q.l #1,%d2
	cmp.l %a0,%d2
	jcc .L199
	subq.l #1,%a1
	tst.l %a1
	jlt .L213
.L199:
	lea (field.0),%a2
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jlt .L214
.L202:
	cmp.l %d1,%a1
	jge .L203
	move.l %a1,%d1
.L203:
	mvz.b %d1,%d2
	cmp.l %d0,%d2
	jeq .L195
	move.b %d1,(%a0)
	move.l 20(%sp),-(%sp)
	jsr (apply.isra.0)
	addq.l #4,%sp
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	lea (16,%sp),%sp
	jra draw
.L195:
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	lea (16,%sp),%sp
	rts
.L214:
	clr.l %d1
	jra .L202
.L197:
	mvz.w #36435,%d2
	move.b (%a1,%d2.l),%d2
	move.w %d2,%a1
	jra .L198
.L204:
	lea (field.0),%a2
	mov3q.l #3,%a1
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jge .L202
	jra .L214
.L213:
	lea (field.0),%a2
	sub.l %a1,%a1
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jge .L202
	jra .L214
	.size	es_knob, .-es_knob
	.section	.rodata
	.type	field.0, @object
	.size	field.0, 7
field.0:
	.base64	"AQIAAwQFBg=="
	.type	levels.1, @object
	.size	levels.1, 3
levels.1:
	.ascii	"\f0D"
	.section	.rodata.str1.1
.LC4:
	.string	"PL1"
.LC5:
	.string	"PL2"
.LC6:
	.string	"LEN"
.LC7:
	.string	"RO1"
.LC8:
	.string	"RO2"
.LC9:
	.string	"TRO"
	.section	.rodata
	.align	2
	.type	names, @object
	.size	names, 24
names:
	.long	.LC4
	.long	.LC5
	.long	.LC6
	.long	.LC7
	.long	.LC8
	.long	.LC9
	.section	.rodata.str1.1
.LC10:
	.string	"OR"
.LC11:
	.string	"XOR"
.LC12:
	.string	"AND"
.LC13:
	.string	"SUB"
	.section	.rodata
	.align	2
	.type	ops, @object
	.size	ops, 16
ops:
	.long	.LC10
	.long	.LC11
	.long	.LC12
	.long	.LC13
	.data
	.align	2
	.type	led_level, @object
	.size	led_level, 4
led_level:
	.zero	4
	.align	2
	.type	led_shown, @object
	.size	led_shown, 4
led_shown:
	.zero	4
	.align	2
	.type	es_window, @object
	.size	es_window, 4
es_window:
	.zero	4
	.type	settings, @object
	.size	settings, 16384
settings:
	.zero	16384

#APP
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
