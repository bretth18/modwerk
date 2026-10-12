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
	.type	where.part.0.constprop.0, @function
where.part.0.constprop.0:
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	move.l 16(%sp),%d1
	move.l 12(%sp),%d0
	cmp.l #2330,%d1
	jeq .L33
	add.l #-1074668000,%d0
	cmp.l #10171391,%d0
	jhi .L27
	move.l #635712,%d2
	remu.l %d2,%d3:%d0
	divu.l %d2,%d0
	move.l 20(%sp),%a1
	move.l %d3,%a0
	move.l %d0,(%a1)
	cmp.l #6322,%d1
	jeq .L34
	cmp.l #585087,%d3
	jhi .L27
	mvz.w #36568,%d2
	move.l %d3,%d0
	move.l 24(%sp),%a0
	remu.l %d2,%d3:%d0
	divu.l %d2,%d0
	move.l %d0,(%a0)
	move.l %d3,%a0
	cmp.l %d1,%d2
	jeq .L35
	cmp.l #2048,%d1
	jeq .L36
.L24:
	mvz.w #2330,%d2
	move.l %a0,%d1
	remu.l %d2,%d0:%d1
	divu.l %d2,%d1
	tst.l %d0
	jne .L27
	cmp.l #18639,%a0
	jhi .L14
	move.l 28(%sp),%a0
	move.l %d1,(%a0)
.L29:
	mov3q.l #3,%d0
.L14:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L33:
	cmp.l #268525901,%d0
	jls .L27
	cmp.l #269110989,%d0
	jls .L37
	add.l #-1074668000,%d0
	cmp.l #10171391,%d0
	jhi .L27
	move.l #635712,%d2
	remu.l %d2,%d1:%d0
	divu.l %d2,%d0
	move.l 20(%sp),%a0
	move.l %d0,(%a0)
	cmp.l #585087,%d1
	jls .L28
.L27:
	clr.l %d0
.L38:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L37:
	mvz.w #36568,%d2
	add.l #-268525902,%d0
	move.l %d0,%d1
	remu.l %d2,%d3:%d1
	divu.l %d2,%d1
	mvz.w #2330,%d2
	move.l %d3,%a0
	remu.l %d2,%d0:%d3
	divu.l %d2,%d3
	tst.l %d0
	jne .L27
	cmp.l #18639,%a0
	jhi .L14
	move.l 24(%sp),%a0
	mov3q.l #4,%d0
	move.l %d1,(%a0)
	move.l 28(%sp),%a0
	move.l (%sp)+,%d2
	move.l %d3,(%a0)
	move.l (%sp)+,%d3
	rts
.L36:
	moveq #88,%d0
	cmp.l %d3,%d0
	jcc .L27
	lea (-89,%a0),%a0
	jra .L24
.L34:
	cmp.l #585087,%d3
	jls .L27
	cmp.l #610377,%d3
	jls .L26
	move.l #610378,%d0
.L22:
	mvz.w #6322,%d3
	move.l %a0,%d1
	sub.l %d0,%d1
	move.l %d1,%d2
	remu.l %d3,%d0:%d2
	divu.l %d3,%d2
	tst.l %d0
	jne .L27
	cmp.l #25287,%d1
	jhi .L14
	cmp.l #610377,%a0
	shi %d0
	move.l 24(%sp),%a0
	mvs.b %d0,%d0
	neg.l %d0
	move.l %d0,(%a0)
	move.l 28(%sp),%a0
	mov3q.l #3,%d0
	move.l %d2,(%a0)
	jra .L14
.L26:
	move.l #585088,%d0
	jra .L22
.L28:
	mvz.w #36568,%d2
	move.l 24(%sp),%a0
	remu.l %d2,%d0:%d1
	divu.l %d2,%d1
	move.l %d1,(%a0)
	move.l %d0,%a0
	jra .L24
.L35:
	tst.l %d3
	jeq .L29
	clr.l %d0
	jra .L38
	.size	where.part.0.constprop.0, .-where.part.0.constprop.0
	.align	2
	.globl	es_close_cb
	.type	es_close_cb, @function
es_close_cb:
	tst.l es_window
	jeq .L39
	pea es_window
	jsr 1074093492
	pea es_page_layer
	jsr 1073943660
	clr.l es_window
	mov3q.l #1,1187497772
	mov3q.l #-1,-(%sp)
	jsr 1074059592
	lea (12,%sp),%sp
.L39:
	rts
	.size	es_close_cb, .-es_close_cb
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
	jcc .L44
	moveq #99,%d0
.L44:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L46
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
.L46:
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
	jcc .L50
	moveq #99,%d0
.L50:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L52
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
.L52:
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
	jcc .L56
	moveq #99,%d0
.L56:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L58
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
.L58:
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
	jcc .L62
	moveq #99,%d0
.L62:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L64
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
.L64:
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
	jcc .L68
	moveq #99,%d0
.L68:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L70
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
.L70:
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
	jcc .L74
	moveq #99,%d0
.L74:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L76
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
.L76:
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
	.type	lfo_row, @function
lfo_row:
	tst.l 4(%sp)
	jne .L80
	mvz.b 269472000,%d0
	moveq #69,%d1
	cmp.l %d0,%d1
	jne .L91
	mvz.b 269472001,%d0
	moveq #83,%d1
	cmp.l %d0,%d1
	jne .L91
	mvz.b 269472002,%d0
	moveq #76,%d1
	cmp.l %d0,%d1
	jne .L91
	mvz.b 269472003,%d0
	moveq #49,%d1
	cmp.l %d0,%d1
	jne .L91
	move.l #269472016,%d0
.L84:
	move.l 8(%sp),%a1
	move.l 12(%sp),%a0
	lea (%a0,%a1.l*4),%a0
	move.l %a0,%d1
	lsl.l #3,%d1
	move.l %d1,%a0
	add.l 16(%sp),%a0
	lea (%a0,%a0.l*2),%a0
	add.l %a0,%d0
	rts
.L80:
	mvz.b 269473792,%d0
	moveq #69,%d1
	cmp.l %d0,%d1
	jne .L95
	mvz.b 269473793,%d0
	moveq #83,%d1
	cmp.l %d0,%d1
	jne .L95
	mvz.b 269473794,%d0
	cmp.l %d0,%d1
	jne .L95
	mvz.b 269473795,%d0
	moveq #49,%d1
	cmp.l %d0,%d1
	jne .L95
	move.l #269473808,%d0
.L100:
	move.l 8(%sp),%a1
	move.l 12(%sp),%a0
	lea (%a0,%a1.l*4),%a0
	move.l %a0,%d1
	lsl.l #3,%d1
	move.l %d1,%a0
	add.l 16(%sp),%a0
	lea (%a0,%a0.l*2),%a0
	add.l %a0,%d0
	rts
.L95:
	move.l #269473808,%a0
.L85:
	clr.b (%a0)+
	cmp.l #269475344,%a0
	jne .L85
	moveq #69,%d0
	moveq #83,%d1
	move.b %d0,269473792
	moveq #49,%d0
	move.b %d1,269473793
	move.b %d1,269473794
	move.b %d0,269473795
	move.l #269473808,%d0
	jra .L100
.L91:
	move.l #269472016,%a0
.L87:
	clr.b (%a0)+
	cmp.l #269473552,%a0
	jne .L87
	moveq #69,%d1
	moveq #83,%d0
	move.b %d1,269472000
	move.b %d0,269472001
	moveq #76,%d1
	moveq #49,%d0
	move.b %d1,269472002
	move.b %d0,269472003
	move.l #269472016,%d0
	jra .L84
	.size	lfo_row, .-lfo_row
	.align	2
	.type	track_out, @function
track_out:
	lea (-20,%sp),%sp
	mov3q.l #1,%d0
	movem.l #1036,(%sp)
	move.l 36(%sp),%d2
	cmp.l 24(%sp),%d0
	jeq .L122
	lea undo_e,%a0
	lea undo_l,%a2
	move.l %a0,12(%sp)
	move.l %a2,16(%sp)
	jsr nv_ensure
	move.l 28(%sp),%d0
	move.l %d2,%a0
	add.l #33681922,%a0
	move.l %d2,%d1
	lsl.l #4,%d0
	lsl.l #3,%d1
	move.l 12(%sp),%a1
	add.l 32(%sp),%d0
	add.l %d1,%a1
	lsl.l #3,%d0
	add.l %d0,%a0
	move.l %a0,%d0
	lsl.l #3,%d0
	move.l %d0,%a0
	move.b (%a0),(%a1)
	move.b 1(%a0),1(%a1)
	move.b 2(%a0),2(%a1)
	move.b 3(%a0),3(%a1)
	move.b 4(%a0),4(%a1)
	move.b 5(%a0),5(%a1)
	move.b 6(%a0),6(%a1)
	move.b 7(%a0),7(%a1)
	tst.l 40(%sp)
	jne .L123
.L103:
	mov3q.l #1,%d0
	cmp.l 24(%sp),%d0
	jeq .L124
.L107:
	move.b %d2,undo_t
	movem.l (%sp),#1036
	lea (20,%sp),%sp
	rts
.L123:
	mvz.w #36568,%d1
	move.l 32(%sp),%d0
	move.l #635712,%d3
	muls.l %d1,%d0
	move.l 28(%sp),%d1
	muls.l %d3,%d1
	mov3q.l #3,%d3
	move.l %d0,%a0
	add.l #1074704439,%a0
	move.b (%a0,%d1.l),%d0
	mvz.b 269472000,%d1
	and.l %d3,%d0
	moveq #69,%d3
	cmp.l %d1,%d3
	jne .L112
	mvz.b 269472001,%d1
	moveq #83,%d3
	cmp.l %d1,%d3
	jne .L112
	mvz.b 269472002,%d1
	moveq #76,%d3
	cmp.l %d1,%d3
	jne .L112
	mvz.b 269472003,%d1
	moveq #49,%d3
	cmp.l %d1,%d3
	jne .L112
	move.l 28(%sp),%d1
	move.l %d0,%a0
	move.l %d2,%a2
	lea (%a0,%d1.l*4),%a1
	lea (%a2,%d2.l*2),%a0
	move.l %a1,%d0
	lsl.l #3,%d0
	add.l 16(%sp),%a0
	move.l %d0,%a1
	add.l %d2,%a1
	lea (%a1,%a1.l*2),%a1
	add.l #269472016,%a1
	move.b (%a1),(%a0)
	move.b 1(%a1),1(%a0)
	move.b 2(%a1),2(%a0)
.L125:
	mov3q.l #1,%d0
	cmp.l 24(%sp),%d0
	jne .L107
.L124:
	move.b %d2,clip_t
	movem.l (%sp),#1036
	lea (20,%sp),%sp
	rts
.L122:
	lea clip_e,%a0
	lea clip_l,%a2
	move.l %a0,12(%sp)
	move.l %a2,16(%sp)
	jsr nv_ensure
	move.l 28(%sp),%d0
	move.l %d2,%a0
	add.l #33681922,%a0
	move.l %d2,%d1
	lsl.l #4,%d0
	lsl.l #3,%d1
	move.l 12(%sp),%a1
	add.l 32(%sp),%d0
	add.l %d1,%a1
	lsl.l #3,%d0
	add.l %d0,%a0
	move.l %a0,%d0
	lsl.l #3,%d0
	move.l %d0,%a0
	move.b (%a0),(%a1)
	move.b 1(%a0),1(%a1)
	move.b 2(%a0),2(%a1)
	move.b 3(%a0),3(%a1)
	move.b 4(%a0),4(%a1)
	move.b 5(%a0),5(%a1)
	move.b 6(%a0),6(%a1)
	move.b 7(%a0),7(%a1)
	tst.l 40(%sp)
	jeq .L103
	jra .L123
.L112:
	move.l #269472016,%a0
.L106:
	clr.b (%a0)+
	cmp.l #269473552,%a0
	jne .L106
	moveq #69,%d1
	moveq #83,%d3
	move.l %d0,%a0
	move.l %d2,%a2
	move.b %d1,269472000
	move.b %d3,269472001
	moveq #76,%d1
	moveq #49,%d3
	move.b %d1,269472002
	move.b %d3,269472003
	move.l 28(%sp),%d1
	lea (%a0,%d1.l*4),%a1
	lea (%a2,%d2.l*2),%a0
	move.l %a1,%d0
	lsl.l #3,%d0
	add.l 16(%sp),%a0
	move.l %d0,%a1
	add.l %d2,%a1
	lea (%a1,%a1.l*2),%a1
	add.l #269472016,%a1
	move.b (%a1),(%a0)
	move.b 1(%a1),1(%a0)
	move.b 2(%a1),2(%a0)
	jra .L125
	.size	track_out, .-track_out
	.align	2
	.globl	es_step
	.type	es_step, @function
es_step:
	lea (-12,%sp),%sp
	moveq #64,%d1
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	move.l 24(%sp),%a0
	mvz.b (%a0),%d0
	cmp.l %d0,%d1
	jcs .L136
	tst.l %d0
	jeq .L126
	cmp.l 28(%sp),%d0
	jls .L137
.L149:
	mvz.b 1(%a0),%d2
	move.l %d2,%a1
	cmp.l %d2,%d0
	jcs .L146
	mvz.b 5(%a0),%d1
	move.l 28(%sp),%d3
	add.l %d0,%d3
	remu.l %d0,%d2:%d1
	move.l %d3,%d1
	sub.l %d2,%d1
	move.l %d1,%d3
	remu.l %d0,%d2:%d3
	move.l %d2,%d1
	add.l %d0,%d1
	move.l %d1,8(%sp)
	tst.l %a1
	jeq .L130
.L151:
	mvz.b 3(%a0),%d1
	remu.l %d0,%d3:%d1
	move.l 8(%sp),%d1
	sub.l %d3,%d1
	move.l %d1,%d2
	remu.l %d0,%d3:%d2
	move.w %a1,%d2
	move.l %d3,%d1
	mulu.w %d2,%d1
	move.l %d1,%d3
	remu.l %d0,%d2:%d3
	cmp.l %a1,%d2
	scs %d1
	mvs.b %d1,%d1
	neg.l %d1
	move.l %d1,%a1
.L130:
	mvz.b 2(%a0),%d1
	cmp.l %d1,%d0
	jcs .L147
	tst.l %d1
	jeq .L132
.L150:
	mvz.b 4(%a0),%d3
	remu.l %d0,%d2:%d3
	move.l 8(%sp),%d3
	sub.l %d2,%d3
	move.l %d3,12(%sp)
	remu.l %d0,%d2:%d3
	move.w %d2,%d3
	mulu.w %d1,%d3
	move.l %d3,8(%sp)
	remu.l %d0,%d2:%d3
	cmp.l %d1,%d2
	scs %d1
	mvs.b %d1,%d1
	neg.l %d1
.L132:
	mvz.b 6(%a0),%d0
	mov3q.l #2,%d3
	cmp.l %d0,%d3
	jeq .L143
	mov3q.l #3,%d2
	cmp.l %d0,%d2
	jeq .L134
	subq.l #1,%d0
	tst.l %d0
	jeq .L148
	move.l %a1,%d0
	or.l %d1,%d0
.L126:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	lea (12,%sp),%sp
	rts
.L136:
	moveq #64,%d0
	cmp.l 28(%sp),%d0
	jhi .L149
.L137:
	move.l (%sp)+,%d2
	clr.l %d0
	move.l (%sp)+,%d3
	lea (12,%sp),%sp
	rts
.L147:
	move.l %d0,%d1
	tst.l %d1
	jeq .L132
	jra .L150
.L146:
	mvz.b 5(%a0),%d1
	move.l 28(%sp),%d3
	add.l %d0,%d3
	move.l %d0,%a1
	remu.l %d0,%d2:%d1
	move.l %d3,%d1
	sub.l %d2,%d1
	move.l %d1,%d3
	remu.l %d0,%d2:%d3
	move.l %d2,%d1
	add.l %d0,%d1
	move.l %d1,8(%sp)
	tst.l %a1
	jeq .L130
	jra .L151
.L134:
	mov3q.l #1,%d0
	eor.l %d0,%d1
.L143:
	move.l %a1,%d0
	and.l %d1,%d0
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	lea (12,%sp),%sp
	rts
.L148:
	move.l %a1,%d0
	eor.l %d1,%d0
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	lea (12,%sp),%sp
	rts
	.size	es_step, .-es_step
	.align	2
	.globl	es_mask
	.type	es_mask, @function
es_mask:
	lea (-24,%sp),%sp
	movem.l #1148,(%sp)
	move.l 28(%sp),%d3
	move.l 32(%sp),%d4
	move.l %d4,%d0
	move.l %d4,%a0
	addq.l #8,%d0
.L153:
	clr.b (%a0)+
	cmp.l %d0,%a0
	jne .L153
	clr.l %d2
	lea es_step,%a2
.L155:
	move.l %d2,-(%sp)
	move.l %d3,-(%sp)
	jsr (%a2)
	addq.l #8,%sp
	tst.l %d0
	jeq .L154
	mov3q.l #7,%d6
	and.l %d2,%d6
	move.l %d2,%d0
	lsr.l #3,%d0
	mov3q.l #7,%a0
	sub.l %d0,%a0
	mov3q.l #1,%d0
	move.b (%a0,%d4.l),%d1
	lsl.l %d6,%d0
	or.l %d1,%d0
	move.b %d0,(%a0,%d4.l)
.L154:
	addq.l #1,%d2
	moveq #64,%d0
	cmp.l %d2,%d0
	jne .L155
	movem.l (%sp),#1148
	lea (24,%sp),%sp
	rts
	.size	es_mask, .-es_mask
	.align	2
	.globl	es_modulate
	.type	es_modulate, @function
es_modulate:
	lea (-20,%sp),%sp
	movem.l #1052,(%sp)
	move.l 24(%sp),%a0
	move.l 28(%sp),%a1
	move.b (%a0),%d3
	mvz.b 1(%a0),%d2
	mvz.b %d3,%d0
	move.l %d0,%d1
	muls.l (%a1),%d1
	tst.l %d1
	jlt .L164
	add.l #8192,%d1
	moveq #14,%d4
	asr.l %d4,%d1
	add.l %d1,%d2
	cmp.l %d0,%d2
	jle .L205
.L193:
	move.b %d3,16(%sp)
.L167:
	move.b 16(%sp),1(%a0)
	mvz.b 2(%a0),%d2
	move.l 4(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jlt .L168
.L207:
	add.l #8192,%d1
	moveq #14,%d4
	asr.l %d4,%d1
	add.l %d1,%d2
.L169:
	cmp.l %d0,%d2
	jgt .L171
	move.b %d2,%d3
.L171:
	move.b %d3,2(%a0)
	move.l %d0,%d2
	subq.l #1,%d2
	mvz.b 3(%a0),%d3
	move.l 8(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jlt .L172
.L209:
	add.l #8192,%d1
	moveq #14,%d4
	asr.l %d4,%d1
	add.l %d1,%d3
	tst.l %d2
	jlt .L206
.L174:
	cmp.l %d3,%d2
	jge .L177
.L217:
	move.b %d2,16(%sp)
.L176:
	move.b 16(%sp),3(%a0)
	mvz.b 4(%a0),%d3
	move.l 12(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jlt .L178
.L211:
	add.l #8192,%d1
	moveq #14,%d4
	asr.l %d4,%d1
	add.l %d1,%d3
.L179:
	cmp.l %d3,%d2
	jge .L182
	move.b %d2,16(%sp)
.L181:
	move.b 16(%sp),4(%a0)
	lea (16,%a1),%a2
	mvz.b 5(%a0),%d1
	muls.l (%a2),%d0
	tst.l %d0
	jlt .L183
.L213:
	add.l #8192,%d0
	moveq #14,%d3
	asr.l %d3,%d0
	add.l %d0,%d1
.L184:
	cmp.l %d1,%d2
	jge .L187
	move.b %d2,%d3
.L186:
	move.b %d3,5(%a0)
	mvz.b 6(%a0),%d0
	move.l 20(%a1),%d2
	move.l %d2,%d1
	lsl.l #2,%d1
	btst #29,%d2
	jne .L188
.L215:
	add.l #8192,%d1
	moveq #14,%d2
	asr.l %d2,%d1
	add.l %d1,%d0
.L189:
	mov3q.l #3,%d4
	cmp.l %d0,%d4
	jge .L191
	moveq #3,%d0
.L191:
	move.b %d0,6(%a0)
	movem.l (%sp),#1052
	lea (20,%sp),%sp
	rts
.L205:
	move.b %d2,16(%sp)
	mvz.b 2(%a0),%d2
	move.b 16(%sp),1(%a0)
	move.l 4(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jge .L207
.L168:
	mvz.w #8192,%d4
	sub.l %d1,%d4
	move.l %d4,16(%sp)
	tst.l %d4
	jlt .L208
.L170:
	moveq #14,%d4
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	sub.l %d1,%d2
	jpl .L169
	clr.b %d3
	move.l %d0,%d2
	subq.l #1,%d2
	move.b %d3,2(%a0)
	mvz.b 3(%a0),%d3
	move.l 8(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jge .L209
.L172:
	mvz.w #8192,%d4
	sub.l %d1,%d4
	move.l %d4,16(%sp)
	tst.l %d4
	jlt .L210
	moveq #14,%d4
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d3
	move.b %d4,16(%sp)
	tst.l %d3
	jge .L174
.L202:
	move.b 16(%sp),3(%a0)
	mvz.b 4(%a0),%d3
	move.l 12(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jge .L211
.L178:
	mvz.w #8192,%d4
	sub.l %d1,%d4
	move.l %d4,16(%sp)
	tst.l %d4
	jlt .L212
	moveq #14,%d4
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d3
	move.b %d4,16(%sp)
	tst.l %d3
	jge .L179
.L203:
	move.b 16(%sp),4(%a0)
	lea (16,%a1),%a2
	mvz.b 5(%a0),%d1
	muls.l (%a2),%d0
	tst.l %d0
	jge .L213
.L183:
	mvz.w #8192,%d3
	sub.l %d0,%d3
	jmi .L214
	moveq #14,%d4
	move.l %d3,%d0
	asr.l %d4,%d0
	clr.b %d3
	sub.l %d0,%d1
	jpl .L184
.L204:
	move.b %d3,5(%a0)
	mvz.b 6(%a0),%d0
	move.l 20(%a1),%d2
	move.l %d2,%d1
	lsl.l #2,%d1
	btst #29,%d2
	jeq .L215
.L188:
	mvz.w #8192,%d2
	sub.l %d1,%d2
	jmi .L216
	moveq #14,%d3
	asr.l %d3,%d2
	sub.l %d2,%d0
	jpl .L189
.L198:
	clr.b %d0
	move.b %d0,6(%a0)
	movem.l (%sp),#1052
	lea (20,%sp),%sp
	rts
.L206:
	clr.l %d2
	cmp.l %d3,%d2
	jlt .L217
.L177:
	move.b %d3,16(%sp)
	jra .L176
.L164:
	mvz.w #8192,%d4
	sub.l %d1,%d4
	move.l %d4,16(%sp)
	tst.l %d4
	jlt .L218
	moveq #14,%d4
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d2
	move.b %d4,16(%sp)
	tst.l %d2
	jlt .L167
.L219:
	cmp.l %d0,%d2
	jgt .L193
	jra .L205
.L187:
	move.b %d1,%d3
	jra .L186
.L182:
	move.b %d3,16(%sp)
	jra .L181
.L210:
	mvz.w #16383,%d1
	moveq #14,%d4
	add.l %d1,16(%sp)
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d3
	move.b %d4,16(%sp)
	tst.l %d3
	jlt .L202
	jra .L174
.L212:
	mvz.w #16383,%d1
	moveq #14,%d4
	add.l %d1,16(%sp)
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d3
	move.b %d4,16(%sp)
	tst.l %d3
	jlt .L203
	jra .L179
.L218:
	mvz.w #16383,%d1
	moveq #14,%d4
	add.l %d1,16(%sp)
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d2
	move.b %d4,16(%sp)
	tst.l %d2
	jlt .L167
	jra .L219
.L216:
	add.l #16383,%d2
	moveq #14,%d3
	asr.l %d3,%d2
	sub.l %d2,%d0
	jpl .L189
	jra .L198
.L214:
	add.l #16383,%d3
	moveq #14,%d4
	move.l %d3,%d0
	asr.l %d4,%d0
	clr.b %d3
	sub.l %d0,%d1
	jmi .L204
	jra .L184
.L208:
	mvz.w #16383,%d1
	add.l %d1,16(%sp)
	jra .L170
	.size	es_modulate, .-es_modulate
	.align	2
	.globl	es_entry_valid
	.type	es_entry_valid, @function
es_entry_valid:
	move.l %d2,-(%sp)
	move.l 8(%sp),%a0
	mvz.b (%a0),%d0
	and.l #-130,%d0
	tst.l %d0
	jne .L224
	mvz.b 1(%a0),%d1
	moveq #64,%d2
	cmp.l %d1,%d2
	jcs .L220
	mvz.b 2(%a0),%d1
	cmp.l %d1,%d2
	jcs .L220
	mvz.b 3(%a0),%d1
	moveq #63,%d2
	cmp.l %d1,%d2
	jcs .L220
	mvz.b 4(%a0),%d1
	cmp.l %d1,%d2
	jcs .L220
	mvz.b 5(%a0),%d1
	cmp.l %d1,%d2
	jcs .L220
	mvz.b 6(%a0),%d1
	mov3q.l #3,%d2
	cmp.l %d1,%d2
	jcs .L220
	tst.b 7(%a0)
	seq %d0
	mvs.b %d0,%d0
	neg.l %d0
.L220:
	move.l (%sp)+,%d2
	rts
.L224:
	move.l (%sp)+,%d2
	clr.l %d0
	rts
	.size	es_entry_valid, .-es_entry_valid
	.align	2
	.type	live_params, @function
live_params:
	link.w %fp,#-48
	mov3q.l #7,%d0
	movem.l #1036,(%sp)
	clr.l -24(%fp)
	clr.l -20(%fp)
	clr.l -16(%fp)
	clr.l -12(%fp)
	clr.l -8(%fp)
	clr.l -4(%fp)
	cmp.l 8(%fp),%d0
	jcs .L230
	move.l 12(%fp),%d0
	moveq #15,%d1
	or.l 16(%fp),%d0
	cmp.l %d0,%d1
	jcs .L230
	move.l 8(%fp),%a0
	clr.l %d1
	clr.l %d0
	lea (%a0,%a0.l*2),%a1
	add.l #es_lfo_tgt,%a1
.L232:
	mvz.b (%a1,%d1.l),%d2
	move.l 8(%fp),%d3
	move.l %d2,%a0
	mov3q.l #6,%d2
	muls.l %d2,%d3
	subq.l #1,%a0
	move.l %d3,-32(%fp)
	mov3q.l #5,%d3
	cmp.l %a0,%d3
	jcs .L231
	move.l -32(%fp),%a2
	add.l #es_lfo_buf,%a2
	mvs.w (%a2,%d1.l*2),%d2
	mov3q.l #1,%d0
	add.l #-16384,%d2
	add.l %d2,-24(%fp,%a0.l*4)
.L231:
	addq.l #1,%d1
	mov3q.l #3,%d3
	cmp.l %d1,%d3
	jne .L232
	tst.l %d0
	jeq .L227
	move.l 12(%fp),%d0
	move.l 8(%fp),%a0
	add.l #33681922,%a0
	lsl.l #4,%d0
	add.l 16(%fp),%d0
	mvz.w %d0,%d0
	lsl.l #3,%d0
	add.l %d0,%a0
	move.l %a0,%d0
	lsl.l #3,%d0
	move.l %d0,-(%sp)
	move.l %d0,-36(%fp)
	jsr es_entry_valid
	addq.l #4,%sp
	move.l -36(%fp),%a0
	tst.l %d0
	jeq .L227
	move.b (%a0),%d1
	and.l #129,%d1
	cmp.l #129,%d1
	jeq .L249
.L230:
	clr.l %d0
.L227:
	movem.l -48(%fp),#1036
	unlk %fp
	rts
.L249:
	mvz.w #36568,%d2
	move.l 16(%fp),%d1
	move.l 12(%fp),%d3
	muls.l %d2,%d1
	move.l #635712,%d2
	muls.l %d2,%d3
	move.l %d1,%a1
	add.l #1074668000,%a1
	add.l %d3,%a1
	mvz.w #36437,%d3
	tst.b (%a1,%d3.l)
	jeq .L234
	mvz.w #2330,%d2
	move.l 8(%fp),%d1
	muls.l %d2,%d1
	move.b 80(%a1,%d1.l),%d1
.L235:
	tst.b %d1
	jeq .L230
	mvz.b %d1,%d3
	moveq #64,%d2
	cmp.l %d3,%d2
	jcc .L236
	moveq #64,%d1
.L236:
	move.l 20(%fp),%a1
	move.b %d1,(%a1)
	move.b 1(%a0),1(%a1)
	move.b 2(%a0),2(%a1)
	move.b 3(%a0),3(%a1)
	move.b 4(%a0),4(%a1)
	move.b 5(%a0),5(%a1)
	move.b 6(%a0),6(%a1)
	pea -24(%fp)
	move.l %a1,-(%sp)
	move.l %d0,-36(%fp)
	jsr es_modulate
	addq.l #8,%sp
	movem.l -48(%fp),#1036
	move.l -36(%fp),%d0
	unlk %fp
	rts
.L234:
	mvz.w #36435,%d1
	move.b (%a1,%d1.l),%d1
	jra .L235
	.size	live_params, .-live_params
	.align	2
	.type	step_bar, @function
step_bar:
	link.w %fp,#-56
	move.l 1187521622,%a0
	move.l #36437,%a1
	movem.l #15612,(%sp)
	move.w 22(%fp),%d7
	move.l 8(%fp),%d6
	move.l 16(%fp),%d5
	mvz.b 269161680,%d0
	mulu.w #2330,%d7
	mulu.w #36568,%d0
	add.l %d0,%a0
	tst.b (%a0,%a1.l)
	jeq .L251
	move.b 80(%a0,%d7.l),%d0
.L252:
	mvz.b %d0,%d0
	moveq #64,%d1
	move.l %d0,-16(%fp)
	cmp.l %d0,%d1
	jcc .L253
	move.l %d1,-16(%fp)
.L253:
	move.l 1175263052,%d2
	moveq #63,%d0
	cmp.l %d2,%d0
	jcc .L254
	clr.l %d2
.L254:
	move.l 1187521622,%a3
	mvz.b 269161680,%d3
	move.l 1187521622,%d0
	mulu.w #36568,%d3
	add.l %d3,%a3
	cmp.l #1074667999,%d0
	jls .L257
	add.l #-1074668000,%d0
	move.l %d0,%d4
	move.l #635712,%d1
	remu.l %d1,%d3:%d4
	divu.l %d1,%d4
	tst.l %d3
	jne .L257
	cmp.l #10171391,%d0
	jhi .L257
	tst.l -2147457608
	jeq .L258
	move.b 269161680,%d0
	pea -7(%fp)
	addq.l #7,%d7
	clr.l %d3
	lea (-7,%fp),%a5
	lea es_step,%a4
	mvz.b %d0,%d0
	move.l %d0,-(%sp)
	move.l %d4,-(%sp)
	move.l 20(%fp),-(%sp)
	jsr live_params
	lea (16,%sp),%sp
	clr.l %d4
	move.l %d7,-12(%fp)
	move.l %d0,%a2
.L259:
	mov3q.l #7,%d1
	move.l %d2,%d0
	lsr.l #3,%d0
	and.l %d2,%d1
	cmp.l -16(%fp),%d2
	jcc .L263
	tst.l %a2
	jeq .L260
	move.l %d2,-(%sp)
	move.l %a5,-(%sp)
	jsr (%a4)
	addq.l #8,%sp
.L261:
	mov3q.l #1,%d1
	addq.l #1,%d2
	lsl.l %d3,%d1
	addq.l #1,%d3
	btst #0,%d0
	jeq .L262
	or.l %d1,%d4
.L262:
	moveq #16,%d0
	cmp.l %d3,%d0
	jne .L259
.L263:
	move.l %d5,%d7
	clr.l %d2
	move.l 12(%fp),-12(%fp)
	addq.l #3,%d7
.L267:
	move.l %d2,%d0
	lsr.l #2,%d0
	cmp.l %d3,%d2
	jcc .L265
	add.l -12(%fp),%d0
	move.l %d0,%d1
	addq.l #1,%d1
	btst %d2,%d4
	jeq .L266
	mov3q.l #1,-(%sp)
	move.l %d5,-(%sp)
	move.l %d1,-(%sp)
	move.l %d7,-(%sp)
	move.l %d0,-(%sp)
	move.l %d6,-(%sp)
	jsr 1073816148
	lea (24,%sp),%sp
.L265:
	addq.l #1,%d2
	moveq #16,%d0
	addq.l #3,-12(%fp)
	cmp.l %d2,%d0
	jne .L267
.L281:
	movem.l -56(%fp),#15612
	unlk %fp
	rts
.L257:
	move.l -2147457608,%d0
.L258:
	addq.l #7,%d7
	sub.l %a2,%a2
	clr.l %d4
	clr.l %d3
	move.l %d7,-12(%fp)
	lea (-7,%fp),%a5
	lea es_step,%a4
	jra .L259
.L266:
	mov3q.l #1,-(%sp)
	move.l %d5,-(%sp)
	move.l %d1,-(%sp)
	move.l %d5,-(%sp)
	move.l %d0,-(%sp)
	move.l %d6,-(%sp)
	jsr 1073816148
	lea (24,%sp),%sp
	addq.l #1,%d2
	addq.l #3,-12(%fp)
	moveq #16,%d0
	cmp.l %d2,%d0
	jne .L267
	jra .L281
.L260:
	move.l -12(%fp),%a1
	sub.l %d0,%a1
	mvz.b (%a3,%a1.l),%d0
	lsr.l %d1,%d0
	jra .L261
.L251:
	mvz.w #36435,%d0
	move.b (%a0,%d0.l),%d0
	jra .L252
	.size	step_bar, .-step_bar
	.align	2
	.type	euc_on, @function
euc_on:
	subq.l #8,%sp
	move.l 1187521622,%d1
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	cmp.l #1074667999,%d1
	jls .L285
	add.l #-1074668000,%d1
	move.l %d1,%d2
	move.l #635712,%d3
	remu.l %d3,%d0:%d2
	divu.l %d3,%d2
	move.l %d2,%a0
	tst.l %d0
	jne .L285
	cmp.l #10171391,%d1
	jhi .L285
	mvz.b 269161680,%d1
	moveq #15,%d2
	cmp.l %d1,%d2
	jcs .L282
	mov3q.l #7,%d3
	cmp.l 20(%sp),%d3
	jcs .L282
	tst.l -2147483630
	jeq .L293
.L282:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	addq.l #8,%sp
	rts
.L293:
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
	jeq .L282
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
.L285:
	move.b 269161680,%d0
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	clr.l %d0
	addq.l #8,%sp
	rts
	.size	euc_on, .-euc_on
	.align	2
	.type	entry_at, @function
entry_at:
	subq.l #4,%sp
	move.l 1187521622,%d0
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	cmp.l #1074667999,%d0
	jls .L297
	add.l #-1074668000,%d0
	move.l %d0,%d1
	move.l #635712,%d2
	remu.l %d2,%d3:%d1
	divu.l %d2,%d1
	tst.l %d3
	jne .L297
	cmp.l #10171391,%d0
	jhi .L297
	moveq #15,%d0
	cmp.l 16(%sp),%d0
	jcs .L297
	mov3q.l #7,%d2
	cmp.l 20(%sp),%d2
	jcs .L297
	tst.l -2147483630
	jne .L297
	move.l %d1,8(%sp)
	jsr nv_ensure
	move.l 8(%sp),%d1
	move.l 16(%sp),%d0
	lsl.l #4,%d1
	move.l 20(%sp),%a0
	add.l #33681922,%a0
	add.l %d1,%d0
	mvz.w %d0,%d0
	lsl.l #3,%d0
	add.l %d0,%a0
	move.l %a0,%d3
	lsl.l #3,%d3
	move.l %d3,%a0
	tst.b (%a0)
	jlt .L302
	move.l #-2147221504,(%a0)
	clr.l 4(%a0)
.L294:
	move.l (%sp)+,%d2
	move.l %a0,%d0
	move.l (%sp)+,%d3
	addq.l #4,%sp
	rts
.L297:
	move.l (%sp)+,%d2
	sub.l %a0,%a0
	move.l %a0,%d0
	move.l (%sp)+,%d3
	addq.l #4,%sp
	rts
.L302:
	move.l %d3,-(%sp)
	move.l %d3,12(%sp)
	jsr es_entry_valid
	addq.l #4,%sp
	move.l 8(%sp),%a0
	tst.l %d0
	jne .L294
	move.l #-2147221504,(%a0)
	clr.l 4(%a0)
	jra .L294
	.size	entry_at, .-entry_at
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
	jne .L322
.L303:
	movem.l (%sp),#31996
	lea (76,%sp),%sp
	rts
.L322:
	mvz.b 269161676,%d1
	move.l %d1,48(%sp)
	move.b 269161680,%d0
	move.l %d1,-(%sp)
	mvz.b %d0,%d0
	move.l %d0,-(%sp)
	jsr entry_at
	move.l es_window,%d4
	add.l #36,%d4
	move.l %d4,-(%sp)
	move.l %d0,%a4
	jsr 1073960572
	lea (12,%sp),%sp
	tst.l %a4
	jeq .L303
	move.l 1187521622,%a0
	mvz.b 269161680,%d0
	mvz.w #36437,%d1
	mulu.w #36568,%d0
	add.l %d0,%a0
	tst.b (%a0,%d1.l)
	jeq .L305
	move.w 50(%sp),%d0
	mulu.w #2330,%d0
	move.b 80(%a0,%d0.l),%d1
.L306:
	mvz.b %d1,%d0
	moveq #64,%d2
	cmp.l %d0,%d2
	jcc .L307
	moveq #64,%d0
.L307:
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
.L310:
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
	jeq .L308
	move.l (%a5,%a6.l*4),%a2
	move.l %a2,%d1
	lsl.l #7,%d1
	sub.l %a2,%d1
	move.l %d1,44(%sp)
	divu.l %d0,%d1
	move.l %d1,%d0
	moveq #127,%d1
	cmp.l %d0,%d1
	jcc .L308
	moveq #127,%d0
.L308:
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
	jne .L310
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
	jeq .L311
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
.L323:
	movem.l (%sp),#31996
	lea (76,%sp),%sp
	rts
.L305:
	mvz.w #36435,%d0
	move.b (%a0,%d0.l),%d1
	jra .L306
.L311:
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
	jra .L323
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
	jeq .L334
.L324:
	addq.l #4,%sp
	rts
.L334:
	move.b 269161676,%d1
	move.b 269161680,%d0
	mvz.b %d1,%d1
	mvz.b %d0,%d0
	move.l %d1,-(%sp)
	move.l %d0,-(%sp)
	jsr entry_at
	addq.l #8,%sp
	tst.l %d0
	jeq .L324
	pea es_close_cb
	mov3q.l #1,-(%sp)
	clr.l -(%sp)
	clr.l -(%sp)
	pea 64.w
	pea 115.w
	jsr 1074102940
	lea (24,%sp),%sp
	tst.l %d0
	jeq .L324
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
	.type	apply_at.isra.0, @function
apply_at.isra.0:
	link.w %fp,#-72
	movem.l #15612,(%sp)
	move.l 8(%fp),%d2
	move.l 12(%fp),-(%sp)
	move.l %d2,-(%sp)
	jsr entry_at
	addq.l #8,%sp
	move.l %d0,%a0
	tst.l %d0
	jeq .L335
	move.b (%a0),%d0
	btst #0,%d0
	jeq .L335
	mvz.w #36568,%d0
	mvz.w #2330,%d4
	move.l 1187521622,%d3
	move.l %d3,%a1
	move.l 12(%fp),%d1
	muls.l %d0,%d2
	mvz.w #36437,%d0
	muls.l %d4,%d1
	move.l %d3,-20(%fp)
	add.l %d2,%a1
	tst.b (%a1,%d0.l)
	jeq .L337
	move.b 80(%a1,%d1.l),%d0
.L338:
	tst.b %d0
	jeq .L335
	move.l %d2,%a3
	add.l %d1,%a3
	mvz.b %d0,%d1
	move.l #268525902,%a1
	moveq #64,%d2
	add.l %a3,%a1
	move.l -20(%fp),%d5
	add.l %a3,%d5
	move.l %a1,-24(%fp)
	cmp.l %d1,%d2
	jcs .L388
	move.b 1(%a0),-14(%fp)
	move.b 2(%a0),-13(%fp)
	move.l %d5,%a2
	move.l %d5,%a4
	move.b 3(%a0),-12(%fp)
	move.b 4(%a0),-11(%fp)
	move.b 5(%a0),-10(%fp)
	move.b 6(%a0),-9(%fp)
	pea -8(%fp)
	pea -15(%fp)
	move.b %d0,-15(%fp)
	jsr es_mask
	addq.l #8,%sp
	move.l %d5,%d3
	addq.l #8,%d3
	sub.l %a5,%a5
	move.l #268525902,%a1
	add.l #268528105,%a3
	sub.l -20(%fp),%a1
	move.l %d5,%d0
	clr.l %d1
	lea (2203,%a2),%a2
	add.l #121,%d0
	lea (32,%a4),%a4
	move.l %d3,-28(%fp)
.L353:
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
	jeq .L340
	tst.b %d3
	jeq .L389
.L347:
	addq.l #1,%d1
	addq.l #2,%a2
	addq.l #2,%a3
	add.l #32,%d0
	moveq #64,%d4
	cmp.l %d1,%d4
	jne .L353
.L391:
	tst.l %a5
	jeq .L335
	move.l -20(%fp),%a0
	add.l #635698,%a0
	mov3q.l #1,(%a0)
	mov3q.l #1,269452696
	jsr 1073905152
	jsr 1073953240
	move.l 12(%fp),-(%sp)
	jsr 1074387488
	mov3q.l #1,1187497772
	addq.l #4,%sp
	tst.l 1175263030
	jeq .L335
	mvz.b 269161676,%d0
	cmp.l 12(%fp),%d0
	jeq .L390
.L335:
	movem.l -72(%fp),#15612
	unlk %fp
	rts
.L337:
	mvz.w #36435,%d0
	move.b (%a1,%d0.l),%d0
	jra .L338
.L389:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	or.l %d2,%d3
	mvz.b %d3,%d7
	cmp.l %d7,%d4
	jeq .L342
	move.b %d3,(%a0)
	move.l -24(%fp),%a0
	move.l -32(%fp),%d4
	move.b %d3,(%a0,%d4.l)
.L342:
	move.l -32(%fp),%d7
	not.l %d2
	move.l -28(%fp),%a0
	lea (%a4,%d7.l),%a5
	move.b %d2,%d7
	add.l -32(%fp),%a0
.L344:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	and.l %d7,%d3
	mvz.b %d3,%d2
	cmp.l %d2,%d4
	jeq .L343
	move.b %d3,(%a0)
	move.b %d3,(%a1,%a0.l)
.L343:
	addq.l #8,%a0
	cmp.l %a0,%a5
	jne .L344
	move.l %a2,%a0
	tst.b -(%a0)
	jeq .L345
	clr.b %d2
	clr.b (%a0)
	move.b %d2,-1(%a3)
.L345:
	tst.b (%a2)
	jeq .L348
	clr.b (%a2)
	clr.b (%a3)
.L348:
	mov3q.l #1,%a5
	addq.l #1,%d1
	addq.l #2,%a2
	addq.l #2,%a3
	add.l #32,%d0
	moveq #64,%d4
	cmp.l %d1,%d4
	jne .L353
	jra .L391
.L340:
	tst.b %d3
	jeq .L347
	move.l -32(%fp),%d7
	not.l %d2
	lea (%a4,%d7.l),%a5
	move.b %d2,%d7
.L350:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	and.l %d7,%d3
	mvz.b %d3,%d2
	cmp.l %d2,%d4
	jeq .L349
	move.b %d3,(%a0)
	move.b %d3,(%a1,%a0.l)
.L349:
	addq.l #8,%a0
	cmp.l %a0,%a5
	jne .L350
	move.l %d0,%a0
	lea (-32,%a0),%a0
.L352:
	mvz.b (%a0),%d2
	cmp.l #255,%d2
	jeq .L351
	st %d3
	move.b #-1,(%a0)
	move.b %d3,(%a1,%a0.l)
.L351:
	addq.l #1,%a0
	cmp.l %a0,%d0
	jne .L352
	tst.b (%a2)
	jeq .L348
	clr.b (%a2)
	clr.b (%a3)
	jra .L348
.L388:
	moveq #64,%d0
	move.b 1(%a0),-14(%fp)
	move.b 2(%a0),-13(%fp)
	move.b 3(%a0),-12(%fp)
	move.b 4(%a0),-11(%fp)
	move.b 5(%a0),-10(%fp)
	move.b 6(%a0),-9(%fp)
	pea -8(%fp)
	pea -15(%fp)
	move.l %d5,%a2
	move.l %d5,%a4
	move.b %d0,-15(%fp)
	jsr es_mask
	addq.l #8,%sp
	move.l %d5,%d3
	addq.l #8,%d3
	sub.l %a5,%a5
	move.l #268525902,%a1
	add.l #268528105,%a3
	move.l %d5,%d0
	clr.l %d1
	sub.l -20(%fp),%a1
	lea (2203,%a2),%a2
	add.l #121,%d0
	lea (32,%a4),%a4
	move.l %d3,-28(%fp)
	jra .L353
.L390:
	clr.l -(%sp)
	jsr 1073957844
	movem.l -72(%fp),#15612
	addq.l #4,%sp
	unlk %fp
	rts
	.size	apply_at.isra.0, .-apply_at.isra.0
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
	jeq .L395
.L397:
	move.l (%sp)+,%d2
	mov3q.l #1,%d0
	lea (24,%sp),%sp
	rts
.L395:
	mvz.b 1(%a0),%d1
	moveq #64,%d2
	move.l %d1,%a1
	cmp.l %d1,%d2
	jcs .L397
	move.b 2(%a0),%d1
	move.b %d1,7(%sp)
	mvz.b %d1,%d1
	cmp.l %d1,%d2
	jcs .L397
	move.b 3(%a0),%d2
	mvz.b %d2,%d1
	move.b %d2,15(%sp)
	moveq #63,%d2
	cmp.l %d1,%d2
	jcs .L397
	move.b 4(%a0),%d1
	mvz.b %d1,%d2
	move.b %d1,11(%sp)
	moveq #63,%d1
	cmp.l %d2,%d1
	jcs .L397
	move.b 5(%a0),%d2
	mvz.b %d2,%d1
	move.b %d2,19(%sp)
	moveq #63,%d2
	cmp.l %d1,%d2
	jcs .L397
	move.b 6(%a0),%d1
	mvz.b %d1,%d2
	move.b %d1,23(%sp)
	mov3q.l #3,%d1
	cmp.l %d2,%d1
	jcs .L397
	tst.b 7(%a0)
	jne .L397
	mvz.b %d0,%d0
	cmp.l #128,%d0
	jne .L399
	mov3q.l #4,%d2
	cmp.l %a1,%d2
	jeq .L402
.L399:
	move.l (%sp)+,%d2
	clr.l %d0
	lea (24,%sp),%sp
	rts
.L402:
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
.L404:
	move.b (%a0)+,(%a1)+
	cmp.l #key+12,%a0
	jne .L404
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
.L407:
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
	jcs .L412
	move.b %d1,(%a2,%a0.l)
	move.l %a0,%d1
	add.l %d2,%d1
	cmp.l %a1,%d3
	jne .L407
.L413:
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
.L412:
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
	jne .L407
	jra .L413
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
.L416:
	addq.l #1,%a1
	addq.l #1,%a0
	mvs.b -1(%a1),%d1
	mvs.b -1(%a0),%d0
	cmp.l %d1,%d0
	jne .L423
	cmp.l #key+12,%a0
	jne .L416
	move.l 36(%sp),%a0
	moveq #15,%d1
	move.b 12(%a0),%d0
	add.l #-65,%d0
	mvz.b %d0,%d0
	cmp.l %d0,%d1
	jcs .L418
	move.l 36(%sp),%a0
	moveq #9,%d1
	mvz.b 13(%a0),%d0
	add.l #-48,%d0
	cmp.l %d0,%d1
	jcs .L418
	mvz.b 14(%a0),%d1
	moveq #9,%d2
	add.l #-48,%d1
	cmp.l %d1,%d2
	jcs .L418
	mvs.b 15(%a0),%d2
	move.l %d2,%a0
	moveq #58,%d2
	cmp.l %a0,%d2
	jne .L418
	move.l 36(%sp),%a0
	move.b 16(%a0),%d2
	move.w %d2,%a1
	lea (-49,%a1),%a1
	move.w %a1,%d2
	mvz.b %d2,%d2
	move.l %d2,%a0
	mov3q.l #7,%d2
	cmp.l %a0,%d2
	jcs .L418
	move.l 36(%sp),%a2
	mvs.b 17(%a2),%d2
	move.l %d2,%a0
	moveq #58,%d2
	cmp.l %a0,%d2
	jne .L418
	move.b 18(%a2),%d2
	move.w %d2,%a0
	move.b %d2,15(%sp)
	lea (-48,%a0),%a0
	move.w %a0,%d2
	mvz.b %d2,%d2
	move.l %d2,%a0
	mov3q.l #1,%d2
	cmp.l %a0,%d2
	jcs .L418
	moveq #10,%d2
	muls.l %d2,%d0
	add.l %d1,%d0
	move.l %d0,28(%sp)
	moveq #15,%d1
	subq.l #1,%d0
	cmp.l %d0,%d1
	jcs .L418
	mvs.b 15(%sp),%d0
	moveq #49,%d2
	cmp.l %d0,%d2
	jeq .L433
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
.L422:
	mvs.b (%a0),%d0
	moveq #44,%d1
	cmp.l %d0,%d1
	jne .L418
	mvz.b 1(%a0),%d1
	moveq #9,%d2
	add.l #-48,%d1
	cmp.l %d1,%d2
	jcs .L418
	lea (4,%a0),%a2
	clr.l %d0
	move.l %a2,16(%sp)
	addq.l #1,%a0
.L421:
	moveq #10,%d2
	addq.l #1,%a0
	muls.l %d2,%d0
	mvz.b (%a0),%d2
	add.l %d1,%d0
	move.l %d2,%d1
	moveq #9,%d2
	add.l #-48,%d1
	cmp.l %d1,%d2
	jcs .L420
	cmp.l 16(%sp),%a0
	jne .L421
.L418:
	move.l (%sp)+,%d2
	mov3q.l #1,%d0
	move.l (%sp)+,%a2
	lea (24,%sp),%sp
	rts
.L423:
	move.l (%sp)+,%d2
	clr.l %d0
	move.l (%sp)+,%a2
	lea (24,%sp),%sp
	rts
.L420:
	cmp.l #255,%d0
	jhi .L418
	move.l 20(%sp),%a2
	addq.l #1,20(%sp)
	move.b %d0,(%a2)+
	cmp.l 24(%sp),%a2
	jne .L422
	tst.b (%a0)
	jne .L418
	move.l 44(%sp),-(%sp)
	move.l %a1,12(%sp)
	jsr es_entry_valid
	addq.l #4,%sp
	tst.l %d0
	jeq .L418
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
.L433:
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
	jra .L422
	.size	es_line_parse, .-es_line_parse
	.align	2
	.globl	es_lfo_line_format
	.type	es_lfo_line_format, @function
es_lfo_line_format:
	lea (-24,%sp),%sp
	mov3q.l #3,%d1
	movem.l #1148,(%sp)
	move.l 32(%sp),%d0
	move.l %d0,%d2
	remu.l %d1,%d4:%d2
	divu.l %d1,%d2
	move.l %d0,%d3
	moveq #24,%d5
	divu.l %d5,%d3
	moveq #96,%d6
	move.l 28(%sp),%a2
	move.l %d0,%d1
	mov3q.l #3,%d0
	divu.l %d6,%d1
	mov3q.l #7,%d6
	and.l %d6,%d2
	and.l %d0,%d3
	moveq #15,%d5
	and.l %d5,%d1
	tst.l 40(%sp)
	jne .L435
	lea lkey,%a0
	move.l %a0,%d0
	move.l %a2,%a1
	add.l #12,%d0
.L437:
	move.b (%a0)+,(%a1)+
	cmp.l %d0,%a0
	jne .L437
	move.l 36(%sp),%d0
	moveq #10,%d6
	add.l #65,%d1
	move.b %d1,12(%a2)
	remu.l %d6,%d5:%d0
	add.l #49,%d2
	move.b %d2,15(%a2)
	moveq #58,%d6
	clr.b %d2
	add.l #49,%d3
	move.l %d5,%d1
	add.l #48,%d1
	move.b %d1,19(%a2)
	move.w #3338,%d1
	add.l #49,%d4
	move.b %d3,13(%a2)
	move.b %d4,17(%a2)
	moveq #22,%d0
	move.b %d6,14(%a2)
	move.b %d6,16(%a2)
	move.b %d6,18(%a2)
	move.b %d2,22(%a2)
	move.w %d1,20(%a2)
	movem.l (%sp),#1148
	lea (24,%sp),%sp
	rts
.L435:
	lea skey,%a0
	move.l %a0,%d0
	move.l %a2,%a1
	add.l #12,%d0
	jra .L437
	.size	es_lfo_line_format, .-es_lfo_line_format
	.align	2
	.globl	es_lfo_line_parse
	.type	es_lfo_line_parse, @function
es_lfo_line_parse:
	lea (-20,%sp),%sp
	clr.l %d0
	movem.l #3084,(%sp)
	move.l 24(%sp),%a2
	lea skey,%a0
.L444:
	mvs.b (%a2,%d0.l),%d2
	mvs.b (%a0,%d0.l),%d1
	addq.l #1,%d0
	cmp.l %d2,%d1
	jne .L462
	moveq #12,%d1
	cmp.l %d0,%d1
	jne .L444
	move.b 12(%a2),%d0
	moveq #45,%d2
	mvs.b %d0,%d1
	cmp.l %d1,%d2
	jeq .L453
	add.l #-65,%d0
	mvz.b %d0,%d1
	mov3q.l #1,%a0
	moveq #15,%d2
	cmp.l %d1,%d2
	jcs .L452
.L451:
	move.b 13(%a2),%d2
	mov3q.l #3,%d3
	move.l %d2,%d1
	add.l #-49,%d1
	mvz.b %d1,%d1
	cmp.l %d1,%d3
	jcs .L452
	mvs.b 14(%a2),%d1
	moveq #58,%d3
	cmp.l %d1,%d3
	jne .L452
	move.b 15(%a2),%d1
	mov3q.l #7,%d3
	move.w %d1,%a1
	move.l %a1,%d1
	add.l #-49,%d1
	mvz.b %d1,%d1
	cmp.l %d1,%d3
	jcs .L452
	mvs.b 16(%a2),%d1
	moveq #58,%d3
	cmp.l %d1,%d3
	jne .L452
	move.b 17(%a2),%d1
	mov3q.l #2,%d3
	move.b %d1,19(%sp)
	add.l #-49,%d1
	mvz.b %d1,%d1
	cmp.l %d1,%d3
	jcs .L452
	mvs.b 18(%a2),%d1
	moveq #58,%d3
	cmp.l %d1,%d3
	jne .L452
	move.b 19(%a2),%d1
	mov3q.l #5,%d3
	add.l #-49,%d1
	mvz.b %d1,%d1
	cmp.l %d1,%d3
	jcs .L452
	tst.b 20(%a2)
	jne .L452
	move.b %d0,%d1
	mvs.b %d2,%d2
	mvs.b %a1,%d0
	mvs.b 19(%sp),%d3
	move.l %d2,%a3
	move.l %d0,%a1
	mov3q.l #2,%d0
	ext.w %d1
	lea -49(%a3,%d1.l*4),%a3
	move.l %a3,%d1
	move.l %d3,%a3
	lsl.l #3,%d1
	lea -49(%a1,%d1.l),%a1
	move.l %a1,%d1
	mulu.w #3,%d1
	move.l 28(%sp),%a1
	lea -49(%a3,%d1.l),%a3
	move.l %a3,(%a1)
	mvs.b 19(%a2),%d1
	movem.l (%sp),#3084
	move.l 32(%sp),%a1
	add.l #-48,%d1
	move.l %d1,(%a1)
	move.l 36(%sp),%a1
	move.l %a0,(%a1)
	lea (20,%sp),%sp
	rts
.L462:
	move.l %a2,%a1
	lea lkey,%a0
.L449:
	mvs.b (%a1),%d1
	mvs.b (%a0),%d0
	addq.l #1,%a1
	addq.l #1,%a0
	cmp.l %d1,%d0
	jne .L455
	cmp.l #lkey+12,%a0
	jne .L449
	move.b 12(%a2),%d0
	sub.l %a0,%a0
	moveq #15,%d2
	add.l #-65,%d0
	mvz.b %d0,%d1
	cmp.l %d1,%d2
	jcc .L451
.L452:
	movem.l (%sp),#3084
	mov3q.l #1,%d0
	lea (20,%sp),%sp
	rts
.L455:
	movem.l (%sp),#3084
	clr.l %d0
	lea (20,%sp),%sp
	rts
.L453:
	tst.b 13(%a2)
	jne .L452
	movem.l (%sp),#3084
	mov3q.l #3,%d0
	lea (20,%sp),%sp
	rts
	.size	es_lfo_line_parse, .-es_lfo_line_parse
	.align	2
	.globl	es_length_changed
	.type	es_length_changed, @function
es_length_changed:
	move.l %a2,-(%sp)
	move.l %d2,-(%sp)
	clr.l %d2
	lea (apply_at.isra.0),%a2
.L464:
	move.b 269161680,%d0
	move.l %d2,-(%sp)
	addq.l #1,%d2
	mvz.b %d0,%d0
	move.l %d0,-(%sp)
	jsr (%a2)
	addq.l #8,%sp
	moveq #8,%d0
	cmp.l %d2,%d0
	jne .L464
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	rts
	.size	es_length_changed, .-es_length_changed
	.align	2
	.globl	es_lfo_route
	.type	es_lfo_route, @function
es_lfo_route:
	lea (-20,%sp),%sp
	moveq #69,%d1
	movem.l #1036,(%sp)
	move.l 24(%sp),%a0
	lea (%a0,%a0.l*2),%a1
	mvz.b 269472000,%d0
	add.l 28(%sp),%a1
	cmp.l %d0,%d1
	jne .L469
	mvz.b 269472001,%d0
	moveq #83,%d2
	cmp.l %d0,%d2
	jne .L469
	mvz.b 269472002,%d0
	moveq #76,%d1
	cmp.l %d0,%d1
	jne .L469
	mvz.b 269472003,%d0
	moveq #49,%d2
	cmp.l %d0,%d2
	jne .L469
	move.l 1187521622,%d0
	cmp.l #1074667999,%d0
	jls .L472
	add.l #-1074668000,%d0
	move.l %d0,%d2
	move.l #635712,%d3
	remu.l %d3,%d1:%d2
	tst.l %d1
	jne .L472
	cmp.l #10171391,%d0
	jhi .L472
	mvz.b 269161679,%d1
	mov3q.l #3,%d2
	move.l %d1,12(%sp)
	cmp.l %d1,%d2
	jcs .L474
	mov3q.l #7,%d3
	cmp.l %a0,%d3
	jcs .L474
	mov3q.l #2,%d1
	cmp.l 28(%sp),%d1
	jcs .L474
	move.l #635712,%d2
	divu.l %d2,%d0
	move.l 12(%sp),%a2
	move.l 28(%sp),%d1
	add.l #269472016,%d1
	lea (%a2,%d0.l*4),%a2
	move.l %a2,%d0
	lsl.l #3,%d0
	add.l %a0,%d0
	mulu.w #3,%d0
	move.l %d0,%a0
	add.l %d1,%a0
	mvz.b (%a0),%d0
	mov3q.l #6,%d1
	cmp.l %d0,%d1
	jcs .L488
	move.b (%a0),%d0
	moveq #23,%d2
	cmp.l %a1,%d2
	jcs .L471
	lea es_lfo_tgt,%a0
	move.b %d0,(%a0,%a1.l)
	jeq .L471
	move.w #16384,%d3
	lea es_lfo_buf,%a0
	move.l %a1,%d0
	add.l %d0,%d0
	move.w %d3,(%a0,%a1.l*2)
	movem.l (%sp),#1036
	add.l %a0,%d0
	lea (20,%sp),%sp
	rts
.L469:
	moveq #23,%d3
	cmp.l %a1,%d3
	jcs .L471
	clr.b %d0
	lea es_lfo_tgt,%a0
	move.b %d0,(%a0,%a1.l)
.L471:
	clr.l %d0
.L489:
	movem.l (%sp),#1036
	lea (20,%sp),%sp
	rts
.L488:
	moveq #23,%d0
	cmp.l %a1,%d0
	jcs .L471
	clr.b %d1
	lea es_lfo_tgt,%a0
	clr.l %d0
	move.b %d1,(%a0,%a1.l)
	jra .L489
.L472:
	move.b 269161679,%d0
.L474:
	moveq #23,%d2
	cmp.l %a1,%d2
	jcs .L471
	clr.b %d3
	lea es_lfo_tgt,%a0
	clr.l %d0
	move.b %d3,(%a0,%a1.l)
	jra .L489
	.size	es_lfo_route, .-es_lfo_route
	.align	2
	.globl	es_live_bit
	.type	es_live_bit, @function
es_live_bit:
	subq.l #8,%sp
	move.l %a6,-(%sp)
	lea (5,%sp),%a6
	move.l %a6,-(%sp)
	move.l 28(%sp),-(%sp)
	move.l 28(%sp),-(%sp)
	move.l 28(%sp),-(%sp)
	jsr live_params
	lea (16,%sp),%sp
	tst.l %d0
	jeq .L492
	move.l 28(%sp),-(%sp)
	move.l %a6,-(%sp)
	jsr es_step
	addq.l #8,%sp
	move.l (%sp)+,%a6
	addq.l #8,%sp
	rts
.L492:
	move.l (%sp)+,%a6
	mov3q.l #-1,%d0
	addq.l #8,%sp
	rts
	.size	es_live_bit, .-es_live_bit
	.align	2
	.globl	es_led_word
	.type	es_led_word, @function
es_led_word:
	lea (-20,%sp),%sp
	movem.l #16396,(%sp)
	tst.l -2147457608
	jeq .L496
	mov3q.l #3,%d0
	cmp.l 28(%sp),%d0
	jcs .L496
	moveq #15,%d2
	cmp.l 32(%sp),%d2
	jcs .L496
	move.l 1187521622,%d0
	cmp.l #1074667999,%d0
	jls .L496
	add.l #-1074668000,%d0
	move.l %d0,%d3
	move.l #635712,%d2
	remu.l %d2,%d1:%d3
	divu.l %d2,%d3
	tst.l %d1
	jne .L496
	cmp.l #10171391,%d0
	jhi .L496
	move.b 269161680,%d1
	move.b 269161676,%d0
	lea (13,%sp),%a6
	move.l %a6,-(%sp)
	mvz.b %d1,%d1
	mvz.b %d0,%d0
	move.l %d1,-(%sp)
	move.l %d3,-(%sp)
	move.l %d0,-(%sp)
	jsr live_params
	lea (16,%sp),%sp
	tst.l %d0
	jeq .L496
	mov3q.l #3,%d0
	sub.l 28(%sp),%d0
	move.l 32(%sp),%a0
	mvz.w %d0,%d0
	lsl.l #4,%d0
	pea (%a0,%d0.l)
	move.l %a6,-(%sp)
	jsr es_step
	addq.l #8,%sp
	mov3q.l #1,%d1
	move.l 32(%sp),%d2
	lsl.l %d2,%d1
	tst.l %d0
	jeq .L510
	move.l 24(%sp),%d0
	movem.l (%sp),#16396
	or.l %d1,%d0
	lea (20,%sp),%sp
	rts
.L496:
	movem.l (%sp),#16396
	move.l 24(%sp),%d0
	lea (20,%sp),%sp
	rts
.L510:
	move.l 24(%sp),%d0
	not.l %d1
	movem.l (%sp),#16396
	and.l %d1,%d0
	lea (20,%sp),%sp
	rts
	.size	es_led_word, .-es_led_word
	.align	2
	.globl	es_pmtr_knob
	.type	es_pmtr_knob, @function
es_pmtr_knob:
	lea (-24,%sp),%sp
	movem.l #1052,(%sp)
	move.l 28(%sp),%d2
	addq.l #6,%d2
	move.b 269161676,%d0
	move.w %d0,%a0
	move.l 1187521622,%d0
	cmp.l #1074667999,%d0
	jls .L514
	add.l #-1074668000,%d0
	move.l %d0,%d1
	move.l #635712,%d3
	remu.l %d3,%d4:%d1
	divu.l %d3,%d1
	tst.l %d4
	jne .L514
	cmp.l #10171391,%d0
	jhi .L514
	mvz.b 269161679,%d0
	mov3q.l #3,%d3
	cmp.l %d0,%d3
	jcs .L513
	move.w %a0,%d4
	mov3q.l #7,%d3
	mvz.b %d4,%d4
	move.l %d4,%a0
	cmp.l %d4,%d3
	jcs .L513
	mov3q.l #2,%d4
	cmp.l 28(%sp),%d4
	jcs .L513
	move.l %d0,%a1
	lea (%a1,%d1.l*4),%a1
	mvz.b 269472000,%d1
	move.l 28(%sp),%a2
	add.l #269472016,%a2
	move.l %a1,%d0
	lsl.l #3,%d0
	add.l %a0,%d0
	mulu.w #3,%d0
	add.l %d0,%a2
	moveq #69,%d0
	cmp.l %d1,%d0
	jne .L547
	mvz.b 269472001,%d0
	moveq #83,%d1
	cmp.l %d0,%d1
	jne .L547
	mvz.b 269472002,%d0
	moveq #76,%d3
	cmp.l %d0,%d3
	jne .L547
	mvz.b 269472003,%d0
	moveq #49,%d4
	cmp.l %d0,%d4
	jne .L547
.L518:
	mvz.b (%a2),%d0
	move.l %d2,18(%sp)
	mov3q.l #6,%d1
	cmp.l %d0,%d1
	jcs .L517
	move.b (%a2),23(%sp)
	cmp.l 32(%sp),%d2
	jeq .L573
.L517:
	tst.l 32(%sp)
	jlt .L548
	moveq #29,%d0
	cmp.l 32(%sp),%d0
	jlt .L528
	move.l 32(%sp),%d1
	mov3q.l #6,%d3
	lea page_order,%a0
	rems.l %d3,%d0:%d1
	divs.l %d3,%d1
	mvz.b (%a0,%d1.l),%d1
	muls.w #6,%d1
	add.l %d0,%d1
	move.l %d1,32(%sp)
.L528:
	move.l 36(%sp),-(%sp)
	clr.l -(%sp)
	jsr 1073947804
	add.l 40(%sp),%d0
	addq.l #8,%sp
	tst.l %d0
	jlt .L529
.L574:
	moveq #35,%d4
	cmp.l %d0,%d4
	jge .L530
	tst.l %a2
	jeq .L569
.L524:
	mov3q.l #2,%d0
	cmp.l 28(%sp),%d0
	jcs .L569
.L550:
	moveq #6,%d0
	move.b %d0,(%a2)
.L511:
	move.l %d2,%d0
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L530:
	moveq #29,%d1
	cmp.l %d0,%d1
	jge .L535
	tst.l %a2
	jeq .L569
	mov3q.l #2,%d4
	cmp.l 28(%sp),%d4
	jcc .L568
.L569:
	moveq #29,%d2
	move.l %d2,%d0
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L548:
	clr.l 32(%sp)
	move.l 36(%sp),-(%sp)
	clr.l -(%sp)
	jsr 1073947804
	add.l 40(%sp),%d0
	addq.l #8,%sp
	tst.l %d0
	jge .L574
.L529:
	tst.l %a2
	jeq .L539
	mov3q.l #2,%d0
	cmp.l 28(%sp),%d0
	jcs .L539
	clr.l %d0
.L540:
	move.l %d0,%d2
	cmp.l 18(%sp),%d0
	jne .L511
	clr.b (%a2)
	move.l %d2,%d0
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L539:
	clr.l %d2
	move.l %d2,%d0
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L514:
	move.b 269161679,%d0
.L513:
	move.l %d2,18(%sp)
	sub.l %a2,%a2
	jra .L517
.L573:
	tst.b 23(%sp)
	jeq .L575
	move.l 36(%sp),-(%sp)
	clr.l -(%sp)
	jsr 1073947804
	mvz.b 31(%sp),%d1
	addq.l #8,%sp
	move.l %d1,%a0
	lea 29(%a0,%d0.l),%a0
	move.l %a0,%d0
	tst.l %a0
	jlt .L539
	moveq #35,%d1
	cmp.l %a0,%d1
	jlt .L550
	moveq #29,%d1
	cmp.l %d0,%d1
	jge .L576
.L568:
	add.l #-29,%d0
.L577:
	move.b %d0,(%a2)
	jra .L511
.L547:
	move.l #269472016,%a0
.L519:
	clr.b (%a0)+
	cmp.l #269473552,%a0
	jne .L519
	moveq #69,%d0
	moveq #83,%d1
	moveq #76,%d3
	moveq #49,%d4
	move.b %d0,269472000
	move.b %d1,269472001
	move.b %d3,269472002
	move.b %d4,269472003
	jra .L518
.L575:
	move.l 36(%sp),-(%sp)
	clr.l -(%sp)
	jsr 1073947804
	move.l %d2,%d3
	mov3q.l #6,%d4
	rems.l %d4,%d1:%d3
	addq.l #8,%sp
	move.l %d1,%a0
	lea 12(%a0,%d0.l),%a0
	move.l %a0,%d0
	tst.l %a0
	jlt .L539
	moveq #35,%d1
	cmp.l %a0,%d1
	jlt .L524
	moveq #29,%d4
	cmp.l %a0,%d4
	jlt .L568
.L535:
	mov3q.l #6,%d3
	rems.l %d3,%d1:%d0
	divs.l %d3,%d0
	lea page_order,%a0
	mvz.b (%a0,%d0.l),%d0
	muls.w #6,%d0
	add.l %d1,%d0
	tst.l %a2
	jeq .L537
.L534:
	mov3q.l #2,%d1
	cmp.l 28(%sp),%d1
	jcs .L537
	moveq #29,%d4
	cmp.l %d0,%d4
	jge .L540
	add.l #-29,%d0
	jra .L577
.L537:
	move.l %d0,%d2
	moveq #29,%d3
	cmp.l %d0,%d3
	jlt .L569
	move.l %d2,%d0
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L576:
	mov3q.l #6,%d3
	rems.l %d3,%d1:%d0
	divs.l %d3,%d0
	lea page_order,%a0
	mvz.b (%a0,%d0.l),%d0
	muls.w #6,%d0
	add.l %d1,%d0
	jra .L534
	.size	es_pmtr_knob, .-es_pmtr_knob
	.align	2
	.globl	es_pmtr_fmt
	.type	es_pmtr_fmt, @function
es_pmtr_fmt:
	move.l 1175263794,%a0
	move.l -2147483630,%d0
	lea (-24,%sp),%sp
	movem.l #1052,(%sp)
	tst.l %d0
	jne .L587
	mov3q.l #2,%d1
	cmp.l %a0,%d1
	jcs .L578
	move.l %a0,%d1
	addq.l #6,%d1
	cmp.l 32(%sp),%d1
	jeq .L596
.L578:
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L596:
	move.b 269161676,%d2
	moveq #69,%d3
	move.b %d2,16(%sp)
	mvz.b 269472000,%d1
	cmp.l %d1,%d3
	jne .L578
	mvz.b 269472001,%d1
	moveq #83,%d4
	cmp.l %d1,%d4
	jne .L578
	mvz.b 269472002,%d1
	moveq #76,%d2
	cmp.l %d1,%d2
	jne .L578
	mvz.b 269472003,%d1
	moveq #49,%d3
	cmp.l %d1,%d3
	jne .L578
	move.l 1187521622,%a1
	cmp.l #1074667999,%a1
	jls .L581
	add.l #-1074668000,%a1
	move.l %a1,%d4
	move.l #635712,%d2
	remu.l %d2,%d1:%d4
	tst.l %d1
	jne .L581
	cmp.l #10171391,%a1
	jhi .L581
	mvz.b 269161679,%d0
	mov3q.l #3,%d3
	cmp.l %d0,%d3
	jcs .L587
	mvz.b 16(%sp),%d4
	mov3q.l #7,%d2
	move.l %d4,16(%sp)
	cmp.l %d4,%d2
	jcs .L587
	move.l %a1,%d3
	move.l #635712,%d4
	divu.l %d4,%d3
	move.l %d0,%a2
	add.l #269472016,%a0
	mov3q.l #6,%d2
	lea (%a2,%d3.l*4),%a2
	move.l %a2,%d0
	lsl.l #3,%d0
	add.l 16(%sp),%d0
	mulu.w #3,%d0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	cmp.l %d0,%d2
	jcc .L584
.L587:
	movem.l (%sp),#1052
	clr.l %d0
	lea (24,%sp),%sp
	rts
.L584:
	mvz.b (%a0),%d0
	tst.l %d0
	jeq .L578
	lea lfo_names,%a0
	move.l -4(%a0,%d0.l*4),%a0
	move.b (%a0),%d0
	jeq .L588
.L586:
	move.l 28(%sp),%a1
	move.b %d0,(%a1,%d1.l)
	addq.l #1,%d1
	move.b (%a0,%d1.l),%d0
	jne .L586
	lea (%a1,%d1.l),%a0
	mov3q.l #1,%d0
	clr.b (%a0)
	move.l 28(%sp),%a2
	move.l #1163215616,%d1
	move.l %d1,5(%a2)
.L597:
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L588:
	move.l 28(%sp),%a0
	move.l #1163215616,%d1
	move.l 28(%sp),%a2
	mov3q.l #1,%d0
	clr.b (%a0)
	move.l %d1,5(%a2)
	jra .L597
.L581:
	move.b 269161679,%d1
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
	.size	es_pmtr_fmt, .-es_pmtr_fmt
	.align	2
	.globl	es_copied
	.type	es_copied, @function
es_copied:
	link.w %fp,#-76
	move.l 16(%fp),%d1
	movem.l #3084,(%sp)
	move.l 8(%fp),%d0
	cmp.l #36568,%d1
	jeq .L599
	cmp.l #2330,%d1
	jeq .L599
	move.l 16(%fp),%d2
	cmp.l #6322,%d2
	jeq .L599
	cmp.l #2048,%d2
	jeq .L733
.L598:
	movem.l -76(%fp),#3084
	unlk %fp
	rts
.L599:
	moveq #1,%d1
	clr.l -16(%fp)
	clr.l -20(%fp)
	clr.l -24(%fp)
	tst.b %d1
	jne .L734
.L603:
	move.l #1175224650,%a1
	cmp.l %d0,%a1
	jeq .L735
.L605:
	tst.b %d1
	jeq .L607
	move.l #1175187992,%d3
	move.l %d3,-34(%fp)
.L608:
	cmp.l -34(%fp),%d0
	jeq .L736
	pea -16(%fp)
	pea -20(%fp)
	pea -24(%fp)
	move.l 16(%fp),-(%sp)
	move.l %d0,-(%sp)
	lea (where.part.0.constprop.0),%a0
	move.l %a0,-50(%fp)
	move.l %a1,-54(%fp)
	jsr (%a0)
	clr.l -4(%fp)
	clr.l -8(%fp)
	clr.l -12(%fp)
	move.l -54(%fp),%a1
	move.l %d0,-38(%fp)
	lea (20,%sp),%sp
	move.l -50(%fp),%a0
	cmp.l 12(%fp),%a1
	jeq .L737
	move.l -34(%fp),%d3
	cmp.l 12(%fp),%d3
	jeq .L738
	pea -4(%fp)
	pea -8(%fp)
	pea -12(%fp)
	move.l 16(%fp),-(%sp)
	move.l 12(%fp),-(%sp)
	jsr (%a0)
	lea (20,%sp),%sp
	tst.l -38(%fp)
	jeq .L598
	tst.l %d0
	jeq .L598
	cmp.l -38(%fp),%d0
	jeq .L739
	move.l 16(%fp),%d3
	cmp.l #6322,%d3
	jeq .L740
	mov3q.l #4,%d1
	cmp.l -38(%fp),%d1
	jne .L658
	move.l 16(%fp),%d2
	cmp.l #2330,%d2
	jne .L598
	subq.l #3,%d0
	tst.l %d0
	jeq .L598
.L647:
	move.l 1187521622,%d0
	cmp.l #1074667999,%d0
	jls .L598
	add.l #-1074668000,%d0
	move.l %d0,%d2
	move.l #635712,%d3
	remu.l %d3,%d1:%d2
	tst.l %d1
	jne .L598
	cmp.l #10171391,%d0
	jhi .L598
	move.l -16(%fp),-(%sp)
	move.l -20(%fp),-(%sp)
	jsr (apply_at.isra.0)
	movem.l -76(%fp),#3084
	addq.l #8,%sp
	unlk %fp
	rts
.L734:
	move.l #1175224610,%a1
	cmp.l %d0,%a1
	jne .L605
.L735:
	clr.l -4(%fp)
	clr.l -8(%fp)
	clr.l -12(%fp)
	cmp.l 12(%fp),%d0
	jeq .L598
	tst.b %d1
	jeq .L652
	move.l #1175187992,%d0
.L653:
	cmp.l 12(%fp),%d0
	jeq .L651
	mov3q.l #1,-38(%fp)
.L650:
	pea -4(%fp)
	pea -8(%fp)
	pea -12(%fp)
	move.l 16(%fp),-(%sp)
	move.l 12(%fp),-(%sp)
	jsr (where.part.0.constprop.0)
	lea (20,%sp),%sp
	tst.l %d0
	jeq .L598
	move.l 16(%fp),%d2
	cmp.l #6322,%d2
	jeq .L625
	subq.l #4,%d0
	tst.l %d0
	jeq .L598
.L747:
	move.l 16(%fp),%d2
	cmp.l #36568,%d2
	jeq .L659
	move.l 16(%fp),%d3
	mov3q.l #3,%d2
	move.l -8(%fp),%a1
	move.l -12(%fp),%a0
	cmp.l #2330,%d3
	seq %d1
	move.l -4(%fp),-42(%fp)
	neg.l %d1
	move.b %d1,%d0
	cmp.l -38(%fp),%d2
	jeq .L623
	mvz.b %d1,%d1
	move.l %d1,-(%sp)
	move.l -42(%fp),-(%sp)
	move.l %a1,-(%sp)
	move.l %a0,-(%sp)
	move.l -38(%fp),-(%sp)
	jsr track_out
	movem.l -76(%fp),#3084
	lea (20,%sp),%sp
	unlk %fp
	rts
.L607:
	move.l #1175188032,%d2
	move.l %d2,-34(%fp)
	jra .L608
.L733:
	clr.b %d1
	clr.l -16(%fp)
	clr.l -20(%fp)
	clr.l -24(%fp)
	tst.b %d1
	jeq .L603
	jra .L734
.L737:
	tst.l %d0
	jeq .L598
	move.l 16(%fp),%a0
	cmp.l #6322,%a0
	jeq .L741
	mov3q.l #4,%d2
	cmp.l -38(%fp),%d2
	jeq .L615
.L611:
	move.l 16(%fp),%d1
	cmp.l #36568,%d1
	jeq .L661
	cmp.l #2330,%d1
	seq %d0
	move.b clip_t,%d1
	move.l -24(%fp),%a1
	move.l -16(%fp),-42(%fp)
	mov3q.l #1,-28(%fp)
	move.l -20(%fp),-38(%fp)
	lea clip_e,%a0
.L725:
	move.l %d0,%d2
	mov3q.l #7,%d0
	move.l %a0,-58(%fp)
	neg.l %d2
	and.l %d1,%d0
	mov3q.l #7,%d1
	move.l %a1,-54(%fp)
	move.l -58(%fp),%a0
	move.b %d2,-31(%fp)
	and.l %d0,%d1
	ext.w %d0
	move.w %d0,-30(%fp)
	move.l %d1,%d0
	lsl.l #3,%d0
	add.l %d0,%a0
	move.l %a0,-58(%fp)
	jsr nv_ensure
	move.l -58(%fp),%a2
	move.l -54(%fp),%a1
	move.l %a1,%d0
	lsl.l #4,%d0
	move.l -42(%fp),%a0
	add.l #33681922,%a0
	add.l -38(%fp),%d0
	lsl.l #3,%d0
	add.l %d0,%a0
	move.l %a0,%d0
	lsl.l #3,%d0
	move.l %d0,%a0
	move.b (%a2),(%a0)
	move.b 1(%a2),1(%a0)
	move.b 2(%a2),2(%a0)
	move.b 3(%a2),3(%a0)
	move.b 4(%a2),4(%a0)
	move.b 5(%a2),5(%a0)
	move.b 6(%a2),6(%a0)
	move.b 7(%a2),7(%a0)
	tst.b -31(%fp)
	jeq .L598
	mov3q.l #1,%d0
	cmp.l -28(%fp),%d0
	jeq .L742
	move.l %a1,%d0
	move.l #635712,%d1
	muls.l %d1,%d0
	mvz.w #36568,%d2
	move.l -38(%fp),%d1
	lea undo_l,%a2
	move.l %a2,-34(%fp)
	muls.l %d2,%d1
	move.l -34(%fp),%a2
	move.l %d0,%a0
	move.w -30(%fp),%d0
	add.l %d1,%a0
	add.l #1074704439,%a0
	mov3q.l #3,%d1
	mulu.w #3,%d0
	add.l %d0,%a2
	move.b (%a0),%d0
	move.l -42(%fp),-(%sp)
	and.l %d0,%d1
	move.l %d1,-(%sp)
	move.l %a1,-(%sp)
	clr.l -(%sp)
	jsr lfo_row
	lea (16,%sp),%sp
	move.l %d0,%a0
	move.b (%a2),(%a0)
	move.b 1(%a2),1(%a0)
	move.b 2(%a2),2(%a0)
.L749:
	movem.l -76(%fp),#3084
	unlk %fp
	rts
.L736:
	clr.l -4(%fp)
	clr.l -8(%fp)
	clr.l -12(%fp)
	cmp.l 12(%fp),%a1
	jeq .L743
	tst.b %d1
	jne .L744
	move.l #1175188032,%d0
.L649:
	cmp.l 12(%fp),%d0
	jeq .L598
	mov3q.l #2,-38(%fp)
	jra .L650
.L652:
	move.l #1175188032,%d0
	jra .L653
.L738:
	tst.l -38(%fp)
	jeq .L598
	move.l 16(%fp),%a0
	cmp.l #6322,%a0
	jeq .L745
	mov3q.l #4,%d1
	cmp.l -38(%fp),%d1
	jeq .L615
.L624:
	move.l 16(%fp),%d3
	cmp.l #36568,%d3
	jeq .L662
	cmp.l #2330,%d3
	seq %d0
	move.b undo_t,%d1
	move.l -24(%fp),%a1
	move.l -16(%fp),-42(%fp)
	mov3q.l #2,-28(%fp)
	move.l -20(%fp),-38(%fp)
	lea undo_e,%a0
	jra .L725
.L744:
	move.l #1175187992,%d0
	jra .L649
.L740:
	mov3q.l #3,%d1
	cmp.l -38(%fp),%d1
	jeq .L746
	mov3q.l #4,-38(%fp)
.L625:
	subq.l #3,%d0
	tst.l %d0
	jne .L598
	move.l -8(%fp),%d1
	tst.l %d1
	jne .L598
	mov3q.l #1,%d2
	cmp.l -38(%fp),%d2
	seq %d0
	neg.l %d0
	tst.b %d0
	jeq .L629
	lea clip_l,%a0
	lea lfo_row,%a2
	move.l %a0,-38(%fp)
	move.l %a2,-42(%fp)
.L631:
	move.l %d1,-(%sp)
	move.l -4(%fp),-(%sp)
	move.l -12(%fp),-(%sp)
	move.l -42(%fp),%a3
	clr.l -(%sp)
	move.l %d1,-50(%fp)
	jsr (%a3)
	lea (16,%sp),%sp
	move.l -38(%fp),%a1
	addq.l #3,%a1
	move.l %d0,%a0
	moveq #8,%d0
	move.b (%a0),-3(%a1)
	move.l %a1,-38(%fp)
	move.l -50(%fp),%d1
	addq.l #1,%d1
	move.b 1(%a0),-2(%a1)
	move.b 2(%a0),-1(%a1)
	cmp.l %d1,%d0
	jeq .L598
	move.l %d1,-(%sp)
	move.l -4(%fp),-(%sp)
	move.l -12(%fp),-(%sp)
	move.l -42(%fp),%a3
	clr.l -(%sp)
	move.l %d1,-50(%fp)
	jsr (%a3)
	lea (16,%sp),%sp
	move.l -38(%fp),%a1
	addq.l #3,%a1
	move.l %d0,%a0
	moveq #8,%d0
	move.b (%a0),-3(%a1)
	move.l %a1,-38(%fp)
	move.l -50(%fp),%d1
	addq.l #1,%d1
	move.b 1(%a0),-2(%a1)
	move.b 2(%a0),-1(%a1)
	cmp.l %d1,%d0
	jne .L631
	jra .L598
.L741:
	subq.l #3,%d0
	tst.l %d0
	jne .L598
	mov3q.l #1,%d0
.L614:
	move.l -20(%fp),%d1
	tst.l %d1
	jne .L598
	mov3q.l #1,%d2
	cmp.l %d0,%d2
	seq %d0
	neg.l %d0
	tst.b %d0
	jeq .L632
	lea clip_l,%a0
	lea lfo_row,%a2
	move.l %a0,-38(%fp)
	move.l %a2,-42(%fp)
.L634:
	move.l %d1,-(%sp)
	move.l -16(%fp),-(%sp)
	move.l -24(%fp),-(%sp)
	move.l -42(%fp),%a3
	clr.l -(%sp)
	move.l %d1,-50(%fp)
	jsr (%a3)
	lea (16,%sp),%sp
	move.l -38(%fp),%a1
	addq.l #3,%a1
	move.l %d0,%a0
	moveq #8,%d0
	move.b -3(%a1),(%a0)
	move.l %a1,-38(%fp)
	move.l -50(%fp),%d1
	addq.l #1,%d1
	move.b -2(%a1),1(%a0)
	move.b -1(%a1),2(%a0)
	cmp.l %d1,%d0
	jeq .L598
	move.l %d1,-(%sp)
	move.l -16(%fp),-(%sp)
	move.l -24(%fp),-(%sp)
	move.l -42(%fp),%a3
	clr.l -(%sp)
	move.l %d1,-50(%fp)
	jsr (%a3)
	lea (16,%sp),%sp
	move.l -38(%fp),%a1
	addq.l #3,%a1
	move.l %d0,%a0
	moveq #8,%d0
	move.b -3(%a1),(%a0)
	move.l %a1,-38(%fp)
	move.l -50(%fp),%d1
	addq.l #1,%d1
	move.b -2(%a1),1(%a0)
	move.b -1(%a1),2(%a0)
	cmp.l %d1,%d0
	jne .L634
	jra .L598
.L615:
	move.l 16(%fp),%d3
	cmp.l #2330,%d3
	jeq .L647
	movem.l -76(%fp),#3084
	unlk %fp
	rts
.L739:
	subq.l #3,%d0
	tst.l %d0
	jne .L598
	move.l 16(%fp),%d2
	cmp.l #6322,%d2
	jeq .L655
	cmp.l #36568,%d2
	jeq .L659
	cmp.l #2330,%d2
	seq %d0
	move.l -8(%fp),%a1
	move.l -12(%fp),%a0
	move.l -4(%fp),-42(%fp)
	neg.l %d0
.L623:
	move.l %a0,-50(%fp)
	move.l %a1,-54(%fp)
	move.l %d0,-46(%fp)
	jsr nv_ensure
	move.l -50(%fp),%d1
	move.l -42(%fp),%d3
	add.l #33681922,%d3
	move.l -20(%fp),%a2
	lsl.l #4,%d1
	move.l -24(%fp),%d2
	move.l -16(%fp),-42(%fp)
	add.l -54(%fp),%d1
	lsl.l #3,%d1
	add.l %d3,%d1
	lsl.l #3,%d1
	move.l %d1,-28(%fp)
	jsr nv_ensure
	move.l -42(%fp),%a0
	add.l #33681922,%a0
	move.l %d2,%d1
	lsl.l #4,%d1
	move.l -28(%fp),%a1
	add.l %a2,%d1
	lsl.l #3,%d1
	add.l %d1,%a0
	move.l %a0,%d3
	lsl.l #3,%d3
	move.l %d3,%a0
	move.b (%a1),(%a0)
	move.b 1(%a1),1(%a0)
	move.b 2(%a1),2(%a0)
	move.b 3(%a1),3(%a0)
	move.b 4(%a1),4(%a0)
	move.b 5(%a1),5(%a0)
	move.b 6(%a1),6(%a0)
	move.b 7(%a1),7(%a0)
	tst.b -43(%fp)
	jeq .L598
	mvz.w #36568,%d2
	move.l -12(%fp),%d1
	move.l #635712,%d3
	move.l -8(%fp),%d0
	lea lfo_row,%a1
	muls.l %d1,%d3
	muls.l %d2,%d0
	mov3q.l #3,%d2
	move.l %d3,%a0
	add.l %d0,%a0
	add.l #1074704439,%a0
	move.b (%a0),%d0
	move.l -4(%fp),-(%sp)
	mvz.w #36568,%d3
	and.l %d0,%d2
	move.l %d2,-(%sp)
	move.l #635712,%d2
	move.l %d1,-(%sp)
	clr.l -(%sp)
	move.l %a1,-54(%fp)
	jsr (%a1)
	move.l -24(%fp),%d1
	move.l %d0,-42(%fp)
	move.l -20(%fp),%d0
	muls.l %d1,%d2
	move.l -54(%fp),%a1
	muls.l %d3,%d0
	mov3q.l #3,%d3
	move.l %d2,%a0
	add.l %d0,%a0
	add.l #1074704439,%a0
	move.b (%a0),%d0
	move.l -16(%fp),-(%sp)
	and.l %d0,%d3
	move.l %d3,-(%sp)
	move.l %d1,-(%sp)
	clr.l -(%sp)
	jsr (%a1)
	lea (32,%sp),%sp
	move.l -42(%fp),%a1
	move.l %d0,%a0
	move.b (%a1),(%a0)
	move.b 1(%a1),1(%a0)
	move.b 2(%a1),2(%a0)
	movem.l -76(%fp),#3084
	unlk %fp
	rts
.L743:
	move.l 16(%fp),%d3
	cmp.l #6322,%d3
	jne .L611
	movem.l -76(%fp),#3084
	unlk %fp
	rts
.L658:
	mov3q.l #3,-38(%fp)
	subq.l #4,%d0
	tst.l %d0
	jeq .L598
	jra .L747
.L651:
	move.l 16(%fp),%a0
	cmp.l #6322,%a0
	jne .L624
	movem.l -76(%fp),#3084
	unlk %fp
	rts
.L659:
	clr.l %d1
.L636:
	move.l -12(%fp),%d0
	mov3q.l #3,%d2
	move.l -8(%fp),-28(%fp)
	cmp.l -38(%fp),%d2
	jeq .L748
	clr.l -(%sp)
	moveq #8,%d2
	move.l %d1,-(%sp)
	move.l -28(%fp),-(%sp)
	move.l %d0,-(%sp)
	move.l -38(%fp),-(%sp)
	move.l %d1,-50(%fp)
	jsr track_out
	lea (20,%sp),%sp
	move.l -50(%fp),%d1
	addq.l #1,%d1
	cmp.l %d1,%d2
	jne .L636
	movem.l -76(%fp),#3084
	unlk %fp
	rts
.L748:
	move.l %d1,-50(%fp)
	move.l %d0,-46(%fp)
	jsr nv_ensure
	move.l -20(%fp),%d3
	move.l -46(%fp),%d0
	move.l -24(%fp),%d2
	lsl.l #4,%d0
	add.l -28(%fp),%d0
	lsl.l #3,%d0
	add.l #33681922,%d0
	add.l -50(%fp),%d0
	lsl.l #3,%d0
	move.l %d0,-28(%fp)
	jsr nv_ensure
	move.l -50(%fp),%d1
	move.l %d2,%d0
	lsl.l #4,%d0
	move.l -28(%fp),%a0
	add.l %d3,%d0
	lsl.l #3,%d0
	move.l %d0,%a1
	add.l #33681922,%a1
	add.l %d1,%a1
	move.l %a1,%d3
	addq.l #1,%d1
	lsl.l #3,%d3
	moveq #8,%d0
	move.l %d3,%a1
	move.b (%a0),(%a1)
	move.b 1(%a0),1(%a1)
	move.b 2(%a0),2(%a1)
	move.b 3(%a0),3(%a1)
	move.b 4(%a0),4(%a1)
	move.b 5(%a0),5(%a1)
	move.b 6(%a0),6(%a1)
	move.b 7(%a0),7(%a1)
	cmp.l %d1,%d0
	jne .L636
	movem.l -76(%fp),#3084
	unlk %fp
	rts
.L742:
	move.l %a1,%d0
	move.l #635712,%d1
	muls.l %d1,%d0
	lea clip_l,%a0
	move.l %a0,-34(%fp)
	mvz.w #36568,%d2
	move.l -38(%fp),%d1
	move.l -34(%fp),%a2
	move.l %d0,%a0
	move.w -30(%fp),%d0
	muls.l %d2,%d1
	add.l %d1,%a0
	add.l #1074704439,%a0
	mulu.w #3,%d0
	mov3q.l #3,%d1
	add.l %d0,%a2
	move.b (%a0),%d0
	move.l -42(%fp),-(%sp)
	and.l %d0,%d1
	move.l %d1,-(%sp)
	move.l %a1,-(%sp)
	clr.l -(%sp)
	jsr lfo_row
	lea (16,%sp),%sp
	move.l %d0,%a0
	move.b (%a2),(%a0)
	move.b 1(%a2),1(%a0)
	move.b 2(%a2),2(%a0)
	jra .L749
.L746:
	cmp.l %d0,%d1
	jne .L598
.L655:
	lea lfo_row,%a0
	clr.l -38(%fp)
	move.l %a0,-42(%fp)
.L628:
	move.l -38(%fp),-(%sp)
	move.l -4(%fp),-(%sp)
	move.l -42(%fp),%a1
	move.l -12(%fp),-(%sp)
	move.l -8(%fp),-(%sp)
	jsr (%a1)
	move.l -38(%fp),-(%sp)
	move.l -16(%fp),-(%sp)
	move.l -24(%fp),-(%sp)
	move.l -42(%fp),%a2
	move.l -20(%fp),-(%sp)
	move.l %d0,-54(%fp)
	jsr (%a2)
	lea (32,%sp),%sp
	move.l -54(%fp),%a1
	move.l %d0,%a0
	moveq #8,%d0
	addq.l #1,-38(%fp)
	move.b (%a1),(%a0)
	move.b 1(%a1),1(%a0)
	move.b 2(%a1),2(%a0)
	cmp.l -38(%fp),%d0
	jeq .L598
	move.l -38(%fp),-(%sp)
	move.l -4(%fp),-(%sp)
	move.l -42(%fp),%a1
	move.l -12(%fp),-(%sp)
	move.l -8(%fp),-(%sp)
	jsr (%a1)
	move.l -38(%fp),-(%sp)
	move.l -16(%fp),-(%sp)
	move.l -24(%fp),-(%sp)
	move.l -42(%fp),%a2
	move.l -20(%fp),-(%sp)
	move.l %d0,-54(%fp)
	jsr (%a2)
	lea (32,%sp),%sp
	move.l -54(%fp),%a1
	move.l %d0,%a0
	moveq #8,%d0
	addq.l #1,-38(%fp)
	move.b (%a1),(%a0)
	move.b 1(%a1),1(%a0)
	move.b 2(%a1),2(%a0)
	cmp.l -38(%fp),%d0
	jne .L628
	jra .L598
.L661:
	mov3q.l #1,%d0
.L724:
	mov3q.l #1,%d3
	cmp.l %d0,%d3
	seq %d0
	neg.l %d0
	tst.b %d0
	jeq .L640
	lea clip_e,%a1
	clr.l -34(%fp)
.L642:
	move.l %a1,-54(%fp)
	moveq #8,%d2
	move.l -20(%fp),-42(%fp)
	move.l -24(%fp),-38(%fp)
	jsr nv_ensure
	move.l -38(%fp),%d0
	move.l -54(%fp),%a1
	addq.l #8,%a1
	lsl.l #4,%d0
	add.l -42(%fp),%d0
	lsl.l #3,%d0
	move.l %d0,%a0
	add.l #33681922,%a0
	add.l -34(%fp),%a0
	addq.l #1,-34(%fp)
	move.l %a0,%d1
	lsl.l #3,%d1
	move.l %d1,%a0
	move.b -8(%a1),(%a0)
	move.b -7(%a1),1(%a0)
	move.b -6(%a1),2(%a0)
	move.b -5(%a1),3(%a0)
	move.b -4(%a1),4(%a0)
	move.b -3(%a1),5(%a0)
	move.b -2(%a1),6(%a0)
	move.b -1(%a1),7(%a0)
	cmp.l -34(%fp),%d2
	jeq .L598
	move.l %a1,-54(%fp)
	moveq #8,%d2
	move.l -20(%fp),-42(%fp)
	move.l -24(%fp),-38(%fp)
	jsr nv_ensure
	move.l -38(%fp),%d0
	move.l -54(%fp),%a1
	addq.l #8,%a1
	lsl.l #4,%d0
	add.l -42(%fp),%d0
	lsl.l #3,%d0
	move.l %d0,%a0
	add.l #33681922,%a0
	add.l -34(%fp),%a0
	addq.l #1,-34(%fp)
	move.l %a0,%d1
	lsl.l #3,%d1
	move.l %d1,%a0
	move.b -8(%a1),(%a0)
	move.b -7(%a1),1(%a0)
	move.b -6(%a1),2(%a0)
	move.b -5(%a1),3(%a0)
	move.b -4(%a1),4(%a0)
	move.b -3(%a1),5(%a0)
	move.b -2(%a1),6(%a0)
	move.b -1(%a1),7(%a0)
	cmp.l -34(%fp),%d2
	jne .L642
	jra .L598
.L640:
	lea undo_e,%a1
	clr.l -34(%fp)
	jra .L642
.L662:
	mov3q.l #2,%d0
	jra .L724
.L745:
	mov3q.l #3,%d0
	cmp.l -38(%fp),%d0
	jne .L598
	mov3q.l #2,%d0
	jra .L614
.L629:
	lea undo_l,%a1
	lea lfo_row,%a2
	move.l %a1,-38(%fp)
	move.l %a2,-42(%fp)
	jra .L631
.L632:
	lea undo_l,%a1
	lea lfo_row,%a2
	move.l %a1,-38(%fp)
	move.l %a2,-42(%fp)
	jra .L634
	.size	es_copied, .-es_copied
	.align	2
	.globl	es_track_clear
	.type	es_track_clear, @function
es_track_clear:
	move.l 1187521622,%d0
	lea (-28,%sp),%sp
	movem.l #3084,(%sp)
	cmp.l #1074667999,%d0
	jls .L750
	add.l #-1074668000,%d0
	move.l %d0,%d1
	move.l #635712,%d2
	remu.l %d2,%d3:%d1
	divu.l %d2,%d1
	tst.l %d3
	jne .L750
	cmp.l #10171391,%d0
	jhi .L750
	moveq #15,%d0
	cmp.l 32(%sp),%d0
	jcs .L750
	mov3q.l #7,%d2
	cmp.l 36(%sp),%d2
	jcc .L770
.L750:
	movem.l (%sp),#3084
	lea (28,%sp),%sp
	rts
.L770:
	move.l %d1,16(%sp)
	jsr nv_ensure
	mvz.w #36568,%d2
	move.l 32(%sp),%d3
	move.l 16(%sp),%d1
	muls.l %d2,%d3
	move.l 36(%sp),%a1
	add.l #33681922,%a1
	move.l 36(%sp),%d0
	lsl.l #3,%d0
	move.l %d3,24(%sp)
	move.l %d1,%d3
	lsl.l #4,%d3
	move.l %d3,%a0
	add.l 32(%sp),%a0
	mvz.w %a0,%d2
	move.l %d0,%a0
	add.l #undo_e,%a0
	move.l #635712,%d0
	muls.l %d1,%d0
	lsl.l #3,%d2
	add.l #1074704439,%d0
	add.l %d2,%a1
	move.l %a1,%d3
	lsl.l #3,%d3
	move.l %d3,%a1
	mov3q.l #3,%d3
	move.b (%a1),(%a0)
	move.b 1(%a1),1(%a0)
	move.b 2(%a1),2(%a0)
	move.b 3(%a1),3(%a0)
	move.b 4(%a1),4(%a0)
	move.b 5(%a1),5(%a0)
	move.b 6(%a1),6(%a0)
	move.b 7(%a1),7(%a0)
	move.l 24(%sp),%a0
	move.b (%a0,%d0.l),%d0
	mvz.b 269472000,%d2
	move.l %d2,%a0
	moveq #69,%d2
	and.l %d3,%d0
	cmp.l %a0,%d2
	jne .L758
	mvz.b 269472001,%d3
	moveq #83,%d2
	cmp.l %d3,%d2
	jne .L758
	mvz.b 269472002,%d3
	moveq #76,%d2
	cmp.l %d3,%d2
	jne .L758
	mvz.b 269472003,%d3
	moveq #49,%d2
	cmp.l %d3,%d2
	jne .L758
	move.l %d0,%a0
	lea (%a0,%d1.l*4),%a0
	move.l 36(%sp),%a2
	lea (39,%sp),%a3
	move.b (%a3),undo_t
	move.l %a0,%d0
	lsl.l #3,%d0
	lea (%a2,%a2.l*2),%a0
	add.l %a2,%d0
	mulu.w #3,%d0
	move.l %a0,%d1
	add.l #undo_l,%d1
	move.l %d1,%a2
	move.l %d0,%a0
	add.l #269472016,%a0
	move.b (%a0),(%a2)
	move.l 40(%sp),%d0
	move.b 1(%a0),1(%a2)
	move.b 2(%a0),2(%a2)
	btst #0,%d0
	jeq .L750
.L771:
	move.l %a1,%d0
	addq.l #8,%d0
.L755:
	clr.b (%a1)+
	cmp.l %a1,%d0
	jeq .L750
	clr.b (%a1)+
	cmp.l %a1,%d0
	jne .L755
	jra .L750
.L758:
	move.l #269472016,%a0
.L754:
	clr.b (%a0)+
	cmp.l #269473552,%a0
	jne .L754
	moveq #69,%d3
	moveq #83,%d2
	move.l %d0,%a0
	lea (%a0,%d1.l*4),%a0
	lea (39,%sp),%a3
	move.b %d3,269472000
	move.b %d2,269472001
	moveq #76,%d3
	moveq #49,%d2
	move.l %a0,%d0
	lsl.l #3,%d0
	move.b %d3,269472002
	move.b %d2,269472003
	move.l 36(%sp),%a2
	add.l %a2,%d0
	mulu.w #3,%d0
	move.b (%a3),undo_t
	lea (%a2,%a2.l*2),%a0
	move.l %a0,%d1
	add.l #undo_l,%d1
	move.l %d1,%a2
	move.l %d0,%a0
	add.l #269472016,%a0
	move.b (%a0),(%a2)
	move.l 40(%sp),%d0
	move.b 1(%a0),1(%a2)
	move.b 2(%a0),2(%a2)
	btst #0,%d0
	jne .L771
	jra .L750
	.size	es_track_clear, .-es_track_clear
	.align	2
	.globl	es_part_clear
	.type	es_part_clear, @function
es_part_clear:
	move.l %d3,-(%sp)
	move.l 1187521622,%d0
	move.l %d2,-(%sp)
	move.l 12(%sp),%a0
	cmp.l #1074667999,%d0
	jls .L772
	add.l #-1074668000,%d0
	move.l %d0,%d2
	move.l #635712,%d3
	remu.l %d3,%d1:%d2
	divu.l %d3,%d2
	tst.l %d1
	jne .L772
	cmp.l #10171391,%d0
	jhi .L772
	mov3q.l #3,%d0
	cmp.l %a0,%d0
	jcs .L772
	lea (%a0,%d2.l*4),%a1
	move.l %a1,%d1
	mulu.w #24,%d1
	move.l %d1,%a1
	add.l #269472040,%d1
	add.l #269472016,%a1
.L777:
	mvz.b 269472000,%d0
	moveq #69,%d2
	cmp.l %d0,%d2
	jne .L780
	mvz.b 269472001,%d0
	moveq #83,%d3
	cmp.l %d0,%d3
	jne .L780
	mvz.b 269472002,%d0
	moveq #76,%d2
	cmp.l %d0,%d2
	jne .L780
	mvz.b 269472003,%d0
	moveq #49,%d3
	cmp.l %d0,%d3
	jne .L780
	clr.b %d2
	move.b %d2,2(%a1)
	move.b %d2,1(%a1)
	clr.b (%a1)
	addq.l #3,%a1
	cmp.l %d1,%a1
	jne .L777
.L772:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	rts
.L780:
	move.l #269472016,%a0
.L776:
	clr.b (%a0)+
	cmp.l #269473552,%a0
	jne .L776
	moveq #69,%d0
	moveq #83,%d2
	moveq #76,%d3
	move.b %d0,269472000
	move.b %d2,269472001
	moveq #49,%d0
	clr.b %d2
	move.b %d3,269472002
	move.b %d0,269472003
	move.b %d2,2(%a1)
	move.b %d2,1(%a1)
	clr.b (%a1)
	addq.l #3,%a1
	cmp.l %d1,%a1
	jne .L777
	jra .L772
	.size	es_part_clear, .-es_part_clear
	.align	2
	.globl	es_led_sync
	.type	es_led_sync, @function
es_led_sync:
	lea (-16,%sp),%sp
	movem.l #60,(%sp)
	tst.l 1187565964
	jeq .L788
	move.l -2147483440,%d0
	mov3q.l #2,%d1
	cmp.l %d0,%d1
	jcs .L804
	lea (levels.2),%a0
	move.l 1175263030,%d5
	mvz.b (%a0,%d0.l),%d3
	tst.l %d5
	jne .L805
.L796:
	clr.l %d0
	cmp.l led_shown.l,%d5
	jeq .L806
.L792:
	mvz.w #1888,%d1
	cmp.l 1074501324.l,%d1
	jcs .L788
	btst #0,%d0
	jeq .L793
	move.l %d3,%d4
	clr.l %d2
.L795:
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
	jne .L795
	move.l %d5,led_shown
	move.l %d3,led_level
.L788:
	movem.l (%sp),#60
	lea (16,%sp),%sp
	rts
.L804:
	mov3q.l #2,%d0
	lea (levels.2),%a0
	move.l 1175263030,%d5
	mvz.b (%a0,%d0.l),%d3
	tst.l %d5
	jeq .L796
	jra .L805
.L806:
	cmp.l led_level.l,%d3
	jne .L792
	movem.l (%sp),#60
	lea (16,%sp),%sp
	rts
.L805:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr euc_on
	addq.l #4,%sp
	move.l %d0,%d5
	cmp.l led_shown.l,%d5
	jne .L792
	jra .L806
.L793:
	clr.l %d4
	clr.l %d2
	jra .L795
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
	jeq .L809
	tst.l 1175352268
	jeq .L811
	tst.l 1175352292
	jne .L812
.L811:
	move.b 269161676,%d1
	move.b 269161680,%d0
	mvz.b %d1,%d1
	mvz.b %d0,%d0
	move.l %d1,-(%sp)
	move.l %d0,-(%sp)
	jsr entry_at
	addq.l #8,%sp
	tst.l %d0
	jeq .L812
	move.l %d0,%a0
	mov3q.l #1,%d1
	move.b (%a0),%d0
	and.l %d1,%d0
.L809:
	rts
.L812:
	clr.l %d0
	rts
	.size	es_blocked, .-es_blocked
	.align	2
	.globl	es_shift_blocked
	.type	es_shift_blocked, @function
es_shift_blocked:
	move.l -2147483630,%d0
	tst.l %d0
	jne .L830
	tst.l 1175352268
	jeq .L829
	tst.l 1175352292
	jne .L827
.L829:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr euc_on
	addq.l #4,%sp
.L827:
	rts
.L830:
	clr.l %d0
	rts
	.size	es_shift_blocked, .-es_shift_blocked
	.align	2
	.globl	es_sel_count
	.type	es_sel_count, @function
es_sel_count:
	tst.l -2147483630
	jeq .L838
	mov3q.l #3,%d0
	rts
.L838:
	mov3q.l #7,%d0
	rts
	.size	es_sel_count, .-es_sel_count
	.align	2
	.globl	es_sel_row
	.type	es_sel_row, @function
es_sel_row:
	tst.b es_mode.l
	jeq .L842
	tst.l -2147483630
	jne .L842
	mov3q.l #6,%d0
	rts
.L842:
	move.l 1175262960,%d0
	rts
	.size	es_sel_row, .-es_sel_row
	.align	2
	.globl	es_sel_pick
	.type	es_sel_pick, @function
es_sel_pick:
	move.l %d2,-(%sp)
	tst.l -2147483630
	jne .L848
	move.l 1187500856,%d1
	mov3q.l #6,%d2
	cmp.l %d1,%d2
	seq %d0
	neg.l %d0
	move.b %d0,es_mode
	cmp.l %d1,%d2
	jeq .L851
.L848:
	move.l 8(%sp),%d0
	move.l (%sp)+,%d2
	rts
.L851:
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
	move.b 269161676,%d1
	move.b 269161680,%d0
	mvz.b %d1,%d1
	mvz.b %d0,%d0
	move.l %d1,-(%sp)
	move.l %d0,-(%sp)
	jsr entry_at
	mov3q.l #1,-(%sp)
	pea 25.w
	pea 117.w
	pea 31.w
	pea 61.w
	move.l %d0,%a6
	move.l #1074524426,-(%sp)
	jsr 1073816148
	lea (28,%sp),%sp
	move.l #.LC5,(%sp)
	pea .LC0
	pea .LC5
	mov3q.l #1,-(%sp)
	clr.l -(%sp)
	pea 26.w
	pea 62.w
	move.l #1074524426,-(%sp)
	move.l #1074505846,-(%sp)
	jsr 1073821956
	lea (36,%sp),%sp
	tst.l %a6
	jeq .L853
	move.b (%a6),%d0
	btst #0,%d0
	jne .L874
.L853:
	movem.l (%sp),#16412
	mov3q.l #1,1187497772
	lea (40,%sp),%sp
	rts
.L874:
	mvz.b 1(%a6),%d0
	moveq #9,%d1
	cmp.l %d0,%d1
	jcc .L860
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
.L854:
	moveq #10,%d2
	remu.l %d2,%d1:%d0
	add.l #48,%d1
	move.b %d1,(%a1)
	clr.b (%a0)
	lea (32,%sp),%a0
	move.l %a0,20(%sp)
	move.b 28(%sp),%d0
	jeq .L861
	clr.l %d1
	lea (28,%sp),%a1
.L856:
	move.b %d0,(%a0)+
	move.l %d1,16(%sp)
	addq.l #1,%d1
	move.b (%a1,%d1.l),%d0
	jne .L856
	move.l 16(%sp),%d0
	addq.l #2,%d0
	move.l 20(%sp),%a0
	add.l %d1,%a0
	move.l %d0,16(%sp)
.L855:
	move.b #58,(%a0)
	moveq #9,%d1
	mvz.b 2(%a6),%d0
	cmp.l %d0,%d1
	jcc .L862
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
.L857:
	moveq #10,%d4
	remu.l %d4,%d1:%d0
	add.l #48,%d1
	move.b %d1,(%a0)
	clr.b (%a1)
	move.b 28(%sp),%d0
	jeq .L863
	move.l 16(%sp),%a0
	move.l 20(%sp),%d1
	lea (28,%sp),%a1
	sub.l %a0,%a1
	lea (%a0,%d1.l),%a6
.L859:
	move.b %d0,(%a6)+
	addq.l #1,%a0
	move.b (%a1,%a0.l),%d0
	jne .L859
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
.L875:
	mov3q.l #1,1187497772
	movem.l (%sp),#16412
	lea (40,%sp),%sp
	rts
.L860:
	lea (29,%sp),%a0
	move.l %a0,24(%sp)
	lea (28,%sp),%a1
	jra .L854
.L862:
	move.l 24(%sp),%a1
	lea (28,%sp),%a0
	jra .L857
.L861:
	mov3q.l #1,16(%sp)
	jra .L855
.L863:
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
	jra .L875
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
	move.b 269161680,%d0
	move.l %d2,-(%sp)
	mvz.b %d0,%d0
	move.l %d0,-(%sp)
	jsr entry_at
	clr.l -(%sp)
	pea 8.w
	pea 118.w
	pea 24.w
	pea 60.w
	move.l #1074524426,-(%sp)
	move.l %d0,36(%sp)
	jsr 1073816148
	lea (32,%sp),%sp
	move.l 4(%sp),%d0
	tst.l %d0
	jeq .L876
	move.l %d0,%a0
	move.b (%a0),%d1
	btst #0,%d1
	jeq .L878
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
.L876:
	move.l (%sp)+,%d2
	addq.l #4,%sp
	rts
.L878:
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
	jra .L876
	.size	es_body, .-es_body
	.align	2
	.globl	es_tte_right
	.type	es_tte_right, @function
es_tte_right:
	mov3q.l #1,%d0
	cmp.l 8(%sp),%d0
	jeq .L892
.L885:
	rts
.L892:
	tst.l 1175352268
	jeq .L885
	tst.l 1175352292
	jne .L885
	mov3q.l #1,4(%sp)
	jra open_page
	.size	es_tte_right, .-es_tte_right
	.align	2
	.globl	es_func_right
	.type	es_func_right, @function
es_func_right:
	tst.b es_mode.l
	jeq .L896
	tst.l -2147483630
	jne .L896
	mov3q.l #1,%d0
	cmp.l 4(%sp),%d0
	jeq .L900
	mov3q.l #1,%d0
	rts
.L896:
	clr.l %d0
	rts
.L900:
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
	jeq .L901
	moveq #50,%d1
	cmp.l 12(%sp),%d1
	jeq .L910
	subq.l #1,%d0
	tst.l %d0
	jeq .L911
.L901:
	move.l (%sp)+,%d2
	addq.l #4,%sp
	rts
.L911:
	moveq #49,%d2
	cmp.l 12(%sp),%d2
	jne .L901
	move.b 269161676,%d1
	move.b 269161680,%d0
	mvz.b %d1,%d1
	mvz.b %d0,%d0
	move.l %d1,-(%sp)
	move.l %d0,-(%sp)
	jsr entry_at
	addq.l #8,%sp
	tst.l %d0
	jeq .L901
	move.l %d0,%a0
	mov3q.l #1,%d2
	move.b (%a0),%d1
	eor.l %d2,%d1
	move.b %d1,(%a0)
	move.b 269161676,%d1
	move.b 269161680,%d0
	mvz.b %d1,%d1
	mvz.b %d0,%d0
	move.l %d1,-(%sp)
	move.l %d0,-(%sp)
	jsr (apply_at.isra.0)
	addq.l #8,%sp
	move.l (%sp)+,%d2
	addq.l #4,%sp
	jra draw
.L910:
	tst.l %d0
	jne .L901
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
	jeq .L904
	move.l (%sp)+,%d2
	addq.l #4,%sp
	jmp 1074249808
.L904:
	tst.b es_mode.l
	jeq .L901
	tst.l -2147483630
	jne .L901
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
	jeq .L912
	mov3q.l #6,%d0
	cmp.l %a0,%d0
	jcs .L912
	mov3q.l #2,%d2
	cmp.l %a0,%d2
	jeq .L912
	mvz.b 269161676,%d2
	move.l %d2,20(%sp)
	move.b 269161680,%d0
	move.l %d2,-(%sp)
	mvz.b %d0,%d0
	move.l %d0,-(%sp)
	move.l %d1,16(%sp)
	move.l %a0,20(%sp)
	jsr entry_at
	addq.l #8,%sp
	move.l 8(%sp),%d1
	move.l 12(%sp),%a0
	tst.l %d0
	jeq .L912
	move.l 1187521622,%a1
	move.l #36437,%a2
	mvz.b 269161680,%d2
	move.l %d2,16(%sp)
	mulu.w #36568,%d2
	add.l %d2,%a1
	tst.b (%a1,%a2.l)
	jeq .L914
	move.w 22(%sp),%d2
	mulu.w #2330,%d2
	move.b 80(%a1,%d2.l),%d2
	move.w %d2,%a1
.L915:
	mov3q.l #6,%d2
	cmp.l %a0,%d2
	jeq .L921
	move.w %a1,%d2
	mvz.b %d2,%d2
	move.l %d2,%a1
	moveq #64,%d2
	cmp.l %a1,%d2
	jcc .L917
	move.w #64,%a1
.L917:
	mov3q.l #1,%d2
	cmp.l %a0,%d2
	jcc .L916
	subq.l #1,%a1
	tst.l %a1
	jlt .L930
.L916:
	lea (field.1),%a2
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jlt .L931
.L919:
	cmp.l %d1,%a1
	jge .L920
	move.l %a1,%d1
.L920:
	mvz.b %d1,%d2
	cmp.l %d0,%d2
	jeq .L912
	move.b %d1,(%a0)
	move.b 269161680,%d0
	move.l 20(%sp),-(%sp)
	mvz.b %d0,%d0
	move.l %d0,-(%sp)
	jsr (apply_at.isra.0)
	addq.l #8,%sp
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	lea (16,%sp),%sp
	jra draw
.L912:
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	lea (16,%sp),%sp
	rts
.L931:
	clr.l %d1
	jra .L919
.L914:
	mvz.w #36435,%d2
	move.b (%a1,%d2.l),%d2
	move.w %d2,%a1
	jra .L915
.L921:
	lea (field.1),%a2
	mov3q.l #3,%a1
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jge .L919
	jra .L931
.L930:
	lea (field.1),%a2
	sub.l %a1,%a1
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jge .L919
	jra .L931
	.size	es_knob, .-es_knob
	.align	2
	.globl	es_project_write
	.type	es_project_write, @function
es_project_write:
	lea (-24,%sp),%sp
	movem.l #7196,(%sp)
	move.l 28(%sp),%d3
	move.l #269455376,%d2
	jsr nv_ensure
	sub.l %a2,%a2
	lea es_entry_default,%a3
	lea es_line_format,%a4
.L934:
	move.l %d2,-(%sp)
	jsr (%a3)
	addq.l #4,%sp
	tst.l %d0
	jne .L933
	move.l %d2,-(%sp)
	move.l %a2,-(%sp)
	pea (line.0)
	jsr (%a4)
	move.l %d0,-(%sp)
	pea (line.0)
	move.l %d3,-(%sp)
	jsr 1073833656
	lea (24,%sp),%sp
.L933:
	addq.l #1,%a2
	addq.l #8,%d2
	cmp.l #2048,%a2
	jne .L934
	mvz.b 269472000,%d0
	moveq #69,%d1
	cmp.l %d0,%d1
	jne .L947
	mvz.b 269472001,%d0
	moveq #83,%d4
	cmp.l %d0,%d4
	jne .L947
	mvz.b 269472002,%d0
	moveq #76,%d1
	cmp.l %d0,%d1
	jne .L947
	mvz.b 269472003,%d0
	moveq #49,%d4
	cmp.l %d0,%d4
	jne .L947
.L936:
	mvz.b 269473792,%d0
	moveq #69,%d1
	cmp.l %d0,%d1
	jne .L950
	mvz.b 269473793,%d0
	moveq #83,%d4
	cmp.l %d0,%d4
	jne .L950
	mvz.b 269473794,%d0
	cmp.l %d0,%d4
	jne .L950
	mvz.b 269473795,%d0
	moveq #49,%d1
	cmp.l %d0,%d1
	jne .L950
	clr.l %d2
	move.l #269472016,%a3
	lea es_lfo_line_format,%a4
.L941:
	sub.l %a2,%a2
.L943:
	mvz.b (%a3,%a2.l),%d0
	mov3q.l #5,%d4
	move.l %d0,%d1
	subq.l #1,%d1
	cmp.l %d1,%d4
	jcs .L942
	move.l %d2,-(%sp)
	move.l %d0,-(%sp)
	move.l %a2,-(%sp)
	pea (line.0)
	jsr (%a4)
	pea 22.w
	pea (line.0)
	move.l %d3,-(%sp)
	jsr 1073833656
	lea (28,%sp),%sp
.L942:
	addq.l #1,%a2
	cmp.l #1536,%a2
	jne .L943
	subq.l #1,%d2
	tst.l %d2
	jne .L944
	movem.l (%sp),#7196
	lea (24,%sp),%sp
	rts
.L944:
	pea 15.w
	move.l #269473808,%a3
	pea es_lfs_marker
	move.l %d3,-(%sp)
	jsr 1073833656
	lea (12,%sp),%sp
	mov3q.l #1,%d2
	sub.l %a2,%a2
	jra .L943
.L950:
	move.l #269473808,%a0
.L940:
	clr.b (%a0)+
	cmp.l #269475344,%a0
	jne .L940
	moveq #69,%d4
	moveq #83,%d0
	moveq #49,%d1
	clr.l %d2
	move.l #269472016,%a3
	lea es_lfo_line_format,%a4
	move.b %d4,269473792
	move.b %d0,269473793
	move.b %d0,269473794
	move.b %d1,269473795
	jra .L941
.L947:
	move.l #269472016,%a0
.L937:
	clr.b (%a0)+
	cmp.l #269473552,%a0
	jne .L937
	moveq #69,%d0
	moveq #83,%d1
	moveq #76,%d4
	move.b %d0,269472000
	moveq #49,%d0
	move.b %d1,269472001
	move.b %d4,269472002
	move.b %d0,269472003
	jra .L936
	.size	es_project_write, .-es_project_write
	.align	2
	.globl	es_project_begin
	.type	es_project_begin, @function
es_project_begin:
	tst.l 4(%sp)
	jeq .L973
	rts
.L973:
	move.l #269455376,%a0
.L965:
	clr.b (%a0)+
	cmp.l #269471760,%a0
	jne .L965
	moveq #69,%d0
	move.l #269472016,%a0
	move.b %d0,269455360
	moveq #83,%d0
	move.b %d0,269455361
	moveq #78,%d0
	move.b %d0,269455362
	moveq #49,%d0
	move.b %d0,269455363
.L966:
	clr.b (%a0)+
	cmp.l #269473552,%a0
	jne .L966
	moveq #69,%d0
	move.l #269473808,%a0
	move.b %d0,269472000
	moveq #83,%d0
	move.b %d0,269472001
	moveq #76,%d0
	move.b %d0,269472002
	moveq #49,%d0
	move.b %d0,269472003
.L967:
	clr.b (%a0)+
	cmp.l #269475344,%a0
	jne .L967
	moveq #69,%d0
	move.b %d0,269473792
	moveq #83,%d0
	move.b %d0,269473793
	move.b %d0,269473794
	moveq #49,%d0
	move.b %d0,269473795
	clr.b %d0
	move.b %d0,lfs_seen
	rts
	.size	es_project_begin, .-es_project_begin
	.align	2
	.globl	es_project_line
	.type	es_project_line, @function
es_project_line:
	link.w %fp,#-32
	move.l %d2,-(%sp)
	tst.l 12(%fp)
	jeq .L1013
.L974:
	move.l -36(%fp),%d2
	unlk %fp
	rts
.L1013:
	pea -12(%fp)
	pea -16(%fp)
	pea -20(%fp)
	move.l 8(%fp),-(%sp)
	jsr es_lfo_line_parse
	lea (16,%sp),%sp
	mov3q.l #1,%d1
	cmp.l %d0,%d1
	jcc .L976
	mvz.b 269472000,%d1
	moveq #69,%d2
	cmp.l %d1,%d2
	jne .L990
	mvz.b 269472001,%d1
	moveq #83,%d2
	cmp.l %d1,%d2
	jne .L990
	mvz.b 269472002,%d1
	moveq #76,%d2
	cmp.l %d1,%d2
	jne .L990
	mvz.b 269472003,%d1
	moveq #49,%d2
	cmp.l %d1,%d2
	jne .L990
.L978:
	mvz.b 269473792,%d1
	moveq #69,%d2
	cmp.l %d1,%d2
	jne .L993
	mvz.b 269473793,%d1
	moveq #83,%d2
	cmp.l %d1,%d2
	jne .L993
	mvz.b 269473794,%d1
	cmp.l %d1,%d2
	jne .L993
	mvz.b 269473795,%d1
	moveq #49,%d2
	cmp.l %d1,%d2
	jne .L993
	mov3q.l #3,%d2
	cmp.l %d0,%d2
	jeq .L983
.L1014:
	tst.l -12(%fp)
	jne .L1009
	move.l -20(%fp),%a1
	move.l -16(%fp),%d1
.L984:
	move.l %a1,%d0
	add.l #269472016,%a1
	move.w %d1,%a0
	move.b %d1,(%a1)
	tst.b lfs_seen.l
	jne .L974
	move.w %a0,%d1
	add.l #269473808,%d0
	move.l %d0,%a1
	move.b %d1,(%a1)
.L1016:
	move.l -36(%fp),%d2
	unlk %fp
	rts
.L976:
	pea -8(%fp)
	pea -20(%fp)
	move.l 8(%fp),-(%sp)
	jsr es_line_parse
	lea (12,%sp),%sp
	subq.l #2,%d0
	tst.l %d0
	jne .L974
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
	move.l %d2,-28(%fp)
	moveq #24,%d2
	lsl.l %d2,%d0
	move.l %a0,%d2
	swap %d2
	clr.w %d2
	move.l -20(%fp),%a0
	add.l #33681922,%a0
	or.l -28(%fp),%d1
	move.l %d2,-24(%fp)
	mvz.b -2(%fp),%d2
	or.l -24(%fp),%d0
	move.l %d2,-32(%fp)
	mvz.b -6(%fp),%d2
	move.l %d2,%a1
	move.l %a0,%d2
	lsl.l #3,%d2
	move.l %d2,%a0
	move.l -32(%fp),%d2
	lsl.l #8,%d2
	move.l %d2,-32(%fp)
	move.l %a1,%d2
	lsl.l #8,%d2
	or.l -32(%fp),%d1
	or.l %d2,%d0
	move.b -1(%fp),%d1
	move.l %d1,4(%a0)
	move.b -5(%fp),%d0
	move.l %d0,(%a0)
	move.l -36(%fp),%d2
	unlk %fp
	rts
.L983:
	tst.b lfs_seen.l
	jeq .L995
	moveq #1,%d1
	move.l -36(%fp),%d2
	move.b %d1,lfs_seen
	unlk %fp
	rts
.L993:
	move.l #269473808,%a0
.L982:
	clr.b (%a0)+
	cmp.l #269475344,%a0
	jne .L982
	moveq #69,%d1
	moveq #83,%d2
	move.b %d1,269473792
	moveq #49,%d1
	move.b %d2,269473793
	move.b %d2,269473794
	mov3q.l #3,%d2
	move.b %d1,269473795
	cmp.l %d0,%d2
	jne .L1014
	jra .L983
.L990:
	move.l #269472016,%a0
.L979:
	clr.b (%a0)+
	cmp.l #269473552,%a0
	jne .L979
	moveq #69,%d1
	moveq #83,%d2
	move.b %d1,269472000
	move.b %d2,269472001
	moveq #76,%d1
	moveq #49,%d2
	move.b %d1,269472002
	move.b %d2,269472003
	jra .L978
.L1009:
	tst.b lfs_seen.l
	jne .L1015
.L995:
	move.l #269473808,%a0
.L987:
	clr.b (%a0)+
	cmp.l #269475344,%a0
	jne .L987
	moveq #69,%d2
	moveq #83,%d1
	subq.l #3,%d0
	move.b %d2,269473792
	move.b %d1,269473793
	move.b %d1,269473794
	moveq #49,%d2
	moveq #1,%d1
	move.b %d2,269473795
	move.b %d1,lfs_seen
	tst.l %d0
	jeq .L974
	move.l -16(%fp),%d1
	move.l -20(%fp),%a1
	move.l %a1,%d0
	move.w %d1,%a0
	tst.l -12(%fp)
	jeq .L984
	move.w %a0,%d1
	add.l #269473808,%d0
	move.l %d0,%a1
	move.b %d1,(%a1)
	jra .L1016
.L1015:
	move.b -13(%fp),%d0
	move.w %d0,%a0
	move.l -20(%fp),%d0
	add.l #269473808,%d0
	move.l %d0,%a1
	move.w %a0,%d1
	move.b %d1,(%a1)
	jra .L1016
	.size	es_project_line, .-es_project_line
	.data
	.type	line.0, @object
	.size	line.0, 48
line.0:
	.zero	48
	.section	.rodata
	.type	field.1, @object
	.size	field.1, 7
field.1:
	.base64	"AQIAAwQFBg=="
	.type	levels.2, @object
	.size	levels.2, 3
levels.2:
	.ascii	"\f0D"
	.data
	.type	lfs_seen, @object
	.size	lfs_seen, 1
lfs_seen:
	.zero	1
	.section	.rodata
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
	.align	2
	.type	shown, @object
	.size	shown, 24
shown:
	.zero	24
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
	.type	undo_t, @object
	.size	undo_t, 1
undo_t:
	.zero	1
	.type	clip_t, @object
	.size	clip_t, 1
clip_t:
	.zero	1
	.type	undo_l, @object
	.size	undo_l, 24
undo_l:
	.zero	24
	.type	clip_l, @object
	.size	clip_l, 24
clip_l:
	.zero	24
	.type	undo_e, @object
	.size	undo_e, 64
undo_e:
	.zero	64
	.type	clip_e, @object
	.size	clip_e, 64
clip_e:
	.zero	64
	.section	.rodata
	.align	2
	.type	lfo_names, @object
	.size	lfo_names, 24
lfo_names:
	.long	.LC8
	.long	.LC9
	.long	.LC11
	.long	.LC12
	.long	.LC13
	.long	.LC4
	.type	page_order, @object
	.size	page_order, 5
page_order:
	.base64	"AAIBAwQ="
	.globl	es_lfo_tgt
	.data
	.type	es_lfo_tgt, @object
	.size	es_lfo_tgt, 24
es_lfo_tgt:
	.zero	24
	.globl	es_lfo_buf
	.align	2
	.type	es_lfo_buf, @object
	.size	es_lfo_buf, 48
es_lfo_buf:
	.zero	48
	.align	2
	.type	es_window, @object
	.size	es_window, 4
es_window:
	.zero	4
	.globl	es_lfs_marker
	.section	.rodata
	.type	es_lfs_marker, @object
	.size	es_lfs_marker, 16
es_lfs_marker:
	.string	"#EUCLID_LFS=-\r\n"
	.type	skey, @object
	.size	skey, 13
skey:
	.string	"#EUCLID_LFS="
	.type	lkey, @object
	.size	lkey, 13
lkey:
	.string	"#EUCLID_LFO="
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

| ---- LFO destinations and live pulses -----------------------------------
| The LFO engine, per track and LFO (two stock copies: 0x40003b90 and the
| one inlined in the frame builder): d2 = LFO, a4 = 0x80004858 + 8 x track,
| a2 = the frame record, a5 = the DSP record minus 24. The displaced code
| loads the destination code into d4 and points a0 at the record it indexes.
| A code equal to the LFO's own speed (6 + LFO) is the module's EUCLID
| placeholder when its table names a destination: a0 then points so that
| (a0, d4 x 2) is the module's halfword. d0, d1 and a1 are dead here.
        .macro es_lfo_stub resume
        mvs.b (30,%a2,%d2.l),%d4
        moveq #6,%d1
        add.l %d2,%d1
        cmp.l %d1,%d4
        beq.s 3f
        move.l %a4,%d0
        sub.l #0x80004858,%d0
        lsr.l #3,%d0
        move.l %d0,%d1
        add.l %d1,%d1
        add.l %d0,%d1
        add.l %d2,%d1
        lea es_lfo_tgt,%a1
        clr.b (0,%a1,%d1.l)
2:      moveq #12,%d1
        cmp.l %d1,%d4
        blt.s 1f
        move.l %a5,%a0
1:      jmp \resume
3:      move.l %a0,-(%sp)
        move.l %d2,-(%sp)
        move.l %a4,%d0
        sub.l #0x80004858,%d0
        lsr.l #3,%d0
        move.l %d0,-(%sp)
        jsr es_lfo_route
        addq.l #8,%sp
        move.l (%sp)+,%a0
        tst.l %d0
        beq.s 2b
        move.l %d0,%a0
        sub.l %d4,%a0
        sub.l %d4,%a0
        jmp \resume
        .endm

        .global es_lfo_a_stub, es_lfo_b_stub
es_lfo_a_stub:
        es_lfo_stub 0x40003ca4
es_lfo_b_stub:
        es_lfo_stub 0x4000d03e

| The step evaluation 0x4009d1e8: arguments at 108 (track), 112 (bank),
| 116 (pattern), 120 (step) above sp at both sites; a5 = the step's bit in
| its long word, (a0, a3) the mask-0 long word. es_live_bit returns -1 to
| keep the stored bit.
| 0x4009d37c: d0 = mask 1 | mask 0 (the "any trig" chain; masks 2 and 3
| follow). Displaced: a0 = a2 + a4 x 4 + d1; d0 = (a1, a3); d0 |= (a0, a3).
        .global es_eva_stub, es_evb_stub
es_eva_stub:
        lea (0,%a2,%a4.l*4),%a0
        adda.l %d1,%a0
        move.l (0,%a1,%a3.l),%d0
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        move.l 136(%sp),-(%sp)          | step, pattern, bank, track
        move.l 136(%sp),-(%sp)
        move.l 136(%sp),-(%sp)
        move.l 136(%sp),-(%sp)
        jsr es_live_bit
        lea 16(%sp),%sp
        move.l %d0,%a1                  | a1 is dead until 0x4009d40a
        movem.l (%sp),%d0-%d1/%a0
        lea 16(%sp),%sp
        move.l %a1,-(%sp)
        tst.l (%sp)+
        bmi.s 1f
        move.l %d1,-(%sp)               | stored long without this step's bit
        move.l %a5,%d1
        not.l %d1
        and.l (0,%a0,%a3.l),%d1
        or.l %d1,%d0
        move.l (%sp)+,%d1
        move.l %a1,-(%sp)
        tst.l (%sp)+
        beq.s 2f
        move.l %a5,-(%sp)               | the live pulse
        or.l (%sp)+,%d0
2:      jmp 0x4009d38a
1:      or.l (0,%a0,%a3.l),%d0
        jmp 0x4009d38a

| 0x4009d418: d0 = a5 & mask 0 decides a sample trig (beq 0x4009d420 skips
| it). Displaced: a0 += d1; d0 = a5; d0 &= (a0, a3).
es_evb_stub:
        adda.l %d1,%a0
        move.l %a5,%d0
        and.l (0,%a0,%a3.l),%d0
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        move.l 136(%sp),-(%sp)
        move.l 136(%sp),-(%sp)
        move.l 136(%sp),-(%sp)
        move.l 136(%sp),-(%sp)
        jsr es_live_bit
        lea 16(%sp),%sp
        tst.l %d0
        bmi.s 1f
        beq.s 2f
        move.l %a5,(%sp)                | a pulse: this step's bit
        bra.s 1f
2:      clr.l (%sp)
1:      movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        tst.l %d0
        jmp 0x4009d420

| A step with a slide searches forward from the next step, wrapping at the
| track length, for the next step with any trig in masks 0-3 (0x4009d576,
| and the loop's 0x4009d5dc): d3 = the candidate step, fp = its bit, a1 / a0
| its mask-1 / mask-0 long words. Stock reaches the search only for a step
| with a trig there, so it always ends at the latest on the step itself; a
| live pulse may have no stored trig, so the candidate takes the live pulse
| and the current step (120 above sp) always counts as found.
| Displaced: d1 = (a1, a3) | (a0, a3). a1 is reloaded before its next use.
        .macro es_slide_stub resume
        move.l (0,%a1,%a3.l),%d1
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        move.l %d3,-(%sp)               | candidate, pattern, bank, track
        move.l 136(%sp),-(%sp)
        move.l 136(%sp),-(%sp)
        move.l 136(%sp),-(%sp)
        jsr es_live_bit
        lea 16(%sp),%sp
        move.l %d0,%a1
        movem.l (%sp),%d0-%d1/%a0
        lea 16(%sp),%sp
        move.l %a1,-(%sp)
        tst.l (%sp)+
        bmi.s 1f
        beq.s 2f
        move.l %fp,-(%sp)
        or.l (%sp)+,%d1
        bra.s 2f
1:      or.l (0,%a0,%a3.l),%d1
2:      cmp.l 120(%sp),%d3
        bne.s 3f
        move.l %fp,-(%sp)
        or.l (%sp)+,%d1
3:      jmp \resume
        .endm

        .global es_slide_a_stub, es_slide_b_stub
es_slide_a_stub:
        es_slide_stub 0x4009d57e
es_slide_b_stub:
        es_slide_stub 0x4009d5e4

| 0x40034df4, the grid LED painter's TRIGS state: the mask-0 word of trig
| page 3 - d4 is tested at bit d3 (the key). While playing, an EUC track's
| live pulses replace it. d1, a0, a1 stay live below.
        .global es_ledw_stub
es_ledw_stub:
        mvz.w (0,%a0,%d1.l*2),%d0
        lea -12(%sp),%sp
        movem.l %d1/%a0-%a1,(%sp)
        move.l %d3,-(%sp)
        move.l %d4,-(%sp)
        move.l %d0,-(%sp)
        jsr es_led_word
        lea 12(%sp),%sp
        movem.l (%sp),%d1/%a0-%a1
        lea 12(%sp),%sp
        btst %d3,%d0
        jmp 0x40034dfa

| 0x400392cc: LFO SETUP's PMTR knob on an audio track (d4 = 0, d6 = 0).
| d3 = the current byte, d5 = the knob argument, a4 = the LFO. The stock
| span to 0x4003932c only computes the new d3; es_pmtr_knob replaces it
| with the EUCLID positions after FX2. d0-d2, d7, a0, a1 are dead after.
        .global es_pmtr_stub
es_pmtr_stub:
        move.l %d5,-(%sp)
        move.l %d3,-(%sp)
        move.l %a4,-(%sp)
        jsr es_pmtr_knob
        lea 12(%sp),%sp
        move.l %d0,%d3
        jmp 0x4003932c

| 0x4003bf64: the PMTR formatter fmt(buffer, value). A EUCLID destination is
| printed by the module; anything else runs the stock formatter.
        .global es_fmt_stub
es_fmt_stub:
        move.l 8(%sp),-(%sp)
        move.l 8(%sp),-(%sp)
        jsr es_pmtr_fmt
        addq.l #8,%sp
        tst.l %d0
        beq.s 1f
        rts
1:      lea -20(%sp),%sp
        movem.l %d2-%d3/%a2-%a4,(%sp)
        jmp 0x4003bf6c
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

| ---- copies, clears, Part save and reload (native.c es_copied) ------------
| Each site is the instruction after a stock memcpy(dst, src, n) returns:
| its three arguments are still at (sp), 4(sp), 8(sp). es_copy_args hands
| them to es_copied; the site's stub then replays the displaced instructions.
| Play Modes detours some of the memcpy calls themselves, just before these
| sites, so the two compose.
es_copy_args:
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        move.l 28(%sp),-(%sp)           | n
        move.l 28(%sp),-(%sp)           | src
        move.l 28(%sp),-(%sp)           | dst
        jsr es_copied
        lea 12(%sp),%sp
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        rts

        .global es_cp_pattern_out, es_cp_pattern_undo, es_cp_pattern_in
        .global es_cp_track_out, es_cp_track_in, es_cp_track_mirror, es_cp_track_restore
        .global es_cp_trigs_out, es_cp_trigs_in
        .global es_cp_part_out, es_cp_part_undo, es_cp_part_in, es_cp_part_save, es_cp_part_reload

| 0x40026ed4: pattern copy, the pattern into the clipboard.
es_cp_pattern_out:
        jsr es_copy_args
        moveq #14,%d0
        move.l %d0,0x460d0ffa
        jmp 0x40026edc
| 0x40026f64: before a pattern paste or clear, the pattern into the undo buffer.
es_cp_pattern_undo:
        jsr es_copy_args
        moveq #14,%d0
        move.l %d0,0x460c80f0
        jmp 0x40026f6c
| 0x4002b9e2: pattern paste or undo, the clipboard or undo buffer into the pattern.
es_cp_pattern_in:
        jsr es_copy_args
        move.l %d2,-(%sp)
        move.l %d3,-(%sp)
        addi.l #0x1001614e,%d4
        jmp 0x4002b9ec
| 0x40029796: track copy and a paste's undo copy, the track into either buffer.
es_cp_track_out:
        jsr es_copy_args
        add.l %a2,%d2
        movea.l %d2,%a0
        adda.l #0x8e56,%a0
        jmp 0x400297a0
| 0x4002b69a: track paste or its undo, either buffer into the track.
es_cp_track_in:
        jsr es_copy_args
        move.l %d4,-(%sp)
        move.l %a3,-(%sp)
        addi.l #0x1001614e,%d2
        jmp 0x4002b6a4
| 0x4002b6a8: ... and into its battery copy.
es_cp_track_mirror:
        jsr es_copy_args
        add.l %a2,%d3
        movea.l %d3,%a0
        adda.l #0x8e56,%a0
        jmp 0x4002b6b2
| 0x4002b436: undo of a track clear, the undo buffer into the track.
es_cp_track_restore:
        jsr es_copy_args
        pea 0x91a
        pea 0x460bf218
        jmp 0x4002b440
| 0x40029558: TRACK TRIG EDIT's TRIGS row (copy, and the undo copy before a
| paste or clear), the track's lock bytes into either buffer.
es_cp_trigs_out:
        jsr es_copy_args
        pea 0x80
        addi.l #0x89a,%d2
        jmp 0x40029562
| 0x4002a42e: its paste or undo, either buffer into the track.
es_cp_trigs_in:
        jsr es_copy_args
        move.l %a2,%d5
        addi.l #0x828,%d5
        jmp 0x4002a436
| 0x40029358: Part copy, the Part into the clipboard.
es_cp_part_out:
        jsr es_copy_args
        moveq #17,%d0
        move.l %d0,0x460d0ffa
        jmp 0x40029360
| 0x4002931c: before a Part paste or clear, the Part into the undo buffer.
es_cp_part_undo:
        jsr es_copy_args
        moveq #17,%d0
        move.l %d0,0x460c80f0
        jmp 0x40029324
| 0x40029a84: Part paste or undo, either buffer into the Part.
es_cp_part_in:
        jsr es_copy_args
        movea.l 0x46c82456,%a0
        jmp 0x40029a8a
| 0x4004a946: Part save, the Part into its saved copy.
es_cp_part_save:
        jsr es_copy_args
        pea 0x18b2
        move.l %d2,-(%sp)
        jmp 0x4004a94c
| 0x4004ab36: Part reload, the saved copy into the Part.
es_cp_part_reload:
        jsr es_copy_args
        pea 0x18b2
        move.l %d2,-(%sp)
        jmp 0x4004ab3c

| 0x40039df4: the audio track clear (pattern, track, what), entry.
        .global es_clear_stub, es_part_clear_stub
es_clear_stub:
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        move.l 28(%sp),-(%sp)           | what
        move.l 28(%sp),-(%sp)           | track
        move.l 28(%sp),-(%sp)           | pattern
        jsr es_track_clear
        lea 12(%sp),%sp
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        lea -60(%sp),%sp
        movem.l %d2-%d7/%a2-%a6,(%sp)
        jmp 0x40039dfc
| 0x4004a9d0: Part clear (part), entry; its save follows.
es_part_clear_stub:
        lea -16(%sp),%sp
        movem.l %d0-%d1/%a0-%a1,(%sp)
        move.l 20(%sp),-(%sp)           | part
        jsr es_part_clear
        addq.l #4,%sp
        movem.l (%sp),%d0-%d1/%a0-%a1
        lea 16(%sp),%sp
        lea -16(%sp),%sp
        movem.l %d2-%d3/%a2-%a3,(%sp)
        jmp 0x4004a9d8

| Constant tables, kept in .text: stock code names some of them through
| lea operands, and .text links at the same address in every runtime,
| with or without the browser's core logger.
        .text
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
