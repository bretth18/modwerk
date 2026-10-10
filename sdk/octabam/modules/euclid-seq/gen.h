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

/* One step of the same result: nonzero when step i (0-based) has a pulse.
 * Constant time, for the sequencer's per-step evaluation. */
unsigned es_step(const EsParams *p, unsigned i);

/* LFO modulation. off[] holds the summed LFO offsets for PL1, PL2, RO1,
 * RO2, TRO and OP in the stock parameter scale, where ES_MOD_FULL is a full
 * swing. A full swing moves PL/RO/TRO by the track length and OP by four
 * operators; results are clamped (PL 0..len, rotations 0..len-1, OP 0..3). */
#define ES_MOD_FULL 0x4000
void es_modulate(EsParams *p, const int off[6]);

#endif
