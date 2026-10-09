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

void es_mask(const EsParams *p, uint8_t mask[8]) {
    unsigned n = p->len, i, j, t;
    for (i = 0; i < 8; i++) mask[i] = 0;
    if (n == 0) return;
    if (n > ES_MAX_STEPS) n = ES_MAX_STEPS;
    t = p->tro % n;
    for (i = 0; i < n; i++) {
        unsigned a, b, on;
        j = (i + n - t) % n;            /* TRO rotates the combined result later */
        a = es_gen(j, n, p->pl1, p->ro1);
        b = es_gen(j, n, p->pl2, p->ro2);
        switch (p->op) {
        case ES_OP_XOR: on = a ^ b; break;
        case ES_OP_AND: on = a & b; break;
        case ES_OP_SUB: on = a & !b; break;
        default:        on = a | b; break;
        }
        /* Stock layout: step s (1-based) is byte 7-(s-1)/8, bit (s-1)%8
         * (sdk/octabam/tools/hw/ot_bank.py). */
        if (on) mask[7 - i / 8] |= (uint8_t)(1u << (i % 8));
    }
}
