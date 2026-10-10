/* Euclidean trig generator. Pure integer code: no allocation, no floating
 * point, no 64-bit arithmetic (the freestanding ColdFire compiler has no
 * libgcc) and no firmware access. Compiled for ColdFire into the module and
 * for the host by verify.py. */
#include "gen.h"

/* Same distribution as the Euclid effect (modules/euclid/control.c):
 * E(3,8) = x..x..x., first pulse on step 1. */
static unsigned es_pulse(unsigned i, unsigned n, unsigned k) {
    return k && (i * k) % n < k;
}

/* Generator g at step i, rotated r steps later. */
static unsigned es_gen(unsigned i, unsigned n, unsigned k, unsigned r) {
    if (k > n) k = n;
    return es_pulse((i + n - r % n) % n, n, k);
}

unsigned es_step(const EsParams *p, unsigned i) {
    unsigned n = p->len, j, a, b;
    if (n > ES_MAX_STEPS) n = ES_MAX_STEPS;
    if (n == 0 || i >= n) return 0;
    j = (i + n - p->tro % n) % n;       /* TRO rotates the combined result later */
    a = es_gen(j, n, p->pl1, p->ro1);
    b = es_gen(j, n, p->pl2, p->ro2);
    switch (p->op) {
    case ES_OP_XOR: return a ^ b;
    case ES_OP_AND: return a & b;
    case ES_OP_SUB: return a & !b;
    default:        return a | b;
    }
}

void es_mask(const EsParams *p, uint8_t mask[8]) {
    unsigned i;
    for (i = 0; i < 8; i++) mask[i] = 0;
    /* Stock layout: step s (1-based) is byte 7-(s-1)/8, bit (s-1)%8
     * (sdk/octabam/tools/hw/ot_bank.py). */
    for (i = 0; i < ES_MAX_STEPS; i++)
        if (es_step(p, i)) mask[7 - i / 8] |= (uint8_t)(1u << (i % 8));
}

/* off * range / ES_MOD_FULL, rounded to the nearest step. |off| stays well
 * under 2^24 (three LFOs of 15 bits), so 32-bit arithmetic suffices. */
static int scale(int off, int range) {
    int v = off * range;
    return v >= 0 ? (v + ES_MOD_FULL / 2) / ES_MOD_FULL : -((-v + ES_MOD_FULL / 2) / ES_MOD_FULL);
}

static uint8_t clamp(int v, int max) {
    if (max < 0) max = 0;
    return (uint8_t)(v < 0 ? 0 : v > max ? max : v);
}

void es_modulate(EsParams *p, const int off[6]) {
    int n = p->len;
    p->pl1 = clamp(p->pl1 + scale(off[0], n), n);
    p->pl2 = clamp(p->pl2 + scale(off[1], n), n);
    p->ro1 = clamp(p->ro1 + scale(off[2], n), n - 1);
    p->ro2 = clamp(p->ro2 + scale(off[3], n), n - 1);
    p->tro = clamp(p->tro + scale(off[4], n), n - 1);
    p->op = clamp(p->op + scale(off[5], ES_OP_COUNT), ES_OP_COUNT - 1);
}
