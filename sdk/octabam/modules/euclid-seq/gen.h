#ifndef EUCLID_SEQ_GEN_H
#define EUCLID_SEQ_GEN_H

#include <stdint.h>

#define ES_MAX_STEPS 64

enum { ES_OP_OR, ES_OP_XOR, ES_OP_AND, ES_OP_SUB, ES_OP_COUNT };

/* One track's Euclidean settings, as on the Analog Rytm's page.
 * len: the track's own length, 1..64. pl1/pl2: pulses, clamped to len.
 * ro1/ro2: rotate each generator later; tro: rotate the combined result. */
typedef struct {
    uint8_t len, pl1, pl2, ro1, ro2, tro, op;
} EsParams;

/* Writes the result in the stock 8-byte trig-mask layout. Steps beyond len
 * are left clear. */
void es_mask(const EsParams *p, uint8_t mask[8]);

#endif
