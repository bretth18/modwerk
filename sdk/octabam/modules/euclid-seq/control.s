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
	.type	euc_on, @function
euc_on:
	move.l 1187521622,%d1
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	cmp.l #1074667999,%d1
	jls .L12
	add.l #-1074668000,%d1
	move.l %d1,%d2
	move.l #635712,%d3
	remu.l %d3,%d0:%d2
	divu.l %d3,%d2
	move.l %d2,%a0
	tst.l %d0
	jne .L12
	cmp.l #10171391,%d1
	jhi .L12
	mvz.b 269161680,%d1
	moveq #15,%d2
	cmp.l %d1,%d2
	jcs .L9
	mov3q.l #7,%d3
	cmp.l 12(%sp),%d3
	jcs .L9
	tst.l -2147483630
	jne .L9
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
.L9:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L12:
	move.b 269161680,%d0
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	clr.l %d0
	rts
	.size	euc_on, .-euc_on
	.align	2
	.globl	es_close_cb
	.type	es_close_cb, @function
es_close_cb:
	tst.l es_window
	jeq .L17
	pea es_window
	jsr 1074093492
	pea es_page_layer
	jsr 1073943660
	clr.l es_window
	mov3q.l #1,1187497772
	mov3q.l #-1,-(%sp)
	jsr 1074059592
	lea (12,%sp),%sp
.L17:
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
	jeq .L22
	move.b 80(%a0,%d2.l),%d4
.L23:
	mvz.b %d4,%d4
	moveq #64,%d0
	cmp.l %d4,%d0
	jcc .L24
	moveq #64,%d4
.L24:
	move.l 1175263052,%d0
	moveq #63,%d1
	cmp.l %d0,%d1
	jcc .L25
	clr.l %d0
.L25:
	move.l 1187521622,%a3
	move.l %d2,%a2
	mvz.b 269161680,%d1
	clr.l %d5
	clr.l %d3
	addq.l #7,%a2
	mulu.w #36568,%d1
	add.l %d1,%a3
.L26:
	mov3q.l #7,%d1
	mov3q.l #1,%d7
	move.l %d0,%d2
	lsr.l #3,%d2
	and.l %d0,%d1
	lsl.l %d3,%d7
	cmp.l %d0,%d4
	jls .L28
	move.l %a2,%a0
	sub.l %d2,%a0
	addq.l #1,%d3
	addq.l #1,%d0
	mvz.b (%a3,%a0.l),%d2
	btst %d1,%d2
	jeq .L27
	or.l %d7,%d5
.L27:
	moveq #16,%d1
	cmp.l %d3,%d1
	jne .L26
.L28:
	move.l 48(%sp),%d4
	move.l %d6,%a2
	clr.l %d2
	addq.l #3,%a2
.L32:
	move.l %d2,%d0
	lsr.l #2,%d0
	cmp.l %d3,%d2
	jcc .L30
	add.l %d4,%d0
	move.l %d0,%d1
	addq.l #1,%d1
	btst %d2,%d5
	jeq .L31
	mov3q.l #1,-(%sp)
	move.l %d6,-(%sp)
	move.l %d1,-(%sp)
	move.l %a2,-(%sp)
	move.l %d0,-(%sp)
	move.l %a5,-(%sp)
	jsr 1073816148
	lea (24,%sp),%sp
.L30:
	addq.l #1,%d2
	addq.l #3,%d4
	moveq #16,%d0
	cmp.l %d2,%d0
	jne .L32
.L43:
	movem.l (%sp),#15612
	lea (40,%sp),%sp
	rts
.L31:
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
	jne .L32
	jra .L43
.L22:
	mvz.w #36435,%d0
	move.b (%a0,%d0.l),%d4
	jra .L23
	.size	step_bar, .-step_bar
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
	jne .L63
.L44:
	movem.l (%sp),#31996
	lea (76,%sp),%sp
	rts
.L63:
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
	jeq .L44
	move.l 1187521622,%a0
	mvz.b 269161680,%d0
	mvz.w #36437,%d1
	mulu.w #36568,%d0
	add.l %d0,%a0
	tst.b (%a0,%d1.l)
	jeq .L46
	move.w 50(%sp),%d0
	mulu.w #2330,%d0
	move.b 80(%a0,%d0.l),%d1
.L47:
	mvz.b %d1,%d0
	moveq #64,%d2
	cmp.l %d0,%d2
	jcc .L48
	moveq #64,%d0
.L48:
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
.L51:
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
	jeq .L49
	move.l (%a5,%a6.l*4),%a2
	move.l %a2,%d1
	lsl.l #7,%d1
	sub.l %a2,%d1
	move.l %d1,44(%sp)
	divu.l %d0,%d1
	move.l %d1,%d0
	moveq #127,%d1
	cmp.l %d0,%d1
	jcc .L49
	moveq #127,%d0
.L49:
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
	jne .L51
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
	jeq .L52
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
.L64:
	movem.l (%sp),#31996
	lea (76,%sp),%sp
	rts
.L46:
	mvz.w #36435,%d0
	move.b (%a0,%d0.l),%d1
	jra .L47
.L52:
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
	jra .L64
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
	jeq .L75
.L65:
	addq.l #4,%sp
	rts
.L75:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L65
	pea es_close_cb
	mov3q.l #1,-(%sp)
	clr.l -(%sp)
	clr.l -(%sp)
	pea 64.w
	pea 115.w
	jsr 1074102940
	lea (24,%sp),%sp
	tst.l %d0
	jeq .L65
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
	.type	fmt0, @function
fmt0:
	move.l %d3,-(%sp)
	move.l shown,%d1
	move.l %d1,%d0
	move.l %d2,-(%sp)
	moveq #99,%d2
	move.l 12(%sp),%a0
	cmp.l %d1,%d2
	jcc .L77
	moveq #99,%d0
.L77:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L79
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
.L79:
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
	jcc .L83
	moveq #99,%d0
.L83:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L85
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
.L85:
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
	jcc .L89
	moveq #99,%d0
.L89:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L91
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
.L91:
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
	jcc .L95
	moveq #99,%d0
.L95:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L97
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
.L97:
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
	jcc .L101
	moveq #99,%d0
.L101:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L103
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
.L103:
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
	jcc .L107
	moveq #99,%d0
.L107:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L109
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
.L109:
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
.L113:
	clr.b (%a0)+
	cmp.l %a0,%d1
	jne .L113
	tst.l %d0
	jeq .L112
	moveq #64,%d1
	cmp.l %d0,%d1
	jcs .L141
	mvz.b 5(%a1),%d1
	move.l %d0,%d4
	clr.l %d3
	remu.l %d0,%d2:%d1
	sub.l %d2,%d4
.L126:
	mvz.b 1(%a1),%d1
	cmp.l %d1,%d0
	jcc .L116
	move.l %d0,%d1
.L116:
	move.l %d4,%d2
	add.l %d3,%d2
	remu.l %d0,%d7:%d2
	move.l %d7,%a0
	add.l %d0,%a0
	tst.l %d1
	jeq .L127
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
.L117:
	mvz.b 2(%a1),%d1
	cmp.l %d1,%d0
	jcc .L118
	move.l %d0,%d1
.L118:
	tst.l %d1
	jne .L119
	mvz.b 6(%a1),%d5
	mov3q.l #2,%d6
	cmp.l %d5,%d6
	jeq .L120
	clr.l %d7
.L121:
	mov3q.l #3,%d1
	cmp.l %d5,%d1
	jeq .L123
	subq.l #1,%d5
	tst.l %d5
	jne .L124
	eor.l %d7,%d2
.L125:
	tst.l %d2
	jeq .L120
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
.L120:
	addq.l #1,%d3
	cmp.l %d0,%d3
	jne .L126
.L112:
	movem.l (%sp),#7420
	lea (36,%sp),%sp
	rts
.L119:
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
	jne .L121
	and.l %d1,%d2
	jra .L125
.L127:
	clr.l %d2
	jra .L117
.L124:
	or.l %d7,%d2
	jra .L125
.L123:
	mov3q.l #1,%d1
	eor.l %d1,%d7
	and.l %d7,%d2
	jra .L125
.L141:
	mvz.b 5(%a1),%d1
	moveq #64,%d0
	clr.l %d3
	move.l %d0,%d4
	remu.l %d0,%d2:%d1
	sub.l %d2,%d4
	jra .L126
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
	jeq .L142
	move.l %d0,%a0
	move.b (%a0),%d1
	btst #0,%d1
	jne .L196
.L142:
	movem.l -72(%fp),#15612
	unlk %fp
	rts
.L196:
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
	jeq .L144
	move.b 80(%a0,%d3.l),%d2
	jeq .L142
.L198:
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
	jcc .L146
	moveq #64,%d2
.L146:
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
.L161:
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
	jeq .L147
	tst.b %d3
	jeq .L197
.L149:
	addq.l #1,%d1
	addq.l #2,%a2
	addq.l #2,%a3
	add.l #32,%d0
	moveq #64,%d2
	cmp.l %d1,%d2
	jne .L161
.L199:
	tst.l %a5
	jeq .L142
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
	jeq .L142
	mvz.b 269161676,%d0
	cmp.l 8(%fp),%d0
	jne .L142
	clr.l -(%sp)
	jsr 1073957844
	movem.l -72(%fp),#15612
	addq.l #4,%sp
	unlk %fp
	rts
.L144:
	move.l #36435,%a1
	move.b (%a0,%a1.l),%d2
	jeq .L142
	jra .L198
.L197:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	or.l %d2,%d3
	mvz.b %d3,%d7
	cmp.l %d7,%d4
	jeq .L150
	move.b %d3,(%a0)
	move.l -24(%fp),%a0
	move.l -32(%fp),%d4
	move.b %d3,(%a0,%d4.l)
.L150:
	move.l -32(%fp),%d7
	not.l %d2
	move.l -28(%fp),%a0
	lea (%a4,%d7.l),%a5
	move.b %d2,%d7
	add.l -32(%fp),%a0
.L152:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	and.l %d7,%d3
	mvz.b %d3,%d2
	cmp.l %d2,%d4
	jeq .L151
	move.b %d3,(%a0)
	move.b %d3,(%a1,%a0.l)
.L151:
	addq.l #8,%a0
	cmp.l %a0,%a5
	jne .L152
	move.l %a2,%a0
	tst.b -(%a0)
	jeq .L153
	clr.b %d2
	clr.b (%a0)
	move.b %d2,-1(%a3)
.L153:
	tst.b (%a2)
	jeq .L155
	clr.b (%a2)
	clr.b (%a3)
.L155:
	mov3q.l #1,%a5
	addq.l #1,%d1
	addq.l #2,%a2
	addq.l #2,%a3
	add.l #32,%d0
	moveq #64,%d2
	cmp.l %d1,%d2
	jne .L161
	jra .L199
.L147:
	tst.b %d3
	jeq .L149
	move.l -32(%fp),%d7
	not.l %d2
	lea (%a4,%d7.l),%a5
	move.b %d2,%d7
.L158:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	and.l %d7,%d3
	mvz.b %d3,%d2
	cmp.l %d2,%d4
	jeq .L157
	move.b %d3,(%a0)
	move.b %d3,(%a1,%a0.l)
.L157:
	addq.l #8,%a0
	cmp.l %a0,%a5
	jne .L158
	move.l %d0,%a0
	lea (-32,%a0),%a0
.L160:
	mvz.b (%a0),%d2
	cmp.l #255,%d2
	jeq .L159
	st %d4
	move.b #-1,(%a0)
	move.b %d4,(%a1,%a0.l)
.L159:
	addq.l #1,%a0
	cmp.l %a0,%d0
	jne .L160
	tst.b (%a2)
	jeq .L155
	clr.b (%a2)
	clr.b (%a3)
	jra .L155
	.size	apply.isra.0, .-apply.isra.0
	.align	2
	.globl	es_length_changed
	.type	es_length_changed, @function
es_length_changed:
	move.l %a2,-(%sp)
	move.l %d2,-(%sp)
	clr.l %d2
	lea (apply.isra.0),%a2
.L201:
	move.l %d2,-(%sp)
	jsr (%a2)
	addq.l #1,%d2
	addq.l #4,%sp
	moveq #8,%d0
	cmp.l %d2,%d0
	jne .L201
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
	jeq .L205
	move.l -2147483440,%d0
	mov3q.l #2,%d1
	cmp.l %d0,%d1
	jcs .L221
	lea (levels.1),%a0
	move.l 1175263030,%d5
	mvz.b (%a0,%d0.l),%d3
	tst.l %d5
	jne .L222
.L213:
	clr.l %d0
	cmp.l led_shown.l,%d5
	jeq .L223
.L209:
	mvz.w #1888,%d1
	cmp.l 1074501324.l,%d1
	jcs .L205
	btst #0,%d0
	jeq .L210
	move.l %d3,%d4
	clr.l %d2
.L212:
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
	jne .L212
	move.l %d5,led_shown
	move.l %d3,led_level
.L205:
	movem.l (%sp),#60
	lea (16,%sp),%sp
	rts
.L221:
	mov3q.l #2,%d0
	lea (levels.1),%a0
	move.l 1175263030,%d5
	mvz.b (%a0,%d0.l),%d3
	tst.l %d5
	jeq .L213
	jra .L222
.L223:
	cmp.l led_level.l,%d3
	jne .L209
	movem.l (%sp),#60
	lea (16,%sp),%sp
	rts
.L222:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr euc_on
	addq.l #4,%sp
	move.l %d0,%d5
	cmp.l led_shown.l,%d5
	jne .L209
	jra .L223
.L210:
	clr.l %d4
	clr.l %d2
	jra .L212
	.size	es_led_sync, .-es_led_sync
	.align	2
	.globl	es_rec_blocked
	.type	es_rec_blocked, @function
es_rec_blocked:
	move.l 1187521622,%d1
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	cmp.l #1074667999,%d1
	jls .L227
	add.l #-1074668000,%d1
	move.l %d1,%d2
	move.l #635712,%d3
	remu.l %d3,%d0:%d2
	divu.l %d3,%d2
	move.l %d2,%a0
	tst.l %d0
	jne .L227
	cmp.l #10171391,%d1
	jhi .L227
	mvz.b 269161680,%d1
	moveq #15,%d2
	cmp.l %d1,%d2
	jcs .L224
	mov3q.l #7,%d3
	cmp.l 12(%sp),%d3
	jcs .L224
	tst.l -2147483630
	jne .L224
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
.L224:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L227:
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
	jeq .L232
	tst.l 1175352268
	jeq .L234
	tst.l 1175352292
	jne .L235
.L234:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L235
	move.l %d0,%a0
	mov3q.l #1,%d1
	move.b (%a0),%d0
	and.l %d1,%d0
.L232:
	rts
.L235:
	clr.l %d0
	rts
	.size	es_blocked, .-es_blocked
	.align	2
	.globl	es_shift_blocked
	.type	es_shift_blocked, @function
es_shift_blocked:
	move.l -2147483630,%d0
	tst.l %d0
	jne .L253
	tst.l 1175352268
	jeq .L252
	tst.l 1175352292
	jne .L250
.L252:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr euc_on
	addq.l #4,%sp
.L250:
	rts
.L253:
	clr.l %d0
	rts
	.size	es_shift_blocked, .-es_shift_blocked
	.align	2
	.globl	es_sel_count
	.type	es_sel_count, @function
es_sel_count:
	tst.l -2147483630
	jeq .L261
	mov3q.l #3,%d0
	rts
.L261:
	mov3q.l #7,%d0
	rts
	.size	es_sel_count, .-es_sel_count
	.align	2
	.globl	es_sel_row
	.type	es_sel_row, @function
es_sel_row:
	tst.b es_mode.l
	jeq .L265
	tst.l -2147483630
	jne .L265
	mov3q.l #6,%d0
	rts
.L265:
	move.l 1175262960,%d0
	rts
	.size	es_sel_row, .-es_sel_row
	.align	2
	.globl	es_sel_pick
	.type	es_sel_pick, @function
es_sel_pick:
	move.l %d2,-(%sp)
	tst.l -2147483630
	jne .L271
	move.l 1187500856,%d1
	mov3q.l #6,%d2
	cmp.l %d1,%d2
	seq %d0
	neg.l %d0
	move.b %d0,es_mode
	cmp.l %d1,%d2
	jeq .L274
.L271:
	move.l 8(%sp),%d0
	move.l (%sp)+,%d2
	rts
.L274:
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
	jeq .L276
	move.b (%a6),%d0
	btst #0,%d0
	jne .L297
.L276:
	movem.l (%sp),#16412
	mov3q.l #1,1187497772
	lea (40,%sp),%sp
	rts
.L297:
	mvz.b 1(%a6),%d0
	moveq #9,%d1
	cmp.l %d0,%d1
	jcc .L283
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
.L277:
	moveq #10,%d2
	remu.l %d2,%d1:%d0
	add.l #48,%d1
	move.b %d1,(%a1)
	clr.b (%a0)
	lea (32,%sp),%a0
	move.l %a0,20(%sp)
	move.b 28(%sp),%d0
	jeq .L284
	clr.l %d1
	lea (28,%sp),%a1
.L279:
	move.l %d1,16(%sp)
	move.b %d0,(%a0)+
	addq.l #1,%d1
	move.b (%a1,%d1.l),%d0
	jne .L279
	move.l 16(%sp),%d0
	addq.l #2,%d0
	move.l 20(%sp),%a0
	add.l %d1,%a0
	move.l %d0,16(%sp)
.L278:
	move.b #58,(%a0)
	moveq #9,%d1
	mvz.b 2(%a6),%d0
	cmp.l %d0,%d1
	jcc .L285
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
.L280:
	moveq #10,%d4
	remu.l %d4,%d1:%d0
	add.l #48,%d1
	move.b %d1,(%a0)
	clr.b (%a1)
	move.b 28(%sp),%d0
	jeq .L286
	move.l 16(%sp),%a0
	move.l 20(%sp),%d1
	lea (28,%sp),%a1
	sub.l %a0,%a1
	lea (%a0,%d1.l),%a6
.L282:
	move.b %d0,(%a6)+
	addq.l #1,%a0
	move.b (%a1,%a0.l),%d0
	jne .L282
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
.L298:
	mov3q.l #1,1187497772
	movem.l (%sp),#16412
	lea (40,%sp),%sp
	rts
.L283:
	lea (29,%sp),%a0
	move.l %a0,24(%sp)
	lea (28,%sp),%a1
	jra .L277
.L285:
	move.l 24(%sp),%a1
	lea (28,%sp),%a0
	jra .L280
.L284:
	mov3q.l #1,16(%sp)
	jra .L278
.L286:
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
	jra .L298
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
	jeq .L299
	move.l %d0,%a0
	move.b (%a0),%d1
	btst #0,%d1
	jeq .L301
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
.L299:
	move.l (%sp)+,%d2
	addq.l #4,%sp
	rts
.L301:
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
	jra .L299
	.size	es_body, .-es_body
	.align	2
	.globl	es_tte_right
	.type	es_tte_right, @function
es_tte_right:
	mov3q.l #1,%d0
	cmp.l 8(%sp),%d0
	jeq .L315
.L308:
	rts
.L315:
	tst.l 1175352268
	jeq .L308
	tst.l 1175352292
	jne .L308
	mov3q.l #1,4(%sp)
	jra open_page
	.size	es_tte_right, .-es_tte_right
	.align	2
	.globl	es_func_right
	.type	es_func_right, @function
es_func_right:
	tst.b es_mode.l
	jeq .L319
	tst.l -2147483630
	jne .L319
	mov3q.l #1,%d0
	cmp.l 4(%sp),%d0
	jeq .L323
	mov3q.l #1,%d0
	rts
.L319:
	clr.l %d0
	rts
.L323:
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
	jeq .L324
	moveq #50,%d1
	cmp.l 12(%sp),%d1
	jeq .L333
	subq.l #1,%d0
	tst.l %d0
	jeq .L334
.L324:
	move.l (%sp)+,%d2
	addq.l #4,%sp
	rts
.L334:
	moveq #49,%d2
	cmp.l 12(%sp),%d2
	jne .L324
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L324
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
.L333:
	tst.l %d0
	jne .L324
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
	jeq .L327
	move.l (%sp)+,%d2
	addq.l #4,%sp
	jmp 1074249808
.L327:
	tst.b es_mode.l
	jeq .L324
	tst.l -2147483630
	jne .L324
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
	jeq .L335
	mov3q.l #6,%d0
	cmp.l %a0,%d0
	jcs .L335
	mov3q.l #2,%d2
	cmp.l %a0,%d2
	jeq .L335
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
	jeq .L335
	move.l 1187521622,%a1
	move.l #36437,%a2
	mvz.b 269161680,%d2
	move.l %d2,16(%sp)
	mulu.w #36568,%d2
	add.l %d2,%a1
	tst.b (%a1,%a2.l)
	jeq .L337
	move.w 22(%sp),%d2
	mulu.w #2330,%d2
	move.b 80(%a1,%d2.l),%d2
	move.w %d2,%a1
.L338:
	mov3q.l #6,%d2
	cmp.l %a0,%d2
	jeq .L344
	move.w %a1,%d2
	mvz.b %d2,%d2
	move.l %d2,%a1
	moveq #64,%d2
	cmp.l %a1,%d2
	jcc .L340
	move.w #64,%a1
.L340:
	mov3q.l #1,%d2
	cmp.l %a0,%d2
	jcc .L339
	subq.l #1,%a1
	tst.l %a1
	jlt .L353
.L339:
	lea (field.0),%a2
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jlt .L354
.L342:
	cmp.l %d1,%a1
	jge .L343
	move.l %a1,%d1
.L343:
	mvz.b %d1,%d2
	cmp.l %d0,%d2
	jeq .L335
	move.b %d1,(%a0)
	move.l 20(%sp),-(%sp)
	jsr (apply.isra.0)
	addq.l #4,%sp
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	lea (16,%sp),%sp
	jra draw
.L335:
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	lea (16,%sp),%sp
	rts
.L354:
	clr.l %d1
	jra .L342
.L337:
	mvz.w #36435,%d2
	move.b (%a1,%d2.l),%d2
	move.w %d2,%a1
	jra .L338
.L344:
	lea (field.0),%a2
	mov3q.l #3,%a1
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jge .L342
	jra .L354
.L353:
	lea (field.0),%a2
	sub.l %a1,%a1
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jge .L342
	jra .L354
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
