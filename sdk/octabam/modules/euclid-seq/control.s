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
	.type	fmt0, @function
fmt0:
	move.l %d3,-(%sp)
	move.l shown,%d1
	move.l %d1,%d0
	move.l %d2,-(%sp)
	moveq #99,%d2
	move.l 12(%sp),%a0
	cmp.l %d1,%d2
	jcc .L19
	moveq #99,%d0
.L19:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L21
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
.L21:
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
	jcc .L25
	moveq #99,%d0
.L25:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L27
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
.L27:
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
	jcc .L31
	moveq #99,%d0
.L31:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L33
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
.L33:
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
	jcc .L37
	moveq #99,%d0
.L37:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L39
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
.L39:
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
	jcc .L43
	moveq #99,%d0
.L43:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L45
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
.L45:
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
	jcc .L49
	moveq #99,%d0
.L49:
	moveq #9,%d3
	cmp.l %d1,%d3
	jcc .L51
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
.L51:
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
	jcs .L64
	tst.l %d0
	jeq .L54
	cmp.l 28(%sp),%d0
	jls .L65
.L77:
	mvz.b 1(%a0),%d2
	move.l %d2,%a1
	cmp.l %d2,%d0
	jcs .L74
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
	jeq .L58
.L79:
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
.L58:
	mvz.b 2(%a0),%d1
	cmp.l %d1,%d0
	jcs .L75
	tst.l %d1
	jeq .L60
.L78:
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
.L60:
	mvz.b 6(%a0),%d0
	mov3q.l #2,%d3
	cmp.l %d0,%d3
	jeq .L71
	mov3q.l #3,%d2
	cmp.l %d0,%d2
	jeq .L62
	subq.l #1,%d0
	tst.l %d0
	jeq .L76
	move.l %a1,%d0
	or.l %d1,%d0
.L54:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	lea (12,%sp),%sp
	rts
.L64:
	moveq #64,%d0
	cmp.l 28(%sp),%d0
	jhi .L77
.L65:
	move.l (%sp)+,%d2
	clr.l %d0
	move.l (%sp)+,%d3
	lea (12,%sp),%sp
	rts
.L75:
	move.l %d0,%d1
	tst.l %d1
	jeq .L60
	jra .L78
.L74:
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
	jeq .L58
	jra .L79
.L62:
	mov3q.l #1,%d0
	eor.l %d0,%d1
.L71:
	move.l %a1,%d0
	and.l %d1,%d0
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	lea (12,%sp),%sp
	rts
.L76:
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
.L81:
	clr.b (%a0)+
	cmp.l %d0,%a0
	jne .L81
	clr.l %d2
	lea es_step,%a2
.L83:
	move.l %d2,-(%sp)
	move.l %d3,-(%sp)
	jsr (%a2)
	addq.l #8,%sp
	tst.l %d0
	jeq .L82
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
.L82:
	addq.l #1,%d2
	moveq #64,%d0
	cmp.l %d2,%d0
	jne .L83
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
	jlt .L92
	add.l #8192,%d1
	moveq #14,%d4
	asr.l %d4,%d1
	add.l %d1,%d2
	cmp.l %d0,%d2
	jle .L133
.L121:
	move.b %d3,16(%sp)
.L95:
	move.b 16(%sp),1(%a0)
	mvz.b 2(%a0),%d2
	move.l 4(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jlt .L96
.L135:
	add.l #8192,%d1
	moveq #14,%d4
	asr.l %d4,%d1
	add.l %d1,%d2
.L97:
	cmp.l %d0,%d2
	jgt .L99
	move.b %d2,%d3
.L99:
	move.b %d3,2(%a0)
	move.l %d0,%d2
	subq.l #1,%d2
	mvz.b 3(%a0),%d3
	move.l 8(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jlt .L100
.L137:
	add.l #8192,%d1
	moveq #14,%d4
	asr.l %d4,%d1
	add.l %d1,%d3
	tst.l %d2
	jlt .L134
.L102:
	cmp.l %d3,%d2
	jge .L105
.L145:
	move.b %d2,16(%sp)
.L104:
	move.b 16(%sp),3(%a0)
	mvz.b 4(%a0),%d3
	move.l 12(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jlt .L106
.L139:
	add.l #8192,%d1
	moveq #14,%d4
	asr.l %d4,%d1
	add.l %d1,%d3
.L107:
	cmp.l %d3,%d2
	jge .L110
	move.b %d2,16(%sp)
.L109:
	move.b 16(%sp),4(%a0)
	lea (16,%a1),%a2
	mvz.b 5(%a0),%d1
	muls.l (%a2),%d0
	tst.l %d0
	jlt .L111
.L141:
	add.l #8192,%d0
	moveq #14,%d3
	asr.l %d3,%d0
	add.l %d0,%d1
.L112:
	cmp.l %d1,%d2
	jge .L115
	move.b %d2,%d3
.L114:
	move.b %d3,5(%a0)
	mvz.b 6(%a0),%d0
	move.l 20(%a1),%d2
	move.l %d2,%d1
	lsl.l #2,%d1
	btst #29,%d2
	jne .L116
.L143:
	add.l #8192,%d1
	moveq #14,%d2
	asr.l %d2,%d1
	add.l %d1,%d0
.L117:
	mov3q.l #3,%d4
	cmp.l %d0,%d4
	jge .L119
	moveq #3,%d0
.L119:
	move.b %d0,6(%a0)
	movem.l (%sp),#1052
	lea (20,%sp),%sp
	rts
.L133:
	move.b %d2,16(%sp)
	mvz.b 2(%a0),%d2
	move.b 16(%sp),1(%a0)
	move.l 4(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jge .L135
.L96:
	mvz.w #8192,%d4
	sub.l %d1,%d4
	move.l %d4,16(%sp)
	tst.l %d4
	jlt .L136
.L98:
	moveq #14,%d4
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	sub.l %d1,%d2
	jpl .L97
	clr.b %d3
	move.l %d0,%d2
	subq.l #1,%d2
	move.b %d3,2(%a0)
	mvz.b 3(%a0),%d3
	move.l 8(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jge .L137
.L100:
	mvz.w #8192,%d4
	sub.l %d1,%d4
	move.l %d4,16(%sp)
	tst.l %d4
	jlt .L138
	moveq #14,%d4
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d3
	move.b %d4,16(%sp)
	tst.l %d3
	jge .L102
.L130:
	move.b 16(%sp),3(%a0)
	mvz.b 4(%a0),%d3
	move.l 12(%a1),%d1
	muls.l %d0,%d1
	tst.l %d1
	jge .L139
.L106:
	mvz.w #8192,%d4
	sub.l %d1,%d4
	move.l %d4,16(%sp)
	tst.l %d4
	jlt .L140
	moveq #14,%d4
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d3
	move.b %d4,16(%sp)
	tst.l %d3
	jge .L107
.L131:
	move.b 16(%sp),4(%a0)
	lea (16,%a1),%a2
	mvz.b 5(%a0),%d1
	muls.l (%a2),%d0
	tst.l %d0
	jge .L141
.L111:
	mvz.w #8192,%d3
	sub.l %d0,%d3
	jmi .L142
	moveq #14,%d4
	move.l %d3,%d0
	asr.l %d4,%d0
	clr.b %d3
	sub.l %d0,%d1
	jpl .L112
.L132:
	move.b %d3,5(%a0)
	mvz.b 6(%a0),%d0
	move.l 20(%a1),%d2
	move.l %d2,%d1
	lsl.l #2,%d1
	btst #29,%d2
	jeq .L143
.L116:
	mvz.w #8192,%d2
	sub.l %d1,%d2
	jmi .L144
	moveq #14,%d3
	asr.l %d3,%d2
	sub.l %d2,%d0
	jpl .L117
.L126:
	clr.b %d0
	move.b %d0,6(%a0)
	movem.l (%sp),#1052
	lea (20,%sp),%sp
	rts
.L134:
	clr.l %d2
	cmp.l %d3,%d2
	jlt .L145
.L105:
	move.b %d3,16(%sp)
	jra .L104
.L92:
	mvz.w #8192,%d4
	sub.l %d1,%d4
	move.l %d4,16(%sp)
	tst.l %d4
	jlt .L146
	moveq #14,%d4
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d2
	move.b %d4,16(%sp)
	tst.l %d2
	jlt .L95
.L147:
	cmp.l %d0,%d2
	jgt .L121
	jra .L133
.L115:
	move.b %d1,%d3
	jra .L114
.L110:
	move.b %d3,16(%sp)
	jra .L109
.L138:
	mvz.w #16383,%d1
	moveq #14,%d4
	add.l %d1,16(%sp)
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d3
	move.b %d4,16(%sp)
	tst.l %d3
	jlt .L130
	jra .L102
.L140:
	mvz.w #16383,%d1
	moveq #14,%d4
	add.l %d1,16(%sp)
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d3
	move.b %d4,16(%sp)
	tst.l %d3
	jlt .L131
	jra .L107
.L146:
	mvz.w #16383,%d1
	moveq #14,%d4
	add.l %d1,16(%sp)
	move.l 16(%sp),%d1
	asr.l %d4,%d1
	clr.b %d4
	sub.l %d1,%d2
	move.b %d4,16(%sp)
	tst.l %d2
	jlt .L95
	jra .L147
.L144:
	add.l #16383,%d2
	moveq #14,%d3
	asr.l %d3,%d2
	sub.l %d2,%d0
	jpl .L117
	jra .L126
.L142:
	add.l #16383,%d3
	moveq #14,%d4
	move.l %d3,%d0
	asr.l %d4,%d0
	clr.b %d3
	sub.l %d0,%d1
	jmi .L132
	jra .L112
.L136:
	mvz.w #16383,%d1
	add.l %d1,16(%sp)
	jra .L98
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
	jne .L152
	mvz.b 1(%a0),%d1
	moveq #64,%d2
	cmp.l %d1,%d2
	jcs .L148
	mvz.b 2(%a0),%d1
	cmp.l %d1,%d2
	jcs .L148
	mvz.b 3(%a0),%d1
	moveq #63,%d2
	cmp.l %d1,%d2
	jcs .L148
	mvz.b 4(%a0),%d1
	cmp.l %d1,%d2
	jcs .L148
	mvz.b 5(%a0),%d1
	cmp.l %d1,%d2
	jcs .L148
	mvz.b 6(%a0),%d1
	mov3q.l #3,%d2
	cmp.l %d1,%d2
	jcs .L148
	tst.b 7(%a0)
	seq %d0
	mvs.b %d0,%d0
	neg.l %d0
.L148:
	move.l (%sp)+,%d2
	rts
.L152:
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
	jcs .L158
	move.l 12(%fp),%d0
	moveq #15,%d1
	or.l 16(%fp),%d0
	cmp.l %d0,%d1
	jcs .L158
	move.l 8(%fp),%a0
	clr.l %d1
	clr.l %d0
	lea (%a0,%a0.l*2),%a1
	add.l #es_lfo_tgt,%a1
.L160:
	mvz.b (%a1,%d1.l),%d2
	move.l 8(%fp),%d3
	move.l %d2,%a0
	mov3q.l #6,%d2
	muls.l %d2,%d3
	subq.l #1,%a0
	move.l %d3,-32(%fp)
	mov3q.l #5,%d3
	cmp.l %a0,%d3
	jcs .L159
	move.l -32(%fp),%a2
	add.l #es_lfo_buf,%a2
	mvs.w (%a2,%d1.l*2),%d2
	mov3q.l #1,%d0
	add.l #-16384,%d2
	add.l %d2,-24(%fp,%a0.l*4)
.L159:
	addq.l #1,%d1
	mov3q.l #3,%d3
	cmp.l %d1,%d3
	jne .L160
	tst.l %d0
	jeq .L155
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
	jeq .L155
	move.b (%a0),%d1
	and.l #129,%d1
	cmp.l #129,%d1
	jeq .L177
.L158:
	clr.l %d0
.L155:
	movem.l -48(%fp),#1036
	unlk %fp
	rts
.L177:
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
	jeq .L162
	mvz.w #2330,%d2
	move.l 8(%fp),%d1
	muls.l %d2,%d1
	move.b 80(%a1,%d1.l),%d1
.L163:
	tst.b %d1
	jeq .L158
	mvz.b %d1,%d3
	moveq #64,%d2
	cmp.l %d3,%d2
	jcc .L164
	moveq #64,%d1
.L164:
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
.L162:
	mvz.w #36435,%d1
	move.b (%a1,%d1.l),%d1
	jra .L163
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
	jeq .L179
	move.b 80(%a0,%d7.l),%d0
.L180:
	mvz.b %d0,%d0
	moveq #64,%d1
	move.l %d0,-16(%fp)
	cmp.l %d0,%d1
	jcc .L181
	move.l %d1,-16(%fp)
.L181:
	move.l 1175263052,%d2
	moveq #63,%d0
	cmp.l %d2,%d0
	jcc .L182
	clr.l %d2
.L182:
	move.l 1187521622,%a3
	mvz.b 269161680,%d3
	move.l 1187521622,%d0
	mulu.w #36568,%d3
	add.l %d3,%a3
	cmp.l #1074667999,%d0
	jls .L185
	add.l #-1074668000,%d0
	move.l %d0,%d4
	move.l #635712,%d1
	remu.l %d1,%d3:%d4
	divu.l %d1,%d4
	tst.l %d3
	jne .L185
	cmp.l #10171391,%d0
	jhi .L185
	tst.l -2147457608
	jeq .L186
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
.L187:
	mov3q.l #7,%d1
	move.l %d2,%d0
	lsr.l #3,%d0
	and.l %d2,%d1
	cmp.l -16(%fp),%d2
	jcc .L191
	tst.l %a2
	jeq .L188
	move.l %d2,-(%sp)
	move.l %a5,-(%sp)
	jsr (%a4)
	addq.l #8,%sp
.L189:
	mov3q.l #1,%d1
	addq.l #1,%d2
	lsl.l %d3,%d1
	addq.l #1,%d3
	btst #0,%d0
	jeq .L190
	or.l %d1,%d4
.L190:
	moveq #16,%d0
	cmp.l %d3,%d0
	jne .L187
.L191:
	move.l %d5,%d7
	clr.l %d2
	move.l 12(%fp),-12(%fp)
	addq.l #3,%d7
.L195:
	move.l %d2,%d0
	lsr.l #2,%d0
	cmp.l %d3,%d2
	jcc .L193
	add.l -12(%fp),%d0
	move.l %d0,%d1
	addq.l #1,%d1
	btst %d2,%d4
	jeq .L194
	mov3q.l #1,-(%sp)
	move.l %d5,-(%sp)
	move.l %d1,-(%sp)
	move.l %d7,-(%sp)
	move.l %d0,-(%sp)
	move.l %d6,-(%sp)
	jsr 1073816148
	lea (24,%sp),%sp
.L193:
	addq.l #1,%d2
	moveq #16,%d0
	addq.l #3,-12(%fp)
	cmp.l %d2,%d0
	jne .L195
.L209:
	movem.l -56(%fp),#15612
	unlk %fp
	rts
.L185:
	move.l -2147457608,%d0
.L186:
	addq.l #7,%d7
	sub.l %a2,%a2
	clr.l %d4
	clr.l %d3
	move.l %d7,-12(%fp)
	lea (-7,%fp),%a5
	lea es_step,%a4
	jra .L187
.L194:
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
	jne .L195
	jra .L209
.L188:
	move.l -12(%fp),%a1
	sub.l %d0,%a1
	mvz.b (%a3,%a1.l),%d0
	lsr.l %d1,%d0
	jra .L189
.L179:
	mvz.w #36435,%d0
	move.b (%a0,%d0.l),%d0
	jra .L180
	.size	step_bar, .-step_bar
	.align	2
	.type	euc_on, @function
euc_on:
	subq.l #8,%sp
	move.l 1187521622,%d1
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	cmp.l #1074667999,%d1
	jls .L213
	add.l #-1074668000,%d1
	move.l %d1,%d2
	move.l #635712,%d3
	remu.l %d3,%d0:%d2
	divu.l %d3,%d2
	move.l %d2,%a0
	tst.l %d0
	jne .L213
	cmp.l #10171391,%d1
	jhi .L213
	mvz.b 269161680,%d1
	moveq #15,%d2
	cmp.l %d1,%d2
	jcs .L210
	mov3q.l #7,%d3
	cmp.l 20(%sp),%d3
	jcs .L210
	tst.l -2147483630
	jeq .L221
.L210:
	move.l (%sp)+,%d2
	move.l (%sp)+,%d3
	addq.l #8,%sp
	rts
.L221:
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
	jeq .L210
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
.L213:
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
	jls .L225
	add.l #-1074668000,%d0
	move.l %d0,%d1
	move.l #635712,%d2
	remu.l %d2,%d3:%d1
	divu.l %d2,%d1
	tst.l %d3
	jne .L225
	cmp.l #10171391,%d0
	jhi .L225
	mvz.b 269161680,%d0
	moveq #15,%d2
	cmp.l %d0,%d2
	jcs .L226
	mov3q.l #7,%d3
	cmp.l 20(%sp),%d3
	jcs .L226
	tst.l -2147483630
	jne .L226
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
	jlt .L231
	move.l #-2147221504,(%a0)
	clr.l 4(%a0)
.L222:
	move.l (%sp)+,%d2
	move.l %a0,%d0
	move.l (%sp)+,%d3
	addq.l #8,%sp
	rts
.L225:
	move.b 269161680,%d0
.L226:
	move.l (%sp)+,%d2
	sub.l %a0,%a0
	move.l %a0,%d0
	move.l (%sp)+,%d3
	addq.l #8,%sp
	rts
.L231:
	move.l %d0,-(%sp)
	move.l %d0,16(%sp)
	jsr es_entry_valid
	addq.l #4,%sp
	move.l 12(%sp),%a0
	tst.l %d0
	jne .L222
	move.l #-2147221504,(%a0)
	clr.l 4(%a0)
	jra .L222
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
	jne .L251
.L232:
	movem.l (%sp),#31996
	lea (76,%sp),%sp
	rts
.L251:
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
	jeq .L232
	move.l 1187521622,%a0
	mvz.b 269161680,%d0
	mvz.w #36437,%d1
	mulu.w #36568,%d0
	add.l %d0,%a0
	tst.b (%a0,%d1.l)
	jeq .L234
	move.w 50(%sp),%d0
	mulu.w #2330,%d0
	move.b 80(%a0,%d0.l),%d1
.L235:
	mvz.b %d1,%d0
	moveq #64,%d2
	cmp.l %d0,%d2
	jcc .L236
	moveq #64,%d0
.L236:
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
.L239:
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
	jeq .L237
	move.l (%a5,%a6.l*4),%a2
	move.l %a2,%d1
	lsl.l #7,%d1
	sub.l %a2,%d1
	move.l %d1,44(%sp)
	divu.l %d0,%d1
	move.l %d1,%d0
	moveq #127,%d1
	cmp.l %d0,%d1
	jcc .L237
	moveq #127,%d0
.L237:
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
	jne .L239
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
	jeq .L240
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
.L252:
	movem.l (%sp),#31996
	lea (76,%sp),%sp
	rts
.L234:
	mvz.w #36435,%d0
	move.b (%a0,%d0.l),%d1
	jra .L235
.L240:
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
	jra .L252
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
	jeq .L263
.L253:
	addq.l #4,%sp
	rts
.L263:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L253
	pea es_close_cb
	mov3q.l #1,-(%sp)
	clr.l -(%sp)
	clr.l -(%sp)
	pea 64.w
	pea 115.w
	jsr 1074102940
	lea (24,%sp),%sp
	tst.l %d0
	jeq .L253
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
	jeq .L264
	move.l %d0,%a0
	move.b (%a0),%d1
	btst #0,%d1
	jne .L318
.L264:
	movem.l -72(%fp),#15612
	unlk %fp
	rts
.L318:
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
	jeq .L266
	move.b 80(%a0,%d3.l),%d2
	jeq .L264
.L320:
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
	jcc .L268
	moveq #64,%d2
.L268:
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
.L283:
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
	jeq .L269
	tst.b %d3
	jeq .L319
.L271:
	addq.l #1,%d1
	addq.l #2,%a2
	addq.l #2,%a3
	add.l #32,%d0
	moveq #64,%d2
	cmp.l %d1,%d2
	jne .L283
.L321:
	tst.l %a5
	jeq .L264
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
	jeq .L264
	mvz.b 269161676,%d0
	cmp.l 8(%fp),%d0
	jne .L264
	clr.l -(%sp)
	jsr 1073957844
	movem.l -72(%fp),#15612
	addq.l #4,%sp
	unlk %fp
	rts
.L266:
	move.l #36435,%a1
	move.b (%a0,%a1.l),%d2
	jeq .L264
	jra .L320
.L319:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	or.l %d2,%d3
	mvz.b %d3,%d7
	cmp.l %d7,%d4
	jeq .L272
	move.b %d3,(%a0)
	move.l -24(%fp),%a0
	move.l -32(%fp),%d4
	move.b %d3,(%a0,%d4.l)
.L272:
	move.l -32(%fp),%d7
	not.l %d2
	move.l -28(%fp),%a0
	lea (%a4,%d7.l),%a5
	move.b %d2,%d7
	add.l -32(%fp),%a0
.L274:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	and.l %d7,%d3
	mvz.b %d3,%d2
	cmp.l %d2,%d4
	jeq .L273
	move.b %d3,(%a0)
	move.b %d3,(%a1,%a0.l)
.L273:
	addq.l #8,%a0
	cmp.l %a0,%a5
	jne .L274
	move.l %a2,%a0
	tst.b -(%a0)
	jeq .L275
	clr.b %d2
	clr.b (%a0)
	move.b %d2,-1(%a3)
.L275:
	tst.b (%a2)
	jeq .L277
	clr.b (%a2)
	clr.b (%a3)
.L277:
	mov3q.l #1,%a5
	addq.l #1,%d1
	addq.l #2,%a2
	addq.l #2,%a3
	add.l #32,%d0
	moveq #64,%d2
	cmp.l %d1,%d2
	jne .L283
	jra .L321
.L269:
	tst.b %d3
	jeq .L271
	move.l -32(%fp),%d7
	not.l %d2
	lea (%a4,%d7.l),%a5
	move.b %d2,%d7
.L280:
	move.b (%a0),%d3
	mvz.b (%a0),%d4
	and.l %d7,%d3
	mvz.b %d3,%d2
	cmp.l %d2,%d4
	jeq .L279
	move.b %d3,(%a0)
	move.b %d3,(%a1,%a0.l)
.L279:
	addq.l #8,%a0
	cmp.l %a0,%a5
	jne .L280
	move.l %d0,%a0
	lea (-32,%a0),%a0
.L282:
	mvz.b (%a0),%d2
	cmp.l #255,%d2
	jeq .L281
	st %d4
	move.b #-1,(%a0)
	move.b %d4,(%a1,%a0.l)
.L281:
	addq.l #1,%a0
	cmp.l %a0,%d0
	jne .L282
	tst.b (%a2)
	jeq .L277
	clr.b (%a2)
	clr.b (%a3)
	jra .L277
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
	jeq .L325
.L327:
	move.l (%sp)+,%d2
	mov3q.l #1,%d0
	lea (24,%sp),%sp
	rts
.L325:
	mvz.b 1(%a0),%d1
	moveq #64,%d2
	move.l %d1,%a1
	cmp.l %d1,%d2
	jcs .L327
	move.b 2(%a0),%d1
	move.b %d1,7(%sp)
	mvz.b %d1,%d1
	cmp.l %d1,%d2
	jcs .L327
	move.b 3(%a0),%d2
	mvz.b %d2,%d1
	move.b %d2,15(%sp)
	moveq #63,%d2
	cmp.l %d1,%d2
	jcs .L327
	move.b 4(%a0),%d1
	mvz.b %d1,%d2
	move.b %d1,11(%sp)
	moveq #63,%d1
	cmp.l %d2,%d1
	jcs .L327
	move.b 5(%a0),%d2
	mvz.b %d2,%d1
	move.b %d2,19(%sp)
	moveq #63,%d2
	cmp.l %d1,%d2
	jcs .L327
	move.b 6(%a0),%d1
	mvz.b %d1,%d2
	move.b %d1,23(%sp)
	mov3q.l #3,%d1
	cmp.l %d2,%d1
	jcs .L327
	tst.b 7(%a0)
	jne .L327
	mvz.b %d0,%d0
	cmp.l #128,%d0
	jne .L329
	mov3q.l #4,%d2
	cmp.l %a1,%d2
	jeq .L332
.L329:
	move.l (%sp)+,%d2
	clr.l %d0
	lea (24,%sp),%sp
	rts
.L332:
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
.L334:
	move.b (%a0)+,(%a1)+
	cmp.l #key+12,%a0
	jne .L334
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
.L337:
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
	jcs .L342
	move.b %d1,(%a2,%a0.l)
	move.l %a0,%d1
	add.l %d2,%d1
	cmp.l %a1,%d3
	jne .L337
.L343:
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
.L342:
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
	jne .L337
	jra .L343
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
.L346:
	addq.l #1,%a1
	addq.l #1,%a0
	mvs.b -1(%a1),%d1
	mvs.b -1(%a0),%d0
	cmp.l %d1,%d0
	jne .L353
	cmp.l #key+12,%a0
	jne .L346
	move.l 36(%sp),%a0
	moveq #15,%d1
	move.b 12(%a0),%d0
	add.l #-65,%d0
	mvz.b %d0,%d0
	cmp.l %d0,%d1
	jcs .L348
	move.l 36(%sp),%a0
	moveq #9,%d1
	mvz.b 13(%a0),%d0
	add.l #-48,%d0
	cmp.l %d0,%d1
	jcs .L348
	mvz.b 14(%a0),%d1
	moveq #9,%d2
	add.l #-48,%d1
	cmp.l %d1,%d2
	jcs .L348
	mvs.b 15(%a0),%d2
	move.l %d2,%a0
	moveq #58,%d2
	cmp.l %a0,%d2
	jne .L348
	move.l 36(%sp),%a0
	move.b 16(%a0),%d2
	move.w %d2,%a1
	lea (-49,%a1),%a1
	move.w %a1,%d2
	mvz.b %d2,%d2
	move.l %d2,%a0
	mov3q.l #7,%d2
	cmp.l %a0,%d2
	jcs .L348
	move.l 36(%sp),%a2
	mvs.b 17(%a2),%d2
	move.l %d2,%a0
	moveq #58,%d2
	cmp.l %a0,%d2
	jne .L348
	move.b 18(%a2),%d2
	move.w %d2,%a0
	move.b %d2,15(%sp)
	lea (-48,%a0),%a0
	move.w %a0,%d2
	mvz.b %d2,%d2
	move.l %d2,%a0
	mov3q.l #1,%d2
	cmp.l %a0,%d2
	jcs .L348
	moveq #10,%d2
	muls.l %d2,%d0
	add.l %d1,%d0
	move.l %d0,28(%sp)
	moveq #15,%d1
	subq.l #1,%d0
	cmp.l %d0,%d1
	jcs .L348
	mvs.b 15(%sp),%d0
	moveq #49,%d2
	cmp.l %d0,%d2
	jeq .L363
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
.L352:
	mvs.b (%a0),%d0
	moveq #44,%d1
	cmp.l %d0,%d1
	jne .L348
	mvz.b 1(%a0),%d1
	moveq #9,%d2
	add.l #-48,%d1
	cmp.l %d1,%d2
	jcs .L348
	lea (4,%a0),%a2
	clr.l %d0
	move.l %a2,16(%sp)
	addq.l #1,%a0
.L351:
	moveq #10,%d2
	addq.l #1,%a0
	muls.l %d2,%d0
	mvz.b (%a0),%d2
	add.l %d1,%d0
	move.l %d2,%d1
	moveq #9,%d2
	add.l #-48,%d1
	cmp.l %d1,%d2
	jcs .L350
	cmp.l 16(%sp),%a0
	jne .L351
.L348:
	move.l (%sp)+,%d2
	mov3q.l #1,%d0
	move.l (%sp)+,%a2
	lea (24,%sp),%sp
	rts
.L353:
	move.l (%sp)+,%d2
	clr.l %d0
	move.l (%sp)+,%a2
	lea (24,%sp),%sp
	rts
.L350:
	cmp.l #255,%d0
	jhi .L348
	move.l 20(%sp),%a2
	addq.l #1,20(%sp)
	move.b %d0,(%a2)+
	cmp.l 24(%sp),%a2
	jne .L352
	tst.b (%a0)
	jne .L348
	move.l 44(%sp),-(%sp)
	move.l %a1,12(%sp)
	jsr es_entry_valid
	addq.l #4,%sp
	tst.l %d0
	jeq .L348
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
.L363:
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
	jra .L352
	.size	es_line_parse, .-es_line_parse
	.align	2
	.globl	es_lfo_line_format
	.type	es_lfo_line_format, @function
es_lfo_line_format:
	lea (-24,%sp),%sp
	mov3q.l #3,%d1
	movem.l #1148,(%sp)
	move.l 32(%sp),%d0
	move.l %d0,%d4
	remu.l %d1,%d3:%d4
	divu.l %d1,%d4
	move.l %d0,%d2
	moveq #24,%d5
	divu.l %d5,%d2
	moveq #96,%d6
	move.l 28(%sp),%a2
	move.l %a2,%a1
	lea lkey,%a0
	move.l %d0,%d1
	mov3q.l #3,%d0
	divu.l %d6,%d1
	mov3q.l #7,%d6
	and.l %d6,%d4
	and.l %d0,%d2
	move.l #lkey+12,%d0
	moveq #15,%d5
	and.l %d5,%d1
.L365:
	move.b (%a0)+,(%a1)+
	cmp.l %d0,%a0
	jne .L365
	move.l 36(%sp),%d0
	moveq #10,%d6
	add.l #65,%d1
	move.b %d1,12(%a2)
	remu.l %d6,%d5:%d0
	add.l #49,%d2
	move.b %d2,13(%a2)
	moveq #58,%d6
	clr.b %d2
	add.l #49,%d4
	move.l %d5,%d1
	add.l #48,%d1
	move.b %d1,19(%a2)
	move.w #3338,%d1
	add.l #49,%d3
	move.b %d4,15(%a2)
	move.b %d3,17(%a2)
	moveq #22,%d0
	move.b %d6,14(%a2)
	move.b %d6,16(%a2)
	move.b %d6,18(%a2)
	move.b %d2,22(%a2)
	move.w %d1,20(%a2)
	movem.l (%sp),#1148
	lea (24,%sp),%sp
	rts
	.size	es_lfo_line_format, .-es_lfo_line_format
	.align	2
	.globl	es_lfo_line_parse
	.type	es_lfo_line_parse, @function
es_lfo_line_parse:
	subq.l #4,%sp
	move.l %a2,-(%sp)
	move.l %d2,-(%sp)
	move.l 16(%sp),%a1
	lea lkey,%a0
.L371:
	addq.l #1,%a1
	addq.l #1,%a0
	mvs.b -1(%a1),%d1
	mvs.b -1(%a0),%d0
	cmp.l %d1,%d0
	jne .L374
	cmp.l #lkey+12,%a0
	jne .L371
	move.l 16(%sp),%a0
	moveq #15,%d2
	move.b 12(%a0),%d0
	add.l #-65,%d0
	mvz.b %d0,%d1
	cmp.l %d1,%d2
	jcs .L373
	move.l 16(%sp),%a1
	mov3q.l #3,%d2
	move.b 13(%a1),%d1
	move.w %d1,%a0
	move.l %a0,%d1
	add.l #-49,%d1
	mvz.b %d1,%d1
	cmp.l %d1,%d2
	jcs .L373
	mvs.b 14(%a1),%d1
	moveq #58,%d2
	cmp.l %d1,%d2
	jne .L373
	move.b 15(%a1),%d1
	mov3q.l #7,%d2
	move.w %d1,%a1
	move.l %a1,%d1
	add.l #-49,%d1
	mvz.b %d1,%d1
	cmp.l %d1,%d2
	jcs .L373
	move.l 16(%sp),%a2
	moveq #58,%d2
	mvs.b 16(%a2),%d1
	cmp.l %d1,%d2
	jne .L373
	move.b 17(%a2),%d1
	mov3q.l #2,%d2
	move.b %d1,11(%sp)
	add.l #-49,%d1
	mvz.b %d1,%d1
	cmp.l %d1,%d2
	jcs .L373
	mvs.b 18(%a2),%d1
	moveq #58,%d2
	cmp.l %d1,%d2
	jne .L373
	move.b 19(%a2),%d1
	mov3q.l #5,%d2
	add.l #-49,%d1
	mvz.b %d1,%d1
	cmp.l %d1,%d2
	jcs .L373
	tst.b 20(%a2)
	jne .L373
	move.b %d0,%d1
	mvs.b %a0,%d0
	mvs.b %a1,%d2
	move.l %d0,%a0
	move.l %d2,%a1
	mvs.b 11(%sp),%d0
	ext.w %d1
	move.l %d0,8(%sp)
	mov3q.l #2,%d0
	lea -49(%a0,%d1.l*4),%a0
	move.l %a0,%d1
	lsl.l #3,%d1
	move.l 20(%sp),%a0
	lea -49(%a1,%d1.l),%a1
	move.l %a1,%d1
	mulu.w #3,%d1
	move.l 8(%sp),%a1
	lea -49(%a1,%d1.l),%a1
	move.l %a1,(%a0)
	move.l 24(%sp),%a0
	mvs.b 19(%a2),%d1
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	add.l #-48,%d1
	move.l %d1,(%a0)
	addq.l #4,%sp
	rts
.L374:
	move.l (%sp)+,%d2
	clr.l %d0
	move.l (%sp)+,%a2
	addq.l #4,%sp
	rts
.L373:
	move.l (%sp)+,%d2
	mov3q.l #1,%d0
	move.l (%sp)+,%a2
	addq.l #4,%sp
	rts
	.size	es_lfo_line_parse, .-es_lfo_line_parse
	.align	2
	.globl	es_length_changed
	.type	es_length_changed, @function
es_length_changed:
	move.l %a2,-(%sp)
	move.l %d2,-(%sp)
	clr.l %d2
	lea (apply.isra.0),%a2
.L379:
	move.l %d2,-(%sp)
	jsr (%a2)
	addq.l #1,%d2
	addq.l #4,%sp
	moveq #8,%d0
	cmp.l %d2,%d0
	jne .L379
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
	jne .L384
	mvz.b 269472001,%d0
	moveq #83,%d2
	cmp.l %d0,%d2
	jne .L384
	mvz.b 269472002,%d0
	moveq #76,%d1
	cmp.l %d0,%d1
	jne .L384
	mvz.b 269472003,%d0
	moveq #49,%d2
	cmp.l %d0,%d2
	jne .L384
	move.l 1187521622,%d0
	cmp.l #1074667999,%d0
	jls .L387
	add.l #-1074668000,%d0
	move.l %d0,%d2
	move.l #635712,%d3
	remu.l %d3,%d1:%d2
	tst.l %d1
	jne .L387
	cmp.l #10171391,%d0
	jhi .L387
	mvz.b 269161679,%d1
	mov3q.l #3,%d2
	move.l %d1,12(%sp)
	cmp.l %d1,%d2
	jcs .L389
	mov3q.l #7,%d3
	cmp.l %a0,%d3
	jcs .L389
	mov3q.l #2,%d1
	cmp.l 28(%sp),%d1
	jcs .L389
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
	jcs .L403
	move.b (%a0),%d0
	moveq #23,%d2
	cmp.l %a1,%d2
	jcs .L386
	lea es_lfo_tgt,%a0
	move.b %d0,(%a0,%a1.l)
	jeq .L386
	move.w #16384,%d3
	lea es_lfo_buf,%a0
	move.l %a1,%d0
	add.l %d0,%d0
	move.w %d3,(%a0,%a1.l*2)
	movem.l (%sp),#1036
	add.l %a0,%d0
	lea (20,%sp),%sp
	rts
.L384:
	moveq #23,%d3
	cmp.l %a1,%d3
	jcs .L386
	clr.b %d0
	lea es_lfo_tgt,%a0
	move.b %d0,(%a0,%a1.l)
.L386:
	clr.l %d0
.L404:
	movem.l (%sp),#1036
	lea (20,%sp),%sp
	rts
.L403:
	moveq #23,%d0
	cmp.l %a1,%d0
	jcs .L386
	clr.b %d1
	lea es_lfo_tgt,%a0
	clr.l %d0
	move.b %d1,(%a0,%a1.l)
	jra .L404
.L387:
	move.b 269161679,%d0
.L389:
	moveq #23,%d2
	cmp.l %a1,%d2
	jcs .L386
	clr.b %d3
	lea es_lfo_tgt,%a0
	clr.l %d0
	move.b %d3,(%a0,%a1.l)
	jra .L404
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
	jeq .L407
	move.l 28(%sp),-(%sp)
	move.l %a6,-(%sp)
	jsr es_step
	addq.l #8,%sp
	move.l (%sp)+,%a6
	addq.l #8,%sp
	rts
.L407:
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
	jeq .L411
	mov3q.l #3,%d0
	cmp.l 28(%sp),%d0
	jcs .L411
	moveq #15,%d2
	cmp.l 32(%sp),%d2
	jcs .L411
	move.l 1187521622,%d0
	cmp.l #1074667999,%d0
	jls .L411
	add.l #-1074668000,%d0
	move.l %d0,%d3
	move.l #635712,%d2
	remu.l %d2,%d1:%d3
	divu.l %d2,%d3
	tst.l %d1
	jne .L411
	cmp.l #10171391,%d0
	jhi .L411
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
	jeq .L411
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
	jeq .L425
	move.l 24(%sp),%d0
	movem.l (%sp),#16396
	or.l %d1,%d0
	lea (20,%sp),%sp
	rts
.L411:
	movem.l (%sp),#16396
	move.l 24(%sp),%d0
	lea (20,%sp),%sp
	rts
.L425:
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
	jls .L429
	add.l #-1074668000,%d0
	move.l %d0,%d1
	move.l #635712,%d3
	remu.l %d3,%d4:%d1
	divu.l %d3,%d1
	tst.l %d4
	jne .L429
	cmp.l #10171391,%d0
	jhi .L429
	mvz.b 269161679,%d0
	mov3q.l #3,%d3
	cmp.l %d0,%d3
	jcs .L428
	move.w %a0,%d4
	mov3q.l #7,%d3
	mvz.b %d4,%d4
	move.l %d4,%a0
	cmp.l %d4,%d3
	jcs .L428
	mov3q.l #2,%d4
	cmp.l 28(%sp),%d4
	jcs .L428
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
	jne .L462
	mvz.b 269472001,%d0
	moveq #83,%d1
	cmp.l %d0,%d1
	jne .L462
	mvz.b 269472002,%d0
	moveq #76,%d3
	cmp.l %d0,%d3
	jne .L462
	mvz.b 269472003,%d0
	moveq #49,%d4
	cmp.l %d0,%d4
	jne .L462
.L433:
	mvz.b (%a2),%d0
	move.l %d2,18(%sp)
	mov3q.l #6,%d1
	cmp.l %d0,%d1
	jcs .L432
	move.b (%a2),23(%sp)
	cmp.l 32(%sp),%d2
	jeq .L488
.L432:
	tst.l 32(%sp)
	jlt .L463
	moveq #29,%d0
	cmp.l 32(%sp),%d0
	jlt .L443
	move.l 32(%sp),%d1
	mov3q.l #6,%d3
	lea page_order,%a0
	rems.l %d3,%d0:%d1
	divs.l %d3,%d1
	mvz.b (%a0,%d1.l),%d1
	muls.w #6,%d1
	add.l %d0,%d1
	move.l %d1,32(%sp)
.L443:
	move.l 36(%sp),-(%sp)
	clr.l -(%sp)
	jsr 1073947804
	add.l 40(%sp),%d0
	addq.l #8,%sp
	tst.l %d0
	jlt .L444
.L489:
	moveq #35,%d4
	cmp.l %d0,%d4
	jge .L445
	tst.l %a2
	jeq .L484
.L439:
	mov3q.l #2,%d0
	cmp.l 28(%sp),%d0
	jcs .L484
.L465:
	moveq #6,%d0
	move.b %d0,(%a2)
.L426:
	move.l %d2,%d0
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L445:
	moveq #29,%d1
	cmp.l %d0,%d1
	jge .L450
	tst.l %a2
	jeq .L484
	mov3q.l #2,%d4
	cmp.l 28(%sp),%d4
	jcc .L483
.L484:
	moveq #29,%d2
	move.l %d2,%d0
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L463:
	clr.l 32(%sp)
	move.l 36(%sp),-(%sp)
	clr.l -(%sp)
	jsr 1073947804
	add.l 40(%sp),%d0
	addq.l #8,%sp
	tst.l %d0
	jge .L489
.L444:
	tst.l %a2
	jeq .L454
	mov3q.l #2,%d0
	cmp.l 28(%sp),%d0
	jcs .L454
	clr.l %d0
.L455:
	move.l %d0,%d2
	cmp.l 18(%sp),%d0
	jne .L426
	clr.b (%a2)
	move.l %d2,%d0
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L454:
	clr.l %d2
	move.l %d2,%d0
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L429:
	move.b 269161679,%d0
.L428:
	move.l %d2,18(%sp)
	sub.l %a2,%a2
	jra .L432
.L488:
	tst.b 23(%sp)
	jeq .L490
	move.l 36(%sp),-(%sp)
	clr.l -(%sp)
	jsr 1073947804
	mvz.b 31(%sp),%d1
	addq.l #8,%sp
	move.l %d1,%a0
	lea 29(%a0,%d0.l),%a0
	move.l %a0,%d0
	tst.l %a0
	jlt .L454
	moveq #35,%d1
	cmp.l %a0,%d1
	jlt .L465
	moveq #29,%d1
	cmp.l %d0,%d1
	jge .L491
.L483:
	add.l #-29,%d0
.L492:
	move.b %d0,(%a2)
	jra .L426
.L462:
	move.l #269472016,%a0
.L434:
	clr.b (%a0)+
	cmp.l #269473552,%a0
	jne .L434
	moveq #69,%d0
	moveq #83,%d1
	moveq #76,%d3
	moveq #49,%d4
	move.b %d0,269472000
	move.b %d1,269472001
	move.b %d3,269472002
	move.b %d4,269472003
	jra .L433
.L490:
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
	jlt .L454
	moveq #35,%d1
	cmp.l %a0,%d1
	jlt .L439
	moveq #29,%d4
	cmp.l %a0,%d4
	jlt .L483
.L450:
	mov3q.l #6,%d3
	rems.l %d3,%d1:%d0
	divs.l %d3,%d0
	lea page_order,%a0
	mvz.b (%a0,%d0.l),%d0
	muls.w #6,%d0
	add.l %d1,%d0
	tst.l %a2
	jeq .L452
.L449:
	mov3q.l #2,%d1
	cmp.l 28(%sp),%d1
	jcs .L452
	moveq #29,%d4
	cmp.l %d0,%d4
	jge .L455
	add.l #-29,%d0
	jra .L492
.L452:
	move.l %d0,%d2
	moveq #29,%d3
	cmp.l %d0,%d3
	jlt .L484
	move.l %d2,%d0
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L491:
	mov3q.l #6,%d3
	rems.l %d3,%d1:%d0
	divs.l %d3,%d0
	lea page_order,%a0
	mvz.b (%a0,%d0.l),%d0
	muls.w #6,%d0
	add.l %d1,%d0
	jra .L449
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
	jne .L502
	mov3q.l #2,%d1
	cmp.l %a0,%d1
	jcs .L493
	move.l %a0,%d1
	addq.l #6,%d1
	cmp.l 32(%sp),%d1
	jeq .L511
.L493:
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L511:
	move.b 269161676,%d2
	moveq #69,%d3
	move.b %d2,16(%sp)
	mvz.b 269472000,%d1
	cmp.l %d1,%d3
	jne .L493
	mvz.b 269472001,%d1
	moveq #83,%d4
	cmp.l %d1,%d4
	jne .L493
	mvz.b 269472002,%d1
	moveq #76,%d2
	cmp.l %d1,%d2
	jne .L493
	mvz.b 269472003,%d1
	moveq #49,%d3
	cmp.l %d1,%d3
	jne .L493
	move.l 1187521622,%a1
	cmp.l #1074667999,%a1
	jls .L496
	add.l #-1074668000,%a1
	move.l %a1,%d4
	move.l #635712,%d2
	remu.l %d2,%d1:%d4
	tst.l %d1
	jne .L496
	cmp.l #10171391,%a1
	jhi .L496
	mvz.b 269161679,%d0
	mov3q.l #3,%d3
	cmp.l %d0,%d3
	jcs .L502
	mvz.b 16(%sp),%d4
	mov3q.l #7,%d2
	move.l %d4,16(%sp)
	cmp.l %d4,%d2
	jcs .L502
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
	jcc .L499
.L502:
	movem.l (%sp),#1052
	clr.l %d0
	lea (24,%sp),%sp
	rts
.L499:
	mvz.b (%a0),%d0
	tst.l %d0
	jeq .L493
	lea lfo_names,%a0
	move.l -4(%a0,%d0.l*4),%a0
	move.b (%a0),%d0
	jeq .L503
.L501:
	move.l 28(%sp),%a1
	move.b %d0,(%a1,%d1.l)
	addq.l #1,%d1
	move.b (%a0,%d1.l),%d0
	jne .L501
	lea (%a1,%d1.l),%a0
	mov3q.l #1,%d0
	clr.b (%a0)
	move.l 28(%sp),%a2
	move.l #1163215616,%d1
	move.l %d1,5(%a2)
.L512:
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
.L503:
	move.l 28(%sp),%a0
	move.l #1163215616,%d1
	move.l 28(%sp),%a2
	mov3q.l #1,%d0
	clr.b (%a0)
	move.l %d1,5(%a2)
	jra .L512
.L496:
	move.b 269161679,%d1
	movem.l (%sp),#1052
	lea (24,%sp),%sp
	rts
	.size	es_pmtr_fmt, .-es_pmtr_fmt
	.align	2
	.globl	es_led_sync
	.type	es_led_sync, @function
es_led_sync:
	lea (-16,%sp),%sp
	movem.l #60,(%sp)
	tst.l 1187565964
	jeq .L513
	move.l -2147483440,%d0
	mov3q.l #2,%d1
	cmp.l %d0,%d1
	jcs .L529
	lea (levels.2),%a0
	move.l 1175263030,%d5
	mvz.b (%a0,%d0.l),%d3
	tst.l %d5
	jne .L530
.L521:
	clr.l %d0
	cmp.l led_shown.l,%d5
	jeq .L531
.L517:
	mvz.w #1888,%d1
	cmp.l 1074501324.l,%d1
	jcs .L513
	btst #0,%d0
	jeq .L518
	move.l %d3,%d4
	clr.l %d2
.L520:
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
	jne .L520
	move.l %d5,led_shown
	move.l %d3,led_level
.L513:
	movem.l (%sp),#60
	lea (16,%sp),%sp
	rts
.L529:
	mov3q.l #2,%d0
	lea (levels.2),%a0
	move.l 1175263030,%d5
	mvz.b (%a0,%d0.l),%d3
	tst.l %d5
	jeq .L521
	jra .L530
.L531:
	cmp.l led_level.l,%d3
	jne .L517
	movem.l (%sp),#60
	lea (16,%sp),%sp
	rts
.L530:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr euc_on
	addq.l #4,%sp
	move.l %d0,%d5
	cmp.l led_shown.l,%d5
	jne .L517
	jra .L531
.L518:
	clr.l %d4
	clr.l %d2
	jra .L520
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
	jeq .L534
	tst.l 1175352268
	jeq .L536
	tst.l 1175352292
	jne .L537
.L536:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L537
	move.l %d0,%a0
	mov3q.l #1,%d1
	move.b (%a0),%d0
	and.l %d1,%d0
.L534:
	rts
.L537:
	clr.l %d0
	rts
	.size	es_blocked, .-es_blocked
	.align	2
	.globl	es_shift_blocked
	.type	es_shift_blocked, @function
es_shift_blocked:
	move.l -2147483630,%d0
	tst.l %d0
	jne .L555
	tst.l 1175352268
	jeq .L554
	tst.l 1175352292
	jne .L552
.L554:
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr euc_on
	addq.l #4,%sp
.L552:
	rts
.L555:
	clr.l %d0
	rts
	.size	es_shift_blocked, .-es_shift_blocked
	.align	2
	.globl	es_sel_count
	.type	es_sel_count, @function
es_sel_count:
	tst.l -2147483630
	jeq .L563
	mov3q.l #3,%d0
	rts
.L563:
	mov3q.l #7,%d0
	rts
	.size	es_sel_count, .-es_sel_count
	.align	2
	.globl	es_sel_row
	.type	es_sel_row, @function
es_sel_row:
	tst.b es_mode.l
	jeq .L567
	tst.l -2147483630
	jne .L567
	mov3q.l #6,%d0
	rts
.L567:
	move.l 1175262960,%d0
	rts
	.size	es_sel_row, .-es_sel_row
	.align	2
	.globl	es_sel_pick
	.type	es_sel_pick, @function
es_sel_pick:
	move.l %d2,-(%sp)
	tst.l -2147483630
	jne .L573
	move.l 1187500856,%d1
	mov3q.l #6,%d2
	cmp.l %d1,%d2
	seq %d0
	neg.l %d0
	move.b %d0,es_mode
	cmp.l %d1,%d2
	jeq .L576
.L573:
	move.l 8(%sp),%d0
	move.l (%sp)+,%d2
	rts
.L576:
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
	jeq .L578
	move.b (%a6),%d0
	btst #0,%d0
	jne .L599
.L578:
	movem.l (%sp),#16412
	mov3q.l #1,1187497772
	lea (40,%sp),%sp
	rts
.L599:
	mvz.b 1(%a6),%d0
	moveq #9,%d1
	cmp.l %d0,%d1
	jcc .L585
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
.L579:
	moveq #10,%d2
	remu.l %d2,%d1:%d0
	add.l #48,%d1
	move.b %d1,(%a1)
	clr.b (%a0)
	lea (32,%sp),%a0
	move.l %a0,20(%sp)
	move.b 28(%sp),%d0
	jeq .L586
	clr.l %d1
	lea (28,%sp),%a1
.L581:
	move.b %d0,(%a0)+
	move.l %d1,16(%sp)
	addq.l #1,%d1
	move.b (%a1,%d1.l),%d0
	jne .L581
	move.l 16(%sp),%d0
	addq.l #2,%d0
	move.l 20(%sp),%a0
	add.l %d1,%a0
	move.l %d0,16(%sp)
.L580:
	move.b #58,(%a0)
	moveq #9,%d1
	mvz.b 2(%a6),%d0
	cmp.l %d0,%d1
	jcc .L587
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
.L582:
	moveq #10,%d4
	remu.l %d4,%d1:%d0
	add.l #48,%d1
	move.b %d1,(%a0)
	clr.b (%a1)
	move.b 28(%sp),%d0
	jeq .L588
	move.l 16(%sp),%a0
	move.l 20(%sp),%d1
	lea (28,%sp),%a1
	sub.l %a0,%a1
	lea (%a0,%d1.l),%a6
.L584:
	move.b %d0,(%a6)+
	addq.l #1,%a0
	move.b (%a1,%a0.l),%d0
	jne .L584
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
.L600:
	mov3q.l #1,1187497772
	movem.l (%sp),#16412
	lea (40,%sp),%sp
	rts
.L585:
	lea (29,%sp),%a0
	move.l %a0,24(%sp)
	lea (28,%sp),%a1
	jra .L579
.L587:
	move.l 24(%sp),%a1
	lea (28,%sp),%a0
	jra .L582
.L586:
	mov3q.l #1,16(%sp)
	jra .L580
.L588:
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
	jra .L600
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
	jeq .L601
	move.l %d0,%a0
	move.b (%a0),%d1
	btst #0,%d1
	jeq .L603
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
.L601:
	move.l (%sp)+,%d2
	addq.l #4,%sp
	rts
.L603:
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
	jra .L601
	.size	es_body, .-es_body
	.align	2
	.globl	es_tte_right
	.type	es_tte_right, @function
es_tte_right:
	mov3q.l #1,%d0
	cmp.l 8(%sp),%d0
	jeq .L617
.L610:
	rts
.L617:
	tst.l 1175352268
	jeq .L610
	tst.l 1175352292
	jne .L610
	mov3q.l #1,4(%sp)
	jra open_page
	.size	es_tte_right, .-es_tte_right
	.align	2
	.globl	es_func_right
	.type	es_func_right, @function
es_func_right:
	tst.b es_mode.l
	jeq .L621
	tst.l -2147483630
	jne .L621
	mov3q.l #1,%d0
	cmp.l 4(%sp),%d0
	jeq .L625
	mov3q.l #1,%d0
	rts
.L621:
	clr.l %d0
	rts
.L625:
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
	jeq .L626
	moveq #50,%d1
	cmp.l 12(%sp),%d1
	jeq .L635
	subq.l #1,%d0
	tst.l %d0
	jeq .L636
.L626:
	move.l (%sp)+,%d2
	addq.l #4,%sp
	rts
.L636:
	moveq #49,%d2
	cmp.l 12(%sp),%d2
	jne .L626
	mvz.b 269161676,%d0
	move.l %d0,-(%sp)
	jsr entry
	addq.l #4,%sp
	tst.l %d0
	jeq .L626
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
.L635:
	tst.l %d0
	jne .L626
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
	jeq .L629
	move.l (%sp)+,%d2
	addq.l #4,%sp
	jmp 1074249808
.L629:
	tst.b es_mode.l
	jeq .L626
	tst.l -2147483630
	jne .L626
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
	jeq .L637
	mov3q.l #6,%d0
	cmp.l %a0,%d0
	jcs .L637
	mov3q.l #2,%d2
	cmp.l %a0,%d2
	jeq .L637
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
	jeq .L637
	move.l 1187521622,%a1
	move.l #36437,%a2
	mvz.b 269161680,%d2
	move.l %d2,16(%sp)
	mulu.w #36568,%d2
	add.l %d2,%a1
	tst.b (%a1,%a2.l)
	jeq .L639
	move.w 22(%sp),%d2
	mulu.w #2330,%d2
	move.b 80(%a1,%d2.l),%d2
	move.w %d2,%a1
.L640:
	mov3q.l #6,%d2
	cmp.l %a0,%d2
	jeq .L646
	move.w %a1,%d2
	mvz.b %d2,%d2
	move.l %d2,%a1
	moveq #64,%d2
	cmp.l %a1,%d2
	jcc .L642
	move.w #64,%a1
.L642:
	mov3q.l #1,%d2
	cmp.l %a0,%d2
	jcc .L641
	subq.l #1,%a1
	tst.l %a1
	jlt .L655
.L641:
	lea (field.1),%a2
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jlt .L656
.L644:
	cmp.l %d1,%a1
	jge .L645
	move.l %a1,%d1
.L645:
	mvz.b %d1,%d2
	cmp.l %d0,%d2
	jeq .L637
	move.b %d1,(%a0)
	move.l 20(%sp),-(%sp)
	jsr (apply.isra.0)
	addq.l #4,%sp
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	lea (16,%sp),%sp
	jra draw
.L637:
	move.l (%sp)+,%d2
	move.l (%sp)+,%a2
	lea (16,%sp),%sp
	rts
.L656:
	clr.l %d1
	jra .L644
.L639:
	mvz.w #36435,%d2
	move.b (%a1,%d2.l),%d2
	move.w %d2,%a1
	jra .L640
.L646:
	lea (field.1),%a2
	mov3q.l #3,%a1
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jge .L644
	jra .L656
.L655:
	lea (field.1),%a2
	sub.l %a1,%a1
	mvz.b (%a2,%a0.l),%d2
	move.l %d2,%a0
	add.l %d0,%a0
	mvz.b (%a0),%d0
	add.l %d0,%d1
	tst.l %d1
	jge .L644
	jra .L656
	.size	es_knob, .-es_knob
	.align	2
	.globl	es_project_write
	.type	es_project_write, @function
es_project_write:
	lea (-20,%sp),%sp
	movem.l #3100,(%sp)
	move.l 24(%sp),%d4
	move.l #269455376,%d3
	jsr nv_ensure
	clr.l %d2
	lea es_entry_default,%a2
	lea es_line_format,%a3
.L659:
	move.l %d3,-(%sp)
	jsr (%a2)
	addq.l #4,%sp
	tst.l %d0
	jne .L658
	move.l %d3,-(%sp)
	move.l %d2,-(%sp)
	pea (line.0)
	jsr (%a3)
	move.l %d0,-(%sp)
	pea (line.0)
	move.l %d4,-(%sp)
	jsr 1073833656
	lea (24,%sp),%sp
.L658:
	addq.l #1,%d2
	addq.l #8,%d3
	cmp.l #2048,%d2
	jne .L659
	mvz.b 269472000,%d0
	moveq #69,%d1
	cmp.l %d0,%d1
	jne .L657
	mvz.b 269472001,%d0
	moveq #83,%d3
	cmp.l %d0,%d3
	jne .L657
	mvz.b 269472002,%d0
	moveq #76,%d1
	cmp.l %d0,%d1
	jne .L657
	mvz.b 269472003,%d0
	moveq #49,%d3
	cmp.l %d0,%d3
	jne .L657
	clr.l %d2
	lea es_lfo_line_format,%a2
.L662:
	move.l %d2,%a0
	add.l #269472016,%a0
	mvz.b (%a0),%d0
	mov3q.l #5,%d3
	move.l %d0,%d1
	subq.l #1,%d1
	cmp.l %d1,%d3
	jcs .L661
	move.l %d0,-(%sp)
	move.l %d2,-(%sp)
	pea (line.0)
	jsr (%a2)
	pea 22.w
	pea (line.0)
	move.l %d4,-(%sp)
	jsr 1073833656
	lea (24,%sp),%sp
.L661:
	addq.l #1,%d2
	cmp.l #1536,%d2
	jne .L662
.L657:
	movem.l (%sp),#3100
	lea (20,%sp),%sp
	rts
	.size	es_project_write, .-es_project_write
	.align	2
	.globl	es_project_begin
	.type	es_project_begin, @function
es_project_begin:
	tst.l 4(%sp)
	jeq .L675
	rts
.L675:
	move.l #269455376,%a0
.L669:
	clr.b (%a0)+
	cmp.l #269471760,%a0
	jne .L669
	moveq #69,%d0
	move.l #269472016,%a0
	move.b %d0,269455360
	moveq #83,%d0
	move.b %d0,269455361
	moveq #78,%d0
	move.b %d0,269455362
	moveq #49,%d0
	move.b %d0,269455363
.L670:
	clr.b (%a0)+
	cmp.l #269473552,%a0
	jne .L670
	moveq #69,%d0
	move.b %d0,269472000
	moveq #83,%d0
	move.b %d0,269472001
	moveq #76,%d0
	move.b %d0,269472002
	moveq #49,%d0
	move.b %d0,269472003
	rts
	.size	es_project_begin, .-es_project_begin
	.align	2
	.globl	es_project_line
	.type	es_project_line, @function
es_project_line:
	link.w %fp,#-28
	move.l %d2,-(%sp)
	tst.l 12(%fp)
	jeq .L691
.L676:
	move.l -32(%fp),%d2
	unlk %fp
	rts
.L691:
	pea -12(%fp)
	pea -16(%fp)
	move.l 8(%fp),-(%sp)
	jsr es_lfo_line_parse
	lea (12,%sp),%sp
	subq.l #2,%d0
	tst.l %d0
	jeq .L692
	pea -8(%fp)
	pea -16(%fp)
	move.l 8(%fp),-(%sp)
	jsr es_line_parse
	lea (12,%sp),%sp
	subq.l #2,%d0
	tst.l %d0
	jne .L676
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
	move.l %d2,-24(%fp)
	moveq #24,%d2
	lsl.l %d2,%d0
	move.l %a0,%d2
	swap %d2
	clr.w %d2
	move.l -16(%fp),%a0
	add.l #33681922,%a0
	or.l -24(%fp),%d1
	move.l %d2,-20(%fp)
	mvz.b -2(%fp),%d2
	or.l -20(%fp),%d0
	move.l %d2,-28(%fp)
	mvz.b -6(%fp),%d2
	move.l %d2,%a1
	move.l %a0,%d2
	lsl.l #3,%d2
	move.l %d2,%a0
	move.l -28(%fp),%d2
	lsl.l #8,%d2
	move.l %d2,-28(%fp)
	move.l %a1,%d2
	lsl.l #8,%d2
	or.l -28(%fp),%d1
	or.l %d2,%d0
	move.b -1(%fp),%d1
	move.l %d1,4(%a0)
	move.b -5(%fp),%d0
	move.l %d0,(%a0)
	move.l -32(%fp),%d2
	unlk %fp
	rts
.L692:
	mvz.b 269472000,%d0
	moveq #69,%d2
	cmp.l %d0,%d2
	jne .L684
	mvz.b 269472001,%d0
	moveq #83,%d1
	cmp.l %d0,%d1
	jne .L684
	mvz.b 269472002,%d0
	moveq #76,%d2
	cmp.l %d0,%d2
	jne .L684
	mvz.b 269472003,%d0
	moveq #49,%d1
	cmp.l %d0,%d1
	jne .L684
	move.l -16(%fp),%a0
	add.l #269472016,%a0
	move.b -9(%fp),(%a0)
.L693:
	move.l -32(%fp),%d2
	unlk %fp
	rts
.L684:
	move.l #269472016,%a0
.L681:
	clr.b (%a0)+
	cmp.l #269473552,%a0
	jne .L681
	moveq #69,%d2
	moveq #83,%d0
	moveq #76,%d1
	move.b %d2,269472000
	moveq #49,%d2
	move.b %d0,269472001
	move.b %d1,269472002
	move.b %d2,269472003
	move.l -16(%fp),%a0
	add.l #269472016,%a0
	move.b -9(%fp),(%a0)
	jra .L693
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
	.section	.bss
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
	.data
	.align	2
	.type	es_window, @object
	.size	es_window, 4
es_window:
	.zero	4
	.section	.rodata
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
