#NO_APP
	.file	"euclid_seq.c"
	.text
	.align	2
	.type	nv_ensure, @function
nv_ensure:
	mvz.b 269455360,%d0
	moveq #69,%d1
	cmp.l %d0,%d1
	jne .L7
	mvz.b 269455361,%d0
	moveq #83,%d1
	cmp.l %d0,%d1
	jne .L7
	mvz.b 269455362,%d0
	moveq #78,%d1
	cmp.l %d0,%d1
	jne .L7
	mvz.b 269455363,%d0
	moveq #49,%d1
	cmp.l %d0,%d1
	jne .L7
	rts
.L7:
	move.l #269455376,%a0
.L4:
	clr.b (%a0)+
	cmp.l #269471760,%a0
	jne .L4
	moveq #69,%d0
	moveq #83,%d1
	move.b %d0,269455360
	move.b %d1,269455361
	moveq #78,%d0
	moveq #49,%d1
	move.b %d0,269455362
	move.b %d1,269455363
	rts
	.size	nv_ensure, .-nv_ensure
	.align	2
	.globl	es_close_cb
	.type	es_close_cb, @function
es_close_cb:
	tst.l es_window
	jeq .L14
	pea es_window
	jsr 1074093492
	pea es_page_layer
	jsr 1073943660
	clr.l es_window
	mov3q.l #1,1187497772
	mov3q.l #-1,-(%sp)
	jsr 1074059592
	lea (12,%sp),%sp
.L14:
	rts
	.size	es_close_cb, .-es_close_cb
	.align	2
	.type	step_bar, @function
step_bar:
	lea (-40,%sp),%sp
	movem.l #15612,(%sp)
	move.l 1187521622,%a0
	move.w 58(%sp),%d2
	mvz.w #36437,%d1
	move.l 44(%sp),%a5
	move.l 52(%sp),%d6
	mvz.b 269161680,%d0
	mulu.w #2330,%d2
	mulu.w #36568,%d0
	add.l %d0,%a0
	tst.b (%a0,%d1.l)
	jeq .L19
	move.b 80(%a0,%d2.l),%d4
.L20:
	mvz.b %d4,%d4
	moveq #64,%d0
	cmp.l %d4,%d0
	jcc .L21
	moveq #64,%d4
.L21:
	move.l 1175263052,%d0
	moveq #63,%d1
	cmp.l %d0,%d1
	jcc .L22
	clr.l %d0
.L22:
	move.l 1187521622,%a3
	move.l %d2,%a2
	mvz.b 269161680,%d1
	clr.l %d5
	clr.l %d3
	addq.l #7,%a2
	mulu.w #36568,%d1
	add.l %d1,%a3
.L23:
	mov3q.l #7,%d1
	mov3q.l #1,%d7
	move.l %d0,%d2
	lsr.l #3,%d2
	and.l %d0,%d1
	lsl.l %d3,%d7
	cmp.l %d0,%d4
	jls .L25
	move.l %a2,%a0
	sub.l %d2,%a0
	addq.l #1,%d3
	addq.l #1,%d0
	mvz.b (%a3,%a0.l),%d2
	btst %d1,%d2
	jeq .L24
	or.l %d7,%d5
.L24:
	moveq #16,%d1
	cmp.l %d3,%d1
	jne .L23
.L25:
	move.l 48(%sp),%d4
	move.l %d6,%a2
	clr.l %d2
	addq.l #3,%a2
.L29:
	move.l %d2,%d0
	lsr.l #2,%d0
	cmp.l %d3,%d2
	jcc .L27
	add.l %d4,%d0
	move.l %d0,%d1
	addq.l #1,%d1
	btst %d2,%d5
	jeq .L28
	mov3q.l #1,-(%sp)
	move.l %d6,-(%sp)
	move.l %d1,-(%sp)
	move.l %a2,-(%sp)
	move.l %d0,-(%sp)
	move.l %a5,-(%sp)
	jsr 1073816148
	lea (24,%sp),%sp
.L27:
	addq.l #1,%d2
	addq.l #3,%d4
	moveq #16,%d0
	cmp.l %d2,%d0
	jne .L29
.L40:
	movem.l (%sp),#15612
	lea (40,%sp),%sp
	rts
.L28:
	mov3q.l #1,-(%sp)
	move.l %d6,-(%sp)
	move.l %d1,-(%sp)
	move.l %d6,-(%sp)
	move.l %d0,-(%sp)
	move.l %a5,-(%sp)
	jsr 1073816148
	lea (24,%sp),%sp
	addq.l #1,%d2
	addq.l #3,%d4
	moveq #16,%d0
	cmp.l %d2,%d0
	jne .L29
	jra .L40
.L19:
	mvz.w #36435,%d0
	move.b (%a0,%d0.l),%d4
	jra .L20
	.size	step_bar, .-step_bar
	.align	2
	.type	fmt0, @function
fmt0:
	move.l %d3,-(%sp)
	move.l shown,%d1
	move.l %d1,%d0
	move.l %d2,-(%sp)
	moveq #99,%d2
	move.l 12(%sp),%a0
	cmp.l %d1,%d2
	jcc .L42
	moveq #99,%d0
.L42:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L44
	move.l %d0,%d1
	moveq #10,%d3
	divu.l %d3,%d1
	move.l %a0,%a1
	moveq #10,%d3
	mov3q.l #2,%d2
	add.l #48,%d1
	move.b %d1,(%a1)+
	remu.l %d3,%d1:%d0
	clr.b %d0
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L44:
	moveq #10,%d3
	mov3q.l #1,%d2
	remu.l %d3,%d1:%d0
	clr.b %d0
	move.l %a0,%a1
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
	.size	fmt0, .-fmt0
	.align	2
	.type	fmt1, @function
fmt1:
	move.l %d3,-(%sp)
	move.l shown+4,%d1
	move.l %d1,%d0
	move.l %d2,-(%sp)
	moveq #99,%d2
	move.l 12(%sp),%a0
	cmp.l %d1,%d2
	jcc .L48
	moveq #99,%d0
.L48:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L50
	move.l %d0,%d1
	moveq #10,%d3
	divu.l %d3,%d1
	move.l %a0,%a1
	moveq #10,%d3
	mov3q.l #2,%d2
	add.l #48,%d1
	move.b %d1,(%a1)+
	remu.l %d3,%d1:%d0
	clr.b %d0
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L50:
	moveq #10,%d3
	mov3q.l #1,%d2
	remu.l %d3,%d1:%d0
	clr.b %d0
	move.l %a0,%a1
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
	.size	fmt1, .-fmt1
	.align	2
	.type	fmt2, @function
fmt2:
	move.l %d3,-(%sp)
	move.l shown+8,%d1
	move.l %d1,%d0
	move.l %d2,-(%sp)
	moveq #99,%d2
	move.l 12(%sp),%a0
	cmp.l %d1,%d2
	jcc .L54
	moveq #99,%d0
.L54:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L56
	move.l %d0,%d1
	moveq #10,%d3
	divu.l %d3,%d1
	move.l %a0,%a1
	moveq #10,%d3
	mov3q.l #2,%d2
	add.l #48,%d1
	move.b %d1,(%a1)+
	remu.l %d3,%d1:%d0
	clr.b %d0
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L56:
	moveq #10,%d3
	mov3q.l #1,%d2
	remu.l %d3,%d1:%d0
	clr.b %d0
	move.l %a0,%a1
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
	.size	fmt2, .-fmt2
	.align	2
	.type	fmt3, @function
fmt3:
	move.l %d3,-(%sp)
	move.l shown+12,%d1
	move.l %d1,%d0
	move.l %d2,-(%sp)
	moveq #99,%d2
	move.l 12(%sp),%a0
	cmp.l %d1,%d2
	jcc .L60
	moveq #99,%d0
.L60:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L62
	move.l %d0,%d1
	moveq #10,%d3
	divu.l %d3,%d1
	move.l %a0,%a1
	moveq #10,%d3
	mov3q.l #2,%d2
	add.l #48,%d1
	move.b %d1,(%a1)+
	remu.l %d3,%d1:%d0
	clr.b %d0
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L62:
	moveq #10,%d3
	mov3q.l #1,%d2
	remu.l %d3,%d1:%d0
	clr.b %d0
	move.l %a0,%a1
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
	.size	fmt3, .-fmt3
	.align	2
	.type	fmt4, @function
fmt4:
	move.l %d3,-(%sp)
	move.l shown+16,%d1
	move.l %d1,%d0
	move.l %d2,-(%sp)
	moveq #99,%d2
	move.l 12(%sp),%a0
	cmp.l %d1,%d2
	jcc .L66
	moveq #99,%d0
.L66:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L68
	move.l %d0,%d1
	moveq #10,%d3
	divu.l %d3,%d1
	move.l %a0,%a1
	moveq #10,%d3
	mov3q.l #2,%d2
	add.l #48,%d1
	move.b %d1,(%a1)+
	remu.l %d3,%d1:%d0
	clr.b %d0
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L68:
	moveq #10,%d3
	mov3q.l #1,%d2
	remu.l %d3,%d1:%d0
	clr.b %d0
	move.l %a0,%a1
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
	.size	fmt4, .-fmt4
	.align	2
	.type	fmt5, @function
fmt5:
	move.l %d3,-(%sp)
	move.l shown+20,%d1
	move.l %d1,%d0
	move.l %d2,-(%sp)
	moveq #99,%d2
	move.l 12(%sp),%a0
	cmp.l %d1,%d2
	jcc .L72
	moveq #99,%d0
.L72:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L74
	move.l %d0,%d1
	moveq #10,%d3
	divu.l %d3,%d1
	move.l %a0,%a1
	moveq #10,%d3
	mov3q.l #2,%d2
	add.l #48,%d1
	move.b %d1,(%a1)+
	remu.l %d3,%d1:%d0
	clr.b %d0
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L74:
	moveq #10,%d3
	mov3q.l #1,%d2
	remu.l %d3,%d1:%d0
	clr.b %d0
	move.l %a0,%a1
	add.l #48,%d1
	move.b %d1,(%a1)
	move.b %d0,(%a0,%d2.l)
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
	.size	fmt5, .-fmt5
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
.L78:
	clr.b (%a0)+
	cmp.l %a0,%d1
	jne .L78
	tst.l %d0
	jeq .L77
	moveq #64,%d1
	cmp.l %d0,%d1
	jcs .L106
	mvz.b 5(%a1),%d1
	move.l %d0,%d4
	clr.l %d3
	remu.l %d0,%d2:%d1
	sub.l %d2,%d4
.L91:
	mvz.b 1(%a1),%d1
	cmp.l %d1,%d0
	jcc .L81
	move.l %d0,%d1
.L81:
	move.l %d4,%d2
	add.l %d3,%d2
	remu.l %d0,%d7:%d2
	move.l %d7,%a0
	add.l %d0,%a0
	tst.l %d1
	jeq .L92
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
.L82:
	mvz.b 2(%a1),%d1
	cmp.l %d1,%d0
	jcc .L83
	move.l %d0,%d1
.L83:
	tst.l %d1
	jne .L84
	mvz.b 6(%a1),%d5
	mov3q.l #2,%d6
	cmp.l %d5,%d6
	jeq .L85
	clr.l %d7
.L86:
	mov3q.l #3,%d1
	cmp.l %d5,%d1
	jeq .L88
	subq.l #1,%d5
	tst.l %d5
	jne .L89
	eor.l %d7,%d2
.L90:
	tst.l %d2
	jeq .L85
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
.L85:
	addq.l #1,%d3
	cmp.l %d0,%d3
	jne .L91
.L77:
	movem.l (%sp),#7420
	lea (36,%sp),%sp
	rts
.L84:
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
	jne .L86
	and.l %d1,%d2
	jra .L90
.L92:
	clr.l %d2
	jra .L82
.L89:
	or.l %d7,%d2
	jra .L90
.L88:
	mov3q.l #1,%d1
	eor.l %d1,%d7
	and.l %d7,%d2
	jra .L90
.L106:
	mvz.b 5(%a1),%d1
	moveq #64,%d0
	clr.l %d3
	move.l %d0,%d4
	remu.l %d0,%d2:%d1
	sub.l %d2,%d4
	jra .L91
	.size	es_mask, .-es_mask
	.align	2
	.globl	es_entry_valid
	.type	es_entry_valid, @function
es_entry_valid:
	move.l %d2,-(%sp)
	move.l 8(%sp),%a0
	mvz.b (%a0),%d0
	and.l #-130,%d0
	tst.l %d0
	jne .L111
	mvz.b 1(%a0),%d1
	moveq #64,%d2
	cmp.l %d1,%d2
	jcs .L107
	mvz.b 2(%a0),%d1
	cmp.l %d1,%d2
	jcs .L107
	mvz.b 3(%a0),%d1
	moveq #63,%d2
	cmp.l %d1,%d2
	jcs .L107
	mvz.b 4(%a0),%d1
	cmp.l %d1,%d2
	jcs .L107
	mvz.b 5(%a0),%d1
	cmp.l %d1,%d2
	jcs .L107
	mvz.b 6(%a0),%d1
	mov3q.l #3,%d2
	cmp.l %d1,%d2
	jcs .L107
	tst.b 7(%a0)
	seq %d0
	mvs.b %d0,%d0
	neg.l %d0
.L107:
	move.l (%sp)+,%d2
	rts
.L111:
	move.l (%sp)+,%d2
	clr.l %d0
	rts
	.size	es_entry_valid, .-es_entry_valid
	.align	2
	.type	euc_on, @function
euc_on:
	subq.l #8,%sp
	move.l 1187521622,%d1
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	cmp.l #1074667999,%d1
	jls .L117
	add.l #-1074668000,%d1
	move.l %d1,%d2
	move.l #635712,%d3
	remu.l %d3,%d0:%d2
	divu.l %d3,%d2
	move.l %d2,%a0
	tst.l %d0
	jne .L117
	cmp.l #10171391,%d1
	jhi .L117
	mvz.b 269161680,%d1
	moveq #15,%d2
	cmp.l %d1,%d2
	jcs .L114
	mov3q.l #7,%d3
	cmp.l 20(%sp),%d3
	jcs .L114
	tst.l -2147483630
	jeq .L125
.L114:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	addq.l #8,%sp
	rts
.L125:
	move.l %d1,12(%sp)
	move.l %a0,8(%sp)
	jsr nv_ensure
	move.l 8(%sp),%d0
	move.l 20(%sp),%a0
	add.l #33681922,%a0
	lsl.l #4,%d0
	add.l 12(%sp),%d0
	mvz.w %d0,%d0
	lsl.l #3,%d0
	add.l %d0,%a0
	move.l %a0,%d0
	lsl.l #3,%d0
	move.l %d0,-(%sp)
	move.l %d0,12(%sp)
	jsr es_entry_valid
	addq.l #4,%sp
	move.l 8(%sp),%a0
	tst.l %d0
	jeq .L114
	move.b (%a0),%d0
	moveq #-127,%d1
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	and.l %d1,%d0
	eor.l %d1,%d0
	tst.b %d0
	seq %d0
	mvs.b %d0,%d0
	neg.l %d0
	addq.l #8,%sp
	rts
.L117:
	move.b 269161680,%d0
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	clr.l %d0
	addq.l #8,%sp
	rts
	.size	euc_on, .-euc_on
	.align	2
	.type	entry, @function
entry:
	subq.l #8,%sp
	move.l 1187521622,%d0
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	cmp.l #1074667999,%d0
	jls .L129
	add.l #-1074668000,%d0
	move.l %d0,%d1
	move.l #635712,%d2
	remu.l %d2,%d3:%d1
	divu.l %d2,%d1
	tst.l %d3
	jne .L129
	cmp.l #10171391,%d0
	jhi .L129
	mvz.b 269161680,%d0
	moveq #15,%d2
	cmp.l %d0,%d2
	jcs .L130
	mov3q.l #7,%d3
	cmp.l 20(%sp),%d3
	jcs .L130
	tst.l -2147483630
	jne .L130
	move.l %d0,12(%sp)
	move.l %d1,8(%sp)
	jsr nv_ensure
	move.l 8(%sp),%d1
	move.l 20(%sp),%a0
	add.l #33681922,%a0
	lsl.l #4,%d1
	add.l 12(%sp),%d1
	mvz.w %d1,%d1
	lsl.l #3,%d1
	add.l %d1,%a0
	move.l %a0,%d0
	lsl.l #3,%d0
	move.l %d0,%a0
	tst.b (%a0)
	jlt .L135
	move.l #-2147221504,(%a0)
	clr.l 4(%a0)
.L126:
	move.l (%sp)+,%d2
	move.l %a0,%d0
	move.l (%sp)+,%d3
	addq.l #8,%sp
	rts
.L129:
	move.b 269161680,%d0
.L130:
	move.l (%sp)+,%d2
	sub.l %a0,%a0
	move.l %a0,%d0
	move.l (%sp)+,%d3
	addq.l #8,%sp
	rts
.L135:
	move.l %d0,-(%sp)
	move.l %d0,16(%sp)
	jsr es_entry_valid
	addq.l #4,%sp
	move.l 12(%sp),%a0
	tst.l %d0
	jne .L126
	move.l #-2147221504,(%a0)
	clr.l 4(%a0)
	jra .L126
	.size	entry, .-entry
	.section	.rodata.str1.1,"aMS",@progbits,1
.LC0:
	.string	"%s"
.LC1:
	.string	"EUC"
.LC2:
	.string	"ON"
.LC3:
	.string	"OFF"
.LC4:
	.string	"OP"
	.text
	.align	2
	.type	draw, @function
draw:
	lea (-76,%sp),%sp
	movem.l #31996,(%sp)
	tst.l es_window
	jne .L155
.L136:
	movem.l (%sp),#31996
	lea (76,%sp),%sp
	rts
.L155:
	mvz.b 269161676,%d1
	move.l %d1,48(%sp)
	move.l %d1,-(%sp)
	jsr entry
	move.l es_window,%d4
	add.l #36,%d4
	move.l %d4,-(%sp)
	move.l %d0,%a4
	jsr 1073960572
	addq.l #8,%sp
	tst.l %a4
	jeq .L136
	move.l 1187521622,%a0
	mvz.b 269161680,%d0
	mvz.w #36437,%d1
	mulu.w #36568,%d0
	add.l %d0,%a0
	tst.b (%a0,%d1.l)
	jeq .L138
	move.w 50(%sp),%d0
	mulu.w #2330,%d0
	move.b 80(%a0,%d0.l),%d1
.L139:
	mvz.b %d1,%d0
	moveq #64,%d2
	cmp.l %d0,%d2
	jcc .L140
	moveq #64,%d0
.L140:
	tst.b %d1
	sne %d1
	move.l %d0,56(%sp)
	moveq #64,%d7
	move.l %d0,52(%sp)
	move.l #1073815556,%a2
	move.l %d0,shown+8
	move.l #fmts,%d6
	move.l %d7,60(%sp)
	lea shown,%a5
	lea names,%a3
	mvs.b %d1,%d1
	add.l %d1,%d0
	move.l %d0,64(%sp)
	move.l %d0,68(%sp)
	move.l %d0,72(%sp)
	mvz.b 4(%a4),%d1
	mvz.b 5(%a4),%d0
	mvz.b 1(%a4),%d5
	mvz.b 2(%a4),%d3
	mvz.b 3(%a4),%d2
	mov3q.l #1,-(%sp)
	pea 54.w
	mov3q.l #2,-(%sp)
	pea 52.w
	move.l %d4,-(%sp)
	move.l %d1,shown+16
	move.l %d0,shown+20
	move.l %d5,(%a5)
	move.l %d3,shown+4
	move.l %d2,shown+12
	jsr 1073814420
	pea 111.w
	pea 28.w
	pea 52.w
	move.l %d4,-(%sp)
	jsr 1073814104
	lea (32,%sp),%sp
	mov3q.l #1,(%sp)
	pea 54.w
	pea 72.w
	mov3q.l #2,-(%sp)
	pea 72.w
	move.l %d4,-(%sp)
	jsr (%a2)
	mov3q.l #1,-(%sp)
	pea 54.w
	pea 92.w
	mov3q.l #2,-(%sp)
	pea 92.w
	move.l %d4,-(%sp)
	jsr (%a2)
	move.l %sp,%d5
	sub.l %a6,%a6
	add.l #100,%d5
	lea (48,%sp),%sp
.L143:
	mov3q.l #3,%d0
	move.l %a6,%d3
	move.l %d5,%a0
	remu.l %d0,%d2:%d3
	divu.l %d0,%d3
	move.l (%a0)+,%d0
	move.l %a0,%d5
	muls.w #20,%d2
	muls.w #-27,%d3
	move.l %d2,%a0
	move.l %d3,%a1
	lea (53,%a0),%a0
	lea (29,%a1),%a1
	tst.l %d0
	jeq .L141
	move.l (%a5,%a6.l*4),%a2
	move.l %a2,%d1
	lsl.l #7,%d1
	sub.l %a2,%d1
	move.l %d1,44(%sp)
	divu.l %d0,%d1
	move.l %d1,%d0
	moveq #127,%d1
	cmp.l %d0,%d1
	jcc .L141
	moveq #127,%d0
.L141:
	move.l %d4,-(%sp)
	move.l %d6,%a2
	move.l (%a2)+,-(%sp)
	pea 8.w
	move.l %d0,-(%sp)
	move.l %a6,-(%sp)
	move.l %a1,-(%sp)
	move.l %a0,-(%sp)
	jsr 1074035124
	move.l %a2,%d6
	move.l #1073821956,%a2
	move.l (%a3)+,%d0
	move.l %d3,%a0
	move.l %d0,-(%sp)
	pea .LC0
	move.l %d0,-(%sp)
	clr.l -(%sp)
	mov3q.l #1,-(%sp)
	pea 48(%a0)
	move.l %d2,%a0
	pea 62(%a0)
	move.l %d4,-(%sp)
	move.l #1074505846,-(%sp)
	jsr (%a2)
	addq.l #1,%a6
	lea (64,%sp),%sp
	mov3q.l #6,%d0
	cmp.l %a6,%d0
	jne .L143
	pea .LC1
	pea .LC0
	pea .LC1
	clr.l -(%sp)
	mov3q.l #1,-(%sp)
	pea 46.w
	pea 26.w
	move.l %d4,-(%sp)
	move.l #1074505846,-(%sp)
	jsr (%a2)
	lea (36,%sp),%sp
	move.b (%a4),%d0
	btst #0,%d0
	jeq .L144
	mov3q.l #1,-(%sp)
	pea 36.w
	pea 39.w
	pea 43.w
	pea 13.w
	move.l %d4,-(%sp)
	jsr 1073816148
	pea .LC2
	pea .LC0
	pea .LC2
	mov3q.l #1,-(%sp)
	mov3q.l #1,-(%sp)
	pea 37.w
	pea 26.w
	move.l %d4,-(%sp)
	move.l #1074505846,-(%sp)
	jsr (%a2)
	lea (60,%sp),%sp
	pea .LC4
	move.l #1073821956,%a2
	pea .LC0
	pea .LC4
	clr.l -(%sp)
	mov3q.l #1,-(%sp)
	pea 24.w
	pea 26.w
	move.l %d4,-(%sp)
	move.l #1074505846,-(%sp)
	jsr (%a2)
	lea (36,%sp),%sp
	move.b 6(%a4),%d0
	mov3q.l #3,%d1
	lea ops,%a0
	and.l %d1,%d0
	move.l (%a0,%d0.l*4),%d0
	move.l %d0,-(%sp)
	pea .LC0
	move.l %d0,-(%sp)
	clr.l -(%sp)
	mov3q.l #1,-(%sp)
	pea 15.w
	pea 26.w
	move.l %d4,-(%sp)
	move.l #1074505846,-(%sp)
	jsr (%a2)
	lea (36,%sp),%sp
	move.l 48(%sp),-(%sp)
	mov3q.l #4,-(%sp)
	mov3q.l #2,-(%sp)
	move.l %d4,-(%sp)
	jsr step_bar
	mov3q.l #1,1187497772
	lea (16,%sp),%sp
.L156:
	movem.l (%sp),#31996
	lea (76,%sp),%sp
	rts
.L138:
	mvz.w #36435,%d0
	move.b (%a0,%d0.l),%d1
	jra .L139
.L144:
	pea .LC3
	pea .LC0
	pea .LC3
	clr.l -(%sp)
	mov3q.l #1,-(%sp)
	pea 37.w
	pea 26.w
	move.l %d4,-(%sp)
	move.l #1074505846,-(%sp)
	jsr (%a2)
	lea (36,%sp),%sp
	pea .LC4
	move.l #1073821956,%a2
	pea .LC0
	pea .LC4
	clr.l -(%sp)
	mov3q.l #1,-(%sp)
	pea 24.w
	pea 26.w
	move.l %d4,-(%sp)
	move.l #1074505846,-(%sp)
	jsr (%a2)
	lea (36,%sp),%sp
	move.b 6(%a4),%d0
	mov3q.l #3,%d1
	lea ops,%a0
	and.l %d1,%d0
	move.l (%a0,%d0.l*4),%d0
	move.l %d0,-(%sp)
	pea .LC0
	move.l %d0,-(%sp)
	clr.l -(%sp)
	mov3q.l #1,-(%sp)
	pea 15.w
	pea 26.w
	move.l %d4,-(%sp)
	move.l #1074505846,-(%sp)
	jsr (%a2)
	lea (36,%sp),%sp
	move.l 48(%sp),-(%sp)
	mov3q.l #4,-(%sp)
	mov3q.l #2,-(%sp)
	move.l %d4,-(%sp)
	jsr step_bar
	mov3q.l #1,1187497772
	lea (16,%sp),%sp
	jra .L156
	.size	draw, .-draw
	.section	.rodata.str1.1
.LC5:
	.string	"EUCLID"
	.text
	.align	2
	.type	open_page, @function
open_page:
	subq.l #4,%sp
	move.l 8(%sp),(%sp)
	tst.l es_window
	jeq .L167
.L157:
	addq.l #4,%sp
	rts
.L167:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L157
	pea es_close_cb
	mov3q.l #1,-(%sp)
	clr.l -(%sp)
	clr.l -(%sp)
	pea 64.w
	pea 115.w
	jsr 1074102940
	lea (24,%sp),%sp
	tst.l %d0
	jeq .L157
	lea (3,%sp),%a0
	move.b (%a0),es_from_tte
	clr.l -(%sp)
	pea .LC5
	move.l %d0,-(%sp)
	move.l %d0,es_window
	jsr 1074098360
	pea es_page_layer
	clr.l es_page_layer
	jsr 1073943700
	lea (20,%sp),%sp
	jra draw
	.size	open_page, .-open_page
	.align	2
	.type	apply.isra.0, @function
apply.isra.0:
	link.w %fp,#-72
	movem.l #15612,(%sp)
	move.l 8(%fp),-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L168
	move.l %d0,%a0
	move.b (%a0),%d1
	btst #0,%d1
	jne .L222
.L168:
	movem.l -72(%fp),#15612
	unlk %fp
	rts
.L222:
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
	jeq .L170
	move.b 80(%a0,%d3.l),%d2
	jeq .L168
.L224:
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
	jcc .L172
	moveq #64,%d2
.L172:
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
.L187:
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
	jeq .L173
	tst.b %d3
	jeq .L223
.L175:
	addq.l #1,%d1
	addq.l #2,%a2
	addq.l #2,%a3
	add.l #32,%d0
	moveq #64,%d2
	cmp.l %d1,%d2
	jne .L187
.L225:
	tst.l %a5
	jeq .L168
	move.l -20(%fp),%a0
	add.l #635698,%a0
	mov3q.l #1,(%a0)
	mov3q.l #1,269452696
	jsr 1073905152
	jsr 1073953240
	move.l 8(%fp),-(%sp)
	jsr 1074387488
	mov3q.l #1,1187497772
	addq.l #4,%sp
	tst.l 1175263030
	jeq .L168
	mvz.b 269161676,%d0
	cmp.l 8(%fp),%d0
	jne .L168
	clr.l -(%sp)
	jsr 1073957844
	movem.l -72(%fp),#15612
	addq.l #4,%sp
	unlk %fp
	rts
.L170:
	move.l #36435,%a1
	move.b (%a0,%a1.l),%d2
	jeq .L168
	jra .L224
.L223:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	or.l %d2,%d3
	mvz.b %d3,%d7
	cmp.l %d7,%d4
	jeq .L176
	move.b %d3,(%a0)
	move.l -24(%fp),%a0
	move.l -32(%fp),%d4
	move.b %d3,(%a0,%d4.l)
.L176:
	move.l -32(%fp),%d7
	not.l %d2
	move.l -28(%fp),%a0
	lea (%a4,%d7.l),%a5
	move.b %d2,%d7
	add.l -32(%fp),%a0
.L178:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	and.l %d7,%d3
	mvz.b %d3,%d2
	cmp.l %d2,%d4
	jeq .L177
	move.b %d3,(%a0)
	move.b %d3,(%a1,%a0.l)
.L177:
	addq.l #8,%a0
	cmp.l %a0,%a5
	jne .L178
	move.l %a2,%a0
	tst.b -(%a0)
	jeq .L179
	clr.b %d2
	clr.b (%a0)
	move.b %d2,-1(%a3)
.L179:
	tst.b (%a2)
	jeq .L181
	clr.b (%a2)
	clr.b (%a3)
.L181:
	mov3q.l #1,%a5
	addq.l #1,%d1
	addq.l #2,%a2
	addq.l #2,%a3
	add.l #32,%d0
	moveq #64,%d2
	cmp.l %d1,%d2
	jne .L187
	jra .L225
.L173:
	tst.b %d3
	jeq .L175
	move.l -32(%fp),%d7
	not.l %d2
	lea (%a4,%d7.l),%a5
	move.b %d2,%d7
.L184:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	and.l %d7,%d3
	mvz.b %d3,%d2
	cmp.l %d2,%d4
	jeq .L183
	move.b %d3,(%a0)
	move.b %d3,(%a1,%a0.l)
.L183:
	addq.l #8,%a0
	cmp.l %a0,%a5
	jne .L184
	move.l %d0,%a0
	lea (-32,%a0),%a0
.L186:
	mvz.b (%a0),%d2
	cmp.l #255,%d2
	jeq .L185
	st %d4
	move.b #-1,(%a0)
	move.b %d4,(%a1,%a0.l)
.L185:
	addq.l #1,%a0
	cmp.l %a0,%d0
	jne .L186
	tst.b (%a2)
	jeq .L181
	clr.b (%a2)
	clr.b (%a3)
	jra .L181
	.size	apply.isra.0, .-apply.isra.0
	.align	2
	.globl	es_entry_defaults
	.type	es_entry_defaults, @function
es_entry_defaults:
	move.l 4(%sp),%a0
	move.l #-2147221504,(%a0)
	clr.l 4(%a0)
	rts
	.size	es_entry_defaults, .-es_entry_defaults
	.align	2
	.globl	es_entry_default
	.type	es_entry_default, @function
es_entry_default:
	lea (-24,%sp),%sp
	move.l %d2,-(%sp)
	move.l 32(%sp),%a0
	move.b (%a0),%d0
	move.l %d0,%d1
	and.l #254,%d1
	cmp.l #128,%d1
	jeq .L229
.L231:
	move.l (%sp)+,%d2
	mov3q.l #1,%d0
	lea (24,%sp),%sp
	rts
.L229:
	mvz.b 1(%a0),%d1
	moveq #64,%d2
	move.l %d1,%a1
	cmp.l %d1,%d2
	jcs .L231
	move.b 2(%a0),%d1
	move.b %d1,7(%sp)
	mvz.b %d1,%d1
	cmp.l %d1,%d2
	jcs .L231
	move.b 3(%a0),%d2
	mvz.b %d2,%d1
	move.b %d2,15(%sp)
	moveq #63,%d2
	cmp.l %d1,%d2
	jcs .L231
	move.b 4(%a0),%d1
	mvz.b %d1,%d2
	move.b %d1,11(%sp)
	moveq #63,%d1
	cmp.l %d2,%d1
	jcs .L231
	move.b 5(%a0),%d2
	mvz.b %d2,%d1
	move.b %d2,19(%sp)
	moveq #63,%d2
	cmp.l %d1,%d2
	jcs .L231
	move.b 6(%a0),%d1
	mvz.b %d1,%d2
	move.b %d1,23(%sp)
	mov3q.l #3,%d1
	cmp.l %d2,%d1
	jcs .L231
	tst.b 7(%a0)
	jne .L231
	mvz.b %d0,%d0
	cmp.l #128,%d0
	jne .L233
	mov3q.l #4,%d2
	cmp.l %a1,%d2
	jeq .L236
.L233:
	move.l (%sp)+,%d2
	clr.l %d0
	lea (24,%sp),%sp
	rts
.L236:
	move.b 15(%sp),%d1
	move.b 7(%sp),%d0
	move.b 11(%sp),%d2
	or.l %d1,%d0
	move.b 19(%sp),%d1
	or.l %d2,%d0
	move.b 23(%sp),%d2
	or.l %d1,%d0
	or.l %d2,%d0
	move.l (%sp)+,%d2
	tst.b %d0
	seq %d0
	mvs.b %d0,%d0
	neg.l %d0
	lea (24,%sp),%sp
	rts
	.size	es_entry_default, .-es_entry_default
	.align	2
	.globl	es_line_format
	.type	es_line_format, @function
es_line_format:
	lea (-20,%sp),%sp
	moveq #15,%d1
	movem.l #3100,(%sp)
	move.l 28(%sp),%d2
	move.l %d2,%d0
	lsr.l #3,%d0
	move.l 24(%sp),%a2
	move.l %a2,%a1
	lea key,%a0
	and.l %d1,%d0
	addq.l #1,%d0
.L238:
	move.b (%a0)+,(%a1)+
	cmp.l #key+12,%a0
	jne .L238
	moveq #10,%d3
	mov3q.l #7,%d1
	remu.l %d3,%d4:%d0
	divu.l %d3,%d0
	move.l %d2,%d3
	lsr.l #7,%d3
	and.l %d1,%d2
	moveq #15,%d1
	and.l %d3,%d1
	move.l %d4,%a1
	add.l #48,%d0
	moveq #58,%d4
	move.b %d0,13(%a2)
	move.l %a1,%d3
	add.l #48,%d3
	move.b %d3,14(%a2)
	move.l 32(%sp),%a1
	move.l %a1,%d3
	add.l #49,%d2
	move.b %d2,16(%a2)
	mov3q.l #1,%d2
	move.l %d1,%a0
	move.l %a0,%d0
	add.l #65,%d0
	move.b %d4,15(%a2)
	move.b %d4,17(%a2)
	move.b %d0,12(%a2)
	moveq #19,%d1
	addq.l #7,%d3
	move.b (%a1)+,%d0
	and.l %d2,%d0
	add.l #48,%d0
	move.b %d0,18(%a2)
.L241:
	moveq #44,%d4
	move.l %d1,%a0
	mov3q.l #1,%d2
	addq.l #1,%a0
	move.b %d4,(%a2,%d1.l)
	moveq #17,%d4
	mvz.b (%a1)+,%d1
	move.l %d1,%d0
	lsr.l #2,%d0
	mulu.w #5243,%d0
	lsr.l %d4,%d0
	moveq #9,%d4
	muls.w #100,%d0
	sub.l %d0,%d1
	mvz.b %d1,%d0
	add.l #48,%d1
	cmp.l %d0,%d4
	jcs .L246
	move.b %d1,(%a2,%a0.l)
	move.l %a0,%d1
	add.l %d2,%d1
	cmp.l %a1,%d3
	jne .L241
.L247:
	moveq #13,%d3
	moveq #10,%d4
	move.l %d1,%d0
	addq.l #2,%d0
	move.b %d3,(%a2,%d1.l)
	move.b %d4,1(%a2,%d1.l)
	clr.b %d1
	move.b %d1,(%a2,%d0.l)
	movem.l (%sp),#3100
	lea (20,%sp),%sp
	rts
.L246:
	moveq #10,%d2
	remu.l %d2,%d1:%d0
	divu.l %d2,%d0
	mov3q.l #2,%d2
	add.l #48,%d1
	move.b %d1,1(%a2,%a0.l)
	add.l #48,%d0
	move.l %a0,%d1
	add.l %d2,%d1
	move.b %d0,(%a2,%a0.l)
	cmp.l %a1,%d3
	jne .L241
	jra .L247
	.size	es_line_format, .-es_line_format
	.align	2
	.globl	es_line_parse
	.type	es_line_parse, @function
es_line_parse:
	lea (-24,%sp),%sp
	move.l %a2,-(%sp)
	move.l %d2,-(%sp)
	move.l 36(%sp),%a1
	lea key,%a0
.L250:
	addq.l #1,%a1
	addq.l #1,%a0
	mvs.b -1(%a1),%d1
	mvs.b -1(%a0),%d0
	cmp.l %d1,%d0
	jne .L257
	cmp.l #key+12,%a0
	jne .L250
	move.l 36(%sp),%a0
	moveq #15,%d1
	move.b 12(%a0),%d0
	add.l #-65,%d0
	mvz.b %d0,%d0
	cmp.l %d0,%d1
	jcs .L252
	move.l 36(%sp),%a0
	moveq #9,%d1
	mvz.b 13(%a0),%d0
	add.l #-48,%d0
	cmp.l %d0,%d1
	jcs .L252
	mvz.b 14(%a0),%d1
	moveq #9,%d2
	add.l #-48,%d1
	cmp.l %d1,%d2
	jcs .L252
	mvs.b 15(%a0),%d2
	move.l %d2,%a0
	moveq #58,%d2
	cmp.l %a0,%d2
	jne .L252
	move.l 36(%sp),%a0
	move.b 16(%a0),%d2
	move.w %d2,%a1
	lea (-49,%a1),%a1
	move.w %a1,%d2
	mvz.b %d2,%d2
	move.l %d2,%a0
	mov3q.l #7,%d2
	cmp.l %a0,%d2
	jcs .L252
	move.l 36(%sp),%a2
	mvs.b 17(%a2),%d2
	move.l %d2,%a0
	moveq #58,%d2
	cmp.l %a0,%d2
	jne .L252
	move.b 18(%a2),%d2
	move.w %d2,%a0
	move.b %d2,15(%sp)
	lea (-48,%a0),%a0
	move.w %a0,%d2
	mvz.b %d2,%d2
	move.l %d2,%a0
	mov3q.l #1,%d2
	cmp.l %a0,%d2
	jcs .L252
	moveq #10,%d2
	muls.l %d2,%d0
	add.l %d1,%d0
	move.l %d0,28(%sp)
	moveq #15,%d1
	subq.l #1,%d0
	cmp.l %d0,%d1
	jcs .L252
	mvs.b 15(%sp),%d0
	moveq #49,%d2
	cmp.l %d0,%d2
	jeq .L267
	moveq #-128,%d0
	move.l 44(%sp),%a0
	move.l 44(%sp),%d1
	addq.l #1,%d1
	move.l 44(%sp),%d2
	addq.l #7,%d2
	move.l %d1,20(%sp)
	move.l %d2,24(%sp)
	move.b %d0,(%a0)
	clr.b %d0
	move.b %d0,7(%a0)
	move.l 36(%sp),%a0
	lea (19,%a0),%a0
.L256:
	mvs.b (%a0),%d0
	moveq #44,%d1
	cmp.l %d0,%d1
	jne .L252
	mvz.b 1(%a0),%d1
	moveq #9,%d2
	add.l #-48,%d1
	cmp.l %d1,%d2
	jcs .L252
	lea (4,%a0),%a2
	clr.l %d0
	move.l %a2,16(%sp)
	addq.l #1,%a0
.L255:
	moveq #10,%d2
	addq.l #1,%a0
	muls.l %d2,%d0
	mvz.b (%a0),%d2
	add.l %d1,%d0
	move.l %d2,%d1
	moveq #9,%d2
	add.l #-48,%d1
	cmp.l %d1,%d2
	jcs .L254
	cmp.l 16(%sp),%a0
	jne .L255
.L252:
	move.l (%sp)+,%d2
	mov3q.l #1,%d0
	move.l (%sp)+,%a2
	lea (24,%sp),%sp
	rts
.L257:
	move.l (%sp)+,%d2
	clr.l %d0
	move.l (%sp)+,%a2
	lea (24,%sp),%sp
	rts
.L254:
	cmp.l #255,%d0
	jhi .L252
	move.l 20(%sp),%a2
	addq.l #1,20(%sp)
	move.b %d0,(%a2)+
	cmp.l 24(%sp),%a2
	jne .L256
	tst.b (%a0)
	jne .L252
	move.l 44(%sp),-(%sp)
	move.l %a1,12(%sp)
	jsr es_entry_valid
	addq.l #4,%sp
	tst.l %d0
	jeq .L252
	move.l 36(%sp),%a2
	mvs.b 11(%sp),%d0
	mvs.b 12(%a2),%d1
	move.l %d0,%a1
	mov3q.l #2,%d0
	lsl.l #4,%d1
	move.l %d1,%a0
	lea (-1041,%a0),%a0
	move.l 28(%sp),%d1
	add.l %a0,%d1
	lsl.l #3,%d1
	move.l 40(%sp),%a0
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	add.l %a1,%d1
	move.l %d1,(%a0)
	lea (24,%sp),%sp
	rts
.L267:
	moveq #-127,%d0
	move.l 44(%sp),%a0
	move.l 44(%sp),%d1
	addq.l #1,%d1
	move.l 44(%sp),%d2
	addq.l #7,%d2
	move.l %d1,20(%sp)
	move.l %d2,24(%sp)
	move.b %d0,(%a0)
	clr.b %d0
	move.b %d0,7(%a0)
	move.l 36(%sp),%a0
	lea (19,%a0),%a0
	jra .L256
	.size	es_line_parse, .-es_line_parse
	.align	2
	.globl	es_length_changed
	.type	es_length_changed, @function
es_length_changed:
	move.l %a2,-(%sp)
	move.l %d2,-(%sp)
	clr.l %d2
	lea (apply.isra.0),%a2
.L269:
	move.l %d2,-(%sp)
	jsr (%a2)
	addq.l #1,%d2
	addq.l #4,%sp
	moveq #8,%d0
	cmp.l %d2,%d0
	jne .L269
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
	jeq .L273
	move.l -2147483440,%d0
	mov3q.l #2,%d1
	cmp.l %d0,%d1
	jcs .L289
	lea (levels.2),%a0
	move.l 1175263030,%d5
	mvz.b (%a0,%d0.l),%d3
	tst.l %d5
	jne .L290
.L281:
	clr.l %d0
	cmp.l led_shown.l,%d5
	jeq .L291
.L277:
	mvz.w #1888,%d1
	cmp.l 1074501324.l,%d1
	jcs .L273
	btst #0,%d0
	jeq .L278
	move.l %d3,%d4
	clr.l %d2
.L280:
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
	jne .L280
	move.l %d5,led_shown
	move.l %d3,led_level
.L273:
	movem.l (%sp),#60
	lea (16,%sp),%sp
	rts
.L289:
	mov3q.l #2,%d0
	lea (levels.2),%a0
	move.l 1175263030,%d5
	mvz.b (%a0,%d0.l),%d3
	tst.l %d5
	jeq .L281
	jra .L290
.L291:
	cmp.l led_level.l,%d3
	jne .L277
	movem.l (%sp),#60
	lea (16,%sp),%sp
	rts
.L290:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr euc_on
	addq.l #4,%sp
	move.l %d0,%d5
	cmp.l led_shown.l,%d5
	jne .L277
	jra .L291
.L278:
	clr.l %d4
	clr.l %d2
	jra .L280
	.size	es_led_sync, .-es_led_sync
	.align	2
	.globl	es_rec_blocked
	.type	es_rec_blocked, @function
es_rec_blocked:
	jra euc_on
	.size	es_rec_blocked, .-es_rec_blocked
	.align	2
	.globl	es_blocked
	.type	es_blocked, @function
es_blocked:
	move.l 1175263030,%d0
	tst.l %d0
	jeq .L294
	tst.l 1175352268
	jeq .L296
	tst.l 1175352292
	jne .L297
.L296:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L297
	move.l %d0,%a0
	mov3q.l #1,%d1
	move.b (%a0),%d0
	and.l %d1,%d0
.L294:
	rts
.L297:
	clr.l %d0
	rts
	.size	es_blocked, .-es_blocked
	.align	2
	.globl	es_shift_blocked
	.type	es_shift_blocked, @function
es_shift_blocked:
	move.l -2147483630,%d0
	tst.l %d0
	jne .L315
	tst.l 1175352268
	jeq .L314
	tst.l 1175352292
	jne .L312
.L314:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr euc_on
	addq.l #4,%sp
.L312:
	rts
.L315:
	clr.l %d0
	rts
	.size	es_shift_blocked, .-es_shift_blocked
	.align	2
	.globl	es_sel_count
	.type	es_sel_count, @function
es_sel_count:
	tst.l -2147483630
	jeq .L323
	mov3q.l #3,%d0
	rts
.L323:
	mov3q.l #7,%d0
	rts
	.size	es_sel_count, .-es_sel_count
	.align	2
	.globl	es_sel_row
	.type	es_sel_row, @function
es_sel_row:
	tst.b es_mode.l
	jeq .L327
	tst.l -2147483630
	jne .L327
	mov3q.l #6,%d0
	rts
.L327:
	move.l 1175262960,%d0
	rts
	.size	es_sel_row, .-es_sel_row
	.align	2
	.globl	es_sel_pick
	.type	es_sel_pick, @function
es_sel_pick:
	move.l %d2,-(%sp)
	tst.l -2147483630
	jne .L333
	move.l 1187500856,%d1
	mov3q.l #6,%d2
	cmp.l %d1,%d2
	seq %d0
	neg.l %d0
	move.b %d0,es_mode
	cmp.l %d1,%d2
	jeq .L336
.L333:
	move.l 8(%sp),%d0
	move.l (%sp)+,%d2
	rts
.L336:
	clr.l 8(%sp)
	move.l 8(%sp),%d0
	move.l (%sp)+,%d2
	rts
	.size	es_sel_pick, .-es_sel_pick
	.align	2
	.globl	es_title
	.type	es_title, @function
es_title:
	lea (-40,%sp),%sp
	movem.l #16412,(%sp)
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	mov3q.l #1,-(%sp)
	pea 25.w
	pea 117.w
	pea 31.w
	pea 61.w
	move.l #1074524426,-(%sp)
	move.l %d0,%a6
	jsr 1073816148
	pea .LC5
	pea .LC0
	pea .LC5
	mov3q.l #1,-(%sp)
	clr.l -(%sp)
	pea 26.w
	pea 62.w
	move.l #1074524426,-(%sp)
	move.l #1074505846,-(%sp)
	jsr 1073821956
	lea (64,%sp),%sp
	tst.l %a6
	jeq .L338
	move.b (%a6),%d0
	btst #0,%d0
	jne .L359
.L338:
	movem.l (%sp),#16412
	mov3q.l #1,1187497772
	lea (40,%sp),%sp
	rts
.L359:
	mvz.b 1(%a6),%d0
	moveq #9,%d1
	cmp.l %d0,%d1
	jcc .L345
	moveq #10,%d2
	move.l %d0,%d1
	divu.l %d2,%d1
	lea (29,%sp),%a0
	move.l %a0,24(%sp)
	move.l 24(%sp),%a1
	lea (30,%sp),%a0
	move.l %d1,%d3
	remu.l %d2,%d4:%d3
	move.l %d4,%d1
	add.l #48,%d1
	move.b %d1,28(%sp)
.L339:
	moveq #10,%d2
	remu.l %d2,%d1:%d0
	add.l #48,%d1
	move.b %d1,(%a1)
	clr.b (%a0)
	lea (32,%sp),%a0
	move.l %a0,20(%sp)
	move.b 28(%sp),%d0
	jeq .L346
	clr.l %d1
	lea (28,%sp),%a1
.L341:
	move.b %d0,(%a0)+
	move.l %d1,16(%sp)
	addq.l #1,%d1
	move.b (%a1,%d1.l),%d0
	jne .L341
	move.l 16(%sp),%d0
	addq.l #2,%d0
	move.l 20(%sp),%a0
	add.l %d1,%a0
	move.l %d0,16(%sp)
.L340:
	move.b #58,(%a0)
	moveq #9,%d1
	mvz.b 2(%a6),%d0
	cmp.l %d0,%d1
	jcc .L347
	moveq #10,%d2
	move.l %d0,%d1
	divu.l %d2,%d1
	move.l 24(%sp),%a0
	lea (30,%sp),%a1
	move.l %d1,%d4
	remu.l %d2,%d3:%d4
	move.l %d3,%d1
	add.l #48,%d1
	move.b %d1,28(%sp)
.L342:
	moveq #10,%d4
	remu.l %d4,%d1:%d0
	add.l #48,%d1
	move.b %d1,(%a0)
	clr.b (%a1)
	move.b 28(%sp),%d0
	jeq .L348
	move.l 16(%sp),%a0
	move.l 20(%sp),%d1
	lea (28,%sp),%a1
	sub.l %a0,%a1
	lea (%a0,%d1.l),%a6
.L344:
	move.b %d0,(%a6)+
	addq.l #1,%a0
	move.b (%a1,%a0.l),%d0
	jne .L344
	clr.b %d2
	move.b %d2,32(%sp,%a0.l)
	move.l 20(%sp),-(%sp)
	pea .LC0
	move.l 28(%sp),-(%sp)
	mov3q.l #1,-(%sp)
	mov3q.l #2,-(%sp)
	pea 26.w
	pea 117.w
	move.l #1074524426,-(%sp)
	move.l #1074505846,-(%sp)
	jsr 1073821956
	lea (36,%sp),%sp
.L360:
	mov3q.l #1,1187497772
	movem.l (%sp),#16412
	lea (40,%sp),%sp
	rts
.L345:
	lea (29,%sp),%a0
	move.l %a0,24(%sp)
	lea (28,%sp),%a1
	jra .L339
.L347:
	move.l 24(%sp),%a1
	lea (28,%sp),%a0
	jra .L342
.L346:
	mov3q.l #1,16(%sp)
	jra .L340
.L348:
	clr.b %d2
	move.l 16(%sp),%a0
	move.b %d2,32(%sp,%a0.l)
	move.l 20(%sp),-(%sp)
	pea .LC0
	move.l 28(%sp),-(%sp)
	mov3q.l #1,-(%sp)
	mov3q.l #2,-(%sp)
	pea 26.w
	pea 117.w
	move.l #1074524426,-(%sp)
	move.l #1074505846,-(%sp)
	jsr 1073821956
	lea (36,%sp),%sp
	jra .L360
	.size	es_title, .-es_title
	.section	.rodata.str1.1
.LC6:
	.string	"EUC ON"
.LC7:
	.string	"EUC OFF"
	.text
	.align	2
	.globl	es_body
	.type	es_body, @function
es_body:
	subq.l #4,%sp
	move.l %d2,-(%sp)
	mvz.b 269161676,%d2
	move.l %d2,-(%sp)
	jsr entry
	clr.l -(%sp)
	pea 8.w
	pea 118.w
	pea 24.w
	pea 60.w
	move.l #1074524426,-(%sp)
	move.l %d0,32(%sp)
	jsr 1073816148
	lea (28,%sp),%sp
	move.l 4(%sp),%d0
	tst.l %d0
	jeq .L361
	move.l %d0,%a0
	move.b (%a0),%d1
	btst #0,%d1
	jeq .L363
	move.b 6(%a0),%d0
	mov3q.l #3,%d1
	lea ops,%a1
	move.l #1073821956,%a0
	and.l %d1,%d0
	move.l (%a1,%d0.l*4),%d0
	move.l %d0,-(%sp)
	pea .LC0
	move.l %d0,-(%sp)
	clr.l -(%sp)
	clr.l -(%sp)
	pea 17.w
	pea 62.w
	move.l #1074524426,-(%sp)
	move.l #1074505846,-(%sp)
	move.l %a0,40(%sp)
	jsr (%a0)
	lea (32,%sp),%sp
	move.l #.LC6,(%sp)
	pea .LC0
	pea .LC6
	clr.l -(%sp)
	mov3q.l #2,-(%sp)
	pea 17.w
	pea 117.w
	move.l #1074524426,-(%sp)
	move.l #1074505846,-(%sp)
	move.l 40(%sp),%a0
	jsr (%a0)
	lea (36,%sp),%sp
	move.l %d2,-(%sp)
	pea 10.w
	pea 63.w
	move.l #1074524426,-(%sp)
	jsr step_bar
	mov3q.l #1,1187497772
	lea (16,%sp),%sp
.L361:
	move.l (%sp)+,%d2
	addq.l #4,%sp
	rts
.L363:
	pea .LC7
	pea .LC0
	pea .LC7
	clr.l -(%sp)
	mov3q.l #2,-(%sp)
	pea 17.w
	pea 117.w
	move.l #1074524426,-(%sp)
	move.l #1074505846,-(%sp)
	jsr 1073821956
	lea (36,%sp),%sp
	move.l %d2,-(%sp)
	pea 10.w
	pea 63.w
	move.l #1074524426,-(%sp)
	jsr step_bar
	mov3q.l #1,1187497772
	lea (16,%sp),%sp
	jra .L361
	.size	es_body, .-es_body
	.align	2
	.globl	es_tte_right
	.type	es_tte_right, @function
es_tte_right:
	mov3q.l #1,%d0
	cmp.l 8(%sp),%d0
	jeq .L377
.L370:
	rts
.L377:
	tst.l 1175352268
	jeq .L370
	tst.l 1175352292
	jne .L370
	mov3q.l #1,4(%sp)
	jra open_page
	.size	es_tte_right, .-es_tte_right
	.align	2
	.globl	es_func_right
	.type	es_func_right, @function
es_func_right:
	tst.b es_mode.l
	jeq .L381
	tst.l -2147483630
	jne .L381
	mov3q.l #1,%d0
	cmp.l 4(%sp),%d0
	jeq .L385
	mov3q.l #1,%d0
	rts
.L381:
	clr.l %d0
	rts
.L385:
	clr.l -(%sp)
	jsr open_page
	addq.l #4,%sp
	mov3q.l #1,%d0
	rts
	.size	es_func_right, .-es_func_right
	.align	2
	.globl	es_key
	.type	es_key, @function
es_key:
	subq.l #4,%sp
	move.l %d2,-(%sp)
	move.l 16(%sp),%d0
	tst.l es_window
	jeq .L386
	moveq #50,%d1
	cmp.l 12(%sp),%d1
	jeq .L395
	subq.l #1,%d0
	tst.l %d0
	jeq .L396
.L386:
	move.l (%sp)+,%d2
	addq.l #4,%sp
	rts
.L396:
	moveq #49,%d2
	cmp.l 12(%sp),%d2
	jne .L386
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L386
	move.l %d0,%a0
	mov3q.l #1,%d2
	move.b (%a0),%d1
	eor.l %d2,%d1
	move.b %d1,(%a0)
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr (apply.isra.0)
	addq.l #4,%sp
	move.l (%sp)+,%d2
	addq.l #4,%sp
	jra draw
.L395:
	tst.l %d0
	jne .L386
	pea es_window
	lea es_from_tte,%a0
	move.b (%a0),11(%sp)
	jsr 1074093492
	pea es_page_layer
	jsr 1073943660
	clr.l es_window
	mov3q.l #1,1187497772
	mov3q.l #-1,-(%sp)
	jsr 1074059592
	lea (12,%sp),%sp
	tst.b 7(%sp)
	jeq .L389
	move.l (%sp)+,%d2
	addq.l #4,%sp
	jmp 1074249808
.L389:
	tst.b es_mode.l
	jeq .L386
	tst.l -2147483630
	jne .L386
	move.l (%sp)+,%d2
	addq.l #4,%sp
	jmp 1074026524
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
	jeq .L397
	mov3q.l #6,%d0
	cmp.l %a0,%d0
	jcs .L397
	mov3q.l #2,%d2
	cmp.l %a0,%d2
	jeq .L397
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
	jeq .L397
	move.l 1187521622,%a1
	move.l #36437,%a2
	mvz.b 269161680,%d2
	move.l %d2,16(%sp)
	mulu.w #36568,%d2
	add.l %d2,%a1
	tst.b (%a1,%a2.l)
	jeq .L399
	move.w 22(%sp),%d2
	mulu.w #2330,%d2
	move.b 80(%a1,%d2.l),%d2
	move.w %d2,%a1
.L400:
	mov3q.l #6,%d2
	cmp.l %a0,%d2
	jeq .L406
	move.w %a1,%d2
	mvz.b %d2,%d2
	move.l %d2,%a1
	moveq #64,%d2
	cmp.l %a1,%d2
	jcc .L402
	move.w #64,%a1
.L402:
	mov3q.l #1,%d2
	cmp.l %a0,%d2
	jcc .L401
	subq.l #1,%a1
	tst.l %a1
	jlt .L415
.L401:
	lea (field.1),%a2
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jlt .L416
.L404:
	cmp.l %d1,%a1
	jge .L405
	move.l %a1,%d1
.L405:
	mvz.b %d1,%d2
	cmp.l %d0,%d2
	jeq .L397
	move.b %d1,(%a0)
	move.l 20(%sp),-(%sp)
	jsr (apply.isra.0)
	addq.l #4,%sp
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	lea (16,%sp),%sp
	jra draw
.L397:
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	lea (16,%sp),%sp
	rts
.L416:
	clr.l %d1
	jra .L404
.L399:
	mvz.w #36435,%d2
	move.b (%a1,%d2.l),%d2
	move.w %d2,%a1
	jra .L400
.L406:
	lea (field.1),%a2
	mov3q.l #3,%a1
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jge .L404
	jra .L416
.L415:
	lea (field.1),%a2
	sub.l %a1,%a1
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jge .L404
	jra .L416
	.size	es_knob, .-es_knob
	.align	2
	.globl	es_project_write
	.type	es_project_write, @function
es_project_write:
	lea (-24,%sp),%sp
	movem.l #7196,(%sp)
	move.l 28(%sp),%d4
	move.l #269455376,%a2
	jsr nv_ensure
	clr.l %d2
	lea es_entry_valid,%a4
	lea es_line_format,%a3
.L420:
	move.b (%a2),%d3
	jmi .L428
.L418:
	addq.l #1,%d2
	addq.l #8,%a2
	cmp.l #2048,%d2
	jne .L420
.L430:
	movem.l (%sp),#7196
	lea (24,%sp),%sp
	rts
.L428:
	move.l %a2,-(%sp)
	jsr (%a4)
	addq.l #4,%sp
	tst.l %d0
	jeq .L418
	btst #0,%d3
	jne .L419
	mvz.b 1(%a2),%d0
	subq.l #4,%d0
	tst.l %d0
	jeq .L429
.L419:
	move.l %a2,-(%sp)
	move.l %d2,-(%sp)
	pea (line.0)
	jsr (%a3)
	addq.l #1,%d2
	addq.l #8,%a2
	move.l %d0,-(%sp)
	pea (line.0)
	move.l %d4,-(%sp)
	jsr 1073833656
	lea (24,%sp),%sp
	cmp.l #2048,%d2
	jne .L420
	jra .L430
.L429:
	tst.b 2(%a2)
	jne .L419
	tst.b 3(%a2)
	jne .L419
	tst.b 4(%a2)
	jne .L419
	tst.b 5(%a2)
	jne .L419
	tst.b 6(%a2)
	jne .L419
	addq.l #1,%d2
	addq.l #8,%a2
	cmp.l #2048,%d2
	jne .L420
	jra .L430
	.size	es_project_write, .-es_project_write
	.align	2
	.globl	es_project_begin
	.type	es_project_begin, @function
es_project_begin:
	tst.l 4(%sp)
	jeq .L437
	rts
.L437:
	move.l #269455376,%a0
.L433:
	clr.b (%a0)+
	cmp.l #269471760,%a0
	jne .L433
	moveq #69,%d0
	move.b %d0,269455360
	moveq #83,%d0
	move.b %d0,269455361
	moveq #78,%d0
	move.b %d0,269455362
	moveq #49,%d0
	move.b %d0,269455363
	rts
	.size	es_project_begin, .-es_project_begin
	.align	2
	.globl	es_project_line
	.type	es_project_line, @function
es_project_line:
	link.w %fp,#-24
	move.l %d2,-(%sp)
	tst.l 12(%fp)
	jeq .L442
.L438:
	move.l -28(%fp),%d2
	unlk %fp
	rts
.L442:
	pea -8(%fp)
	pea -12(%fp)
	move.l 8(%fp),-(%sp)
	jsr es_line_parse
	lea (12,%sp),%sp
	subq.l #2,%d0
	tst.l %d0
	jne .L438
	jsr nv_ensure
	mvz.b -3(%fp),%d2
	mvz.b -4(%fp),%d1
	mvz.b -8(%fp),%d0
	move.l %d2,%a1
	mvz.b -7(%fp),%d2
	move.l %d2,%a0
	moveq #24,%d2
	lsl.l %d2,%d1
	move.l %a1,%d2
	swap %d2
	clr.w %d2
	move.l %d2,-20(%fp)
	moveq #24,%d2
	lsl.l %d2,%d0
	move.l %a0,%d2
	swap %d2
	clr.w %d2
	move.l -12(%fp),%a0
	add.l #33681922,%a0
	or.l -20(%fp),%d1
	move.l %d2,-16(%fp)
	mvz.b -2(%fp),%d2
	or.l -16(%fp),%d0
	move.l %d2,-24(%fp)
	mvz.b -6(%fp),%d2
	move.l %d2,%a1
	move.l %a0,%d2
	lsl.l #3,%d2
	move.l %d2,%a0
	move.l -24(%fp),%d2
	lsl.l #8,%d2
	move.l %d2,-24(%fp)
	move.l %a1,%d2
	lsl.l #8,%d2
	or.l -24(%fp),%d1
	or.l %d2,%d0
	move.b -1(%fp),%d1
	move.l %d1,4(%a0)
	move.b -5(%fp),%d0
	move.l %d0,(%a0)
	move.l -28(%fp),%d2
	unlk %fp
	rts
	.size	es_project_line, .-es_project_line
	.local	line.0
	.comm	line.0,48,1
	.section	.rodata
	.type	field.1, @object
	.size	field.1, 7
field.1:
	.base64	"AQIAAwQFBg=="
	.type	levels.2, @object
	.size	levels.2, 3
levels.2:
	.ascii	"\f0D"
	.align	2
	.type	fmts, @object
	.size	fmts, 24
fmts:
	.long	fmt0
	.long	fmt1
	.long	fmt2
	.long	fmt3
	.long	fmt4
	.long	fmt5
	.data
	.type	es_from_tte, @object
	.size	es_from_tte, 1
es_from_tte:
	.zero	1
	.local	shown
	.comm	shown,24,2
	.section	.rodata.str1.1
.LC8:
	.string	"PL1"
.LC9:
	.string	"PL2"
.LC10:
	.string	"LEN"
.LC11:
	.string	"RO1"
.LC12:
	.string	"RO2"
.LC13:
	.string	"TRO"
	.section	.rodata
	.align	2
	.type	names, @object
	.size	names, 24
names:
	.long	.LC8
	.long	.LC9
	.long	.LC10
	.long	.LC11
	.long	.LC12
	.long	.LC13
	.globl	es_mode
	.data
	.type	es_mode, @object
	.size	es_mode, 1
es_mode:
	.zero	1
	.section	.rodata.str1.1
.LC14:
	.string	"OR"
.LC15:
	.string	"XOR"
.LC16:
	.string	"AND"
.LC17:
	.string	"SUB"
	.section	.rodata
	.align	2
	.type	ops, @object
	.size	ops, 16
ops:
	.long	.LC14
	.long	.LC15
	.long	.LC16
	.long	.LC17
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
	.section	.rodata
	.type	key, @object
	.size	key, 13
key:
	.string	"#EUCLID_SEQ="

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

| ---- the project file (README "Saving") ------------------------------------
| 0x400866e2, the loader's head after it stored its parse-only flag at
| 58(sp) (nonzero on the parse-only pass). Displaced: clrl 50(sp);
| clrl 54(sp) (8). Play Modes and the quantizer hook 0x400866cc/0x400866d4
| before this site, so the three compose.
        .global es_proj_begin_stub, es_proj_line_stub, es_proj_write_stub
es_proj_begin_stub:
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        move.l 74(%sp),-(%sp)
        jsr es_project_begin
        addq.l #4,%sp
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        clr.l 50(%sp)
        clr.l 54(%sp)
        jmp 0x400866ea

| 0x40088224, the loader's next-line point: d3 is the finished line (NUL
| ended, no CR LF), about to be cleared; '#' lines arrive here from the
| comment check (0x400867aa, or Play Modes' stub there). Displaced: pea
| 0x400b44b5 (6).
es_proj_line_stub:
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        move.l 74(%sp),-(%sp)
        move.l %d3,-(%sp)
        jsr es_project_line
        addq.l #8,%sp
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        pea 0x400b44b5
        jmp 0x4008822a

| 0x400888d2, the writer, before the setting stored at 0x80000050: d3 is
| the file. Our lines first, then the displaced mvs.b 0x80000050,%d0;
| move.l %d0,-(%sp) (8). d1/a0/a1 are dead here (the stock line calls
| sprintf next); d2 is recomputed by the stock line.
es_proj_write_stub:
        move.l %d3,-(%sp)
        jsr es_project_write
        addq.l #4,%sp
        mvs.b 0x80000050,%d0
        move.l %d0,-(%sp)
        jmp 0x400888da

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
