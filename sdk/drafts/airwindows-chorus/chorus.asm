; Air Chorus -- DSP56300 port of Chris Johnson's Airwindows Chorus (MIT).
; Copyright (c) 2016 Chris Johnson; port (c) 2026 Jannik Assfalg.
; Upstream revision and full MIT licence: upstream/, LICENSE.
; FX2 only: two 8192-word rings in the slot's 16384-word Y allocation.
; Original ring length 8176 is safely replaced by a wrapped 8192 ring:
; the greatest referenced age is ceil(2*4079.824)+2 = 8162.
; 8 guard bits keep the alternating air states and buffer writes bounded
; even at full-scale Nyquist. Interpolation/mix restore that scaling only
; in the final accumulator. This is a fixed-point port, not float bit parity.
; State (X, offsets from r7):
; 00 allocator, 01 FX1 guard, 02 ring cursor, 03 phase high, 04 flip,
; 05 seeded, 06..08 targets, 09..0b final smoothed high words,
; 0c..0e smoothed low words, 10 tap offset, 11 fraction, 12 age,
; 13 dry input, 14 interpolated wet, 15 L previous,16/17 L even hi/lo,
; 18/19 L odd hi/lo,1a R previous,1b/1c R even,1d/1e R odd,
; 20/21 RANGE first slew stage,22/23 MIX first stage,28/29 tap scratch,
; 2a sine scratch,30 table base,31 sine scratch,32 phase low,
; 33 speed-target low,34/35 air delta hi/lo,36 selected air factor.
; Init clears the complete 56-word used state span, including reserved gaps.
; init preserves r1/n1/m1. Proc never reads the allocator pointer again.
; CYCLES_FORWARD_BRANCHES
init:
        move    r7,r5
        move    #>$ffffff,m5
        clr     a
        do      #56,>ac_zero
        move    a,x:(r5)+
ac_zero:
        nop
        move    x:>$213,r4
        move    #>$ffffff,m4
        move    x:(r4),x0
        move    x0,x:(r7+$00)
        move    x0,a
        sub     #>$4000,a
        clr     b
        move    #>1,x0
        tst     a
        tmi     x0,b
        move    b,x:(r7+$01)
        tst     b
        bne     ac_noalloc
        move    x:(r7+$00),r5
        clr     a
        move    #>16384,y0
        do      y0,>ac_bufzero
        move    a,y:(r5)+
ac_bufzero:
        nop
ac_noalloc:
        move    #>$200000,x0
        move    x0,x:(r7+$03)
        rts
proc:
        move    x:(r7+$01),a
        tst     a
        bne     ac_return
        move    #>$ffffff,m5
        move    #>$ffffff,m4
        move    #>$ffffff,m3
        move    #>$fab1e0,r5
        move    r5,x:(r7+$30)
; Endpoint 127 maps to 1, other bytes k/128: exactly original default at 64.
; Speed^4 radians/sample -> Q23 cycles/sample, rounded to nearest count.
        move    x:(r6+$00),a
        bsr     ac_endpoint
        move    a,x0
        move    a,y1
        mpy     x0,y1,a
        move    a,x0
        move    a,y1
        mpy     x0,y1,a
        move    a,x0
        move    #>1335,y1
        mpy     x0,y1,a
        move    #>741795,y1
        mpy     x0,y1,b
        asr     #23,b,b
        add     b,a
        move    a1,x:(r7+$06)
        move    a0,x:(r7+$33)
; Range^4 * 4079.824 samples, Q13.10.
        move    x:(r6+$01),a
        bsr     ac_endpoint
        move    a,x0
        move    a,y1
        mpy     x0,y1,a
        move    a,x0
        move    a,y1
        mpy     x0,y1,a
        move    a,x0
        move    #>4177740,y1
        mpy     x0,y1,a
        move    a,x:(r7+$07)
        move    x:(r6+$05),a
        bsr     ac_endpoint
        move    a,x:(r7+$08)
; SPEED uses a 48-bit per-sample one-pole (1024 samples / 23.2 ms).
; RANGE/MIX cascade two such poles: a jump starts at near-zero read/gain
; velocity rather than stepping one or several delay samples on its first
; sample. No block-end snap; n7 can describe a short trig-split call.
; Seed all stages from the first call's actual settings.
        move    x:(r7+$05),a
        tst     a
        bne     ac_slews
        move    x:(r7+$06),a
        move    a,x:(r7+$09)
        move    x:(r7+$33),a
        move    a1,x:(r7+$0c)
        move    x:(r7+$07),a
        move    a,x:(r7+$0a)
        move    a,x:(r7+$20)
        move    x:(r7+$08),a
        move    a,x:(r7+$0b)
        move    a,x:(r7+$22)
        move    #>1,x0
        move    x0,x:(r7+$05)
ac_slews:
        do      n7,>ac_frameend
ac_sample:
        move    x:(r7+$07),a
        move    x:(r7+$20),b
        move    x:(r7+$21),b0
        sub     b,a
        asr     #10,a,a
        add     b,a
        move    a1,x:(r7+$20)
        move    a0,x:(r7+$21)
        move    x:(r7+$08),a
        move    x:(r7+$22),b
        move    x:(r7+$23),b0
        sub     b,a
        asr     #10,a,a
        add     b,a
        move    a1,x:(r7+$22)
        move    a0,x:(r7+$23)
        move    x:(r7+$06),a
        move    x:(r7+$33),a0
        move    x:(r7+$09),b
        move    x:(r7+$0c),b0
        sub     b,a
        asr     #10,a,a
        add     b,a
        move    a1,x:(r7+$09)
        move    a0,x:(r7+$0c)
        move    x:(r7+$20),a
        move    x:(r7+$21),a0
        move    x:(r7+$0a),b
        move    x:(r7+$0d),b0
        sub     b,a
        asr     #10,a,a
        add     b,a
        move    a1,x:(r7+$0a)
        move    a0,x:(r7+$0d)
        move    x:(r7+$22),a
        move    x:(r7+$23),a0
        move    x:(r7+$0b),b
        move    x:(r7+$0e),b0
        sub     b,a
        asr     #10,a,a
        add     b,a
        move    a1,x:(r7+$0b)
        move    a0,x:(r7+$0e)
; Sine of shared L/R phase, from a linearly interpolated 1025-point quarter.
        move    x:(r7+$03),a
        bsr     ac_sine
        move    a,x:(r7+$2a)
        move    a,y1
        move    x:(r7+$0a),x0
        mpy     x0,y1,a
        move    a,x0
        move    x:(r7+$0b),y1
        mpy     x0,y1,a
        move    x:(r7+$0a),x0
        add     x0,a
        move    a1,x:(r7+$10)
        and     #>$3ff,a
        asl     #13,a,a
        move    a1,x:(r7+$11)
        move    x:(r7+$10),a
        asr     #10,a,a
        move    a1,x:(r7+$12)
; Air pre-emphasis and three-point read are the same for each channel.
        lua     (r7+$15),r3
        move    x:(r7+$00),r4
        move    x:(r0),a
        bsr     ac_channel
        move    a,x:(r0)+
        lua     (r7+$1a),r3
        move    x:(r7+$00),a
        add     #>8192,a
        move    a,r4
        move    x:(r0),a
        bsr     ac_channel
        move    a,x:(r0)+
        move    x:(r7+$02),a
        sub     #>1,a
        and     #>$1fff,a
        move    a1,x:(r7+$02)
        move    x:(r7+$03),a
        move    x:(r7+$32),a0
        move    x:(r7+$09),b
        move    x:(r7+$0c),b0
        add     b,a
        move    a0,x:(r7+$32)
        and     #>$7fffff,a
        move    a1,x:(r7+$03)
        move    x:(r7+$04),a
        eor     #>1,a
        move    a1,x:(r7+$04)
ac_frameend:
        nop
ac_return:
        rts

ac_endpoint:
        move    #>$7f0000,x0
        cmp     x0,a
        move    #>$7fffff,x0
        tge     x0,a
        rts

ac_sine:
; Q23 phase 0..1 -> first quarter position; explicit a1 transfers drop
; masked accumulator extension bits. Indices never exceed the 1026 words, including the duplicate endpoint.
        move    a1,b
        and     #>$1fffff,b
        move    b1,y0
        move    x:(r7+$03),b
        and     #>$200000,b
        tst     b
        beq     ac_unfold
        move    #>$200000,b
        move    y0,x0
        sub     x0,b
        move    b1,y0
ac_unfold:
        move    y0,a
        asr     #11,a,a
        move    a1,n5
        move    x:(r7+$30),r5
        move    (r5)+n5
        move    p:(r5)+,x0
        move    p:(r5),b
        sub     x0,b
        move    b,y1
        move    y0,a
        and     #>$7ff,a
        asl     #12,a,a
        move    a1,y0
        move    x0,x:(r7+$31)
        move    y0,x0
        mpy     x0,y1,a
        move    x:(r7+$31),x0
        add     x0,a
        move    a,x0
        move    x:(r7+$03),b
        and     #>$400000,b
        tst     b
        beq     ac_positive
        move    x0,a
        neg     a
        move    a,x0
ac_positive:
        move    x0,a
        rts

ac_channel:
; Previous is full Q23; even/odd states are Q23 + a 24-bit low word, with
; eight guard bits. Rounding never accumulates inside the air recurrences.
        move    a,x:(r7+$13)
        move    a,x1
        move    x:(r3),b
        move    x1,x:(r3)+
        sub     x1,b
        asr     #8,b,b
        move    b1,x:(r7+$34)
        move    b0,x:(r7+$35)
        move    x:(r3),a
        move    x:(r3+1),a0
        move    x:(r7+$04),x0
        move    x0,b
        tst     b
        bne     ac_evenminus
        move    x:(r7+$34),b
        move    x:(r7+$35),b0
        add     b,a
        bra     ac_evenstore
ac_evenminus:
        move    x:(r7+$34),b
        move    x:(r7+$35),b0
        sub     b,a
ac_evenstore:
        move    a1,x:(r3)
        move    a0,x:(r3+1)
        move    x:(r7+$04),b
        tst     b
        bne     ac_notfactor
        move    a1,x:(r7+$36)
ac_notfactor:
        move    x:(r3+2),a
        move    x:(r3+3),a0
        move    x:(r7+$04),b
        tst     b
        bne     ac_oddplus
        move    x:(r7+$34),b
        move    x:(r7+$35),b0
        sub     b,a
        bra     ac_oddstore
ac_oddplus:
        move    x:(r7+$34),b
        move    x:(r7+$35),b0
        add     b,a
ac_oddstore:
        move    a1,x:(r3+2)
        move    a0,x:(r3+3)
        move    x:(r7+$04),b
        tst     b
        beq     ac_factorready
        move    a1,x:(r7+$36)
ac_factorready:
; odd -= (odd-even)/256 in the full accumulator.
        move    x:(r3+2),a
        move    x:(r3+3),a0
        move    x:(r3),b
        move    x:(r3+1),b0
        sub     b,a
        asr     #8,a,a
        move    a1,x:(r7+$34)
        move    a0,x:(r7+$35)
        move    x:(r3+2),a
        move    x:(r3+3),a0
        move    x:(r7+$34),b
        move    x:(r7+$35),b0
        sub     b,a
; A -= A.high * (1 - 1/1.0001). The neglected low-word contribution
; to the leak is < 1.2e-11 in guarded units. Preserve the entire result.
        move    a1,x0
        move    #>839,y1
        mpy     x0,y1,b
        sub     b,a
        move    a1,x:(r3+2)
        move    a0,x:(r3+3)
; even -= (even-updatedOdd)/256, then the same full-precision leak.
        move    x:(r3),a
        move    x:(r3+1),a0
        move    x:(r3+2),b
        move    x:(r3+3),b0
        sub     b,a
        asr     #8,a,a
        move    a1,x:(r7+$34)
        move    a0,x:(r7+$35)
        move    x:(r3),a
        move    x:(r3+1),a0
        move    x:(r7+$34),b
        move    x:(r7+$35),b0
        sub     b,a
        move    a1,x0
        move    #>839,y1
        mpy     x0,y1,b
        sub     b,a
        move    a1,x:(r3)
        move    a0,x:(r3+1)
; The selected factor is captured BEFORE either state decays, as upstream.
        move    x:(r7+$36),x0
        move    x:(r7+$0b),y1
        mpy     x0,y1,a
        move    x1,b
        asr     #8,b,b
        add     b,a
        rnd     a
        move    x:(r7+$02),n5
        move    r4,r5
        move    (r5)+n5
        move    a,y:(r5)
; read at write + age, wrapping the OFFSET, not the allocator address.
        move    x:(r7+$02),a
        move    x:(r7+$12),x0
        add     x0,a
        and     #>$1fff,a
        move    a1,n5
        bsr     ac_tap
        move    a,x:(r7+$28)
        move    n5,a
        add     #>1,a
        and     #>$1fff,a
        move    a1,n5
        bsr     ac_tap
        move    a,x:(r7+$29)
        move    n5,a
        add     #>1,a
        and     #>$1fff,a
        move    a1,n5
        bsr     ac_tap
        move    a,y1
        move    x:(r7+$28),x0
        sub     x0,a
        move    a,x0
        move    x:(r7+$11),y1
        mpy     x0,y1,a
        move    x:(r7+$28),x0
        add     x0,a
        move    x:(r7+$29),x0
        add     x0,a
        asr     #1,a,a
        move    a,x:(r7+$14)
; Correction -0.01 * (s0 - 2*s1 + s2), after the 0.5 normalization.
        bsr     ac_tap
        move    a,b
        move    x:(r7+$28),x0
        add     x0,b
        move    x:(r7+$29),a
        asl     #1,a,a
        sub     a,b
        move    b,y1
        move    #>83886,x0
        mpy     x0,y1,a
        move    a,b
        move    x:(r7+$14),a
        sub     b,a
; Blend in the full accumulator: no intermediate clipping of wet.
        move    a,x0
        move    x:(r7+$0b),y1
        mpy     x0,y1,a
        asl     #8,a,a
        move    x:(r7+$13),x0
        move    x:(r7+$0b),b
        neg     b
        add     #>$7fffff,b
        move    b,y1
        mac     x0,y1,a
; MIX 0 preserves every original input bit.
        move    x:(r7+$0b),b
        tst     b
        teq     x0,a
        rts

ac_tap:
        move    r4,r5
        move    (r5)+n5
        move    y:(r5),a
        rts
