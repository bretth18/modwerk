#ifndef EUCLID_SEQ_PROJ_H
#define EUCLID_SEQ_PROJ_H

#include <stdint.h>

/* One settings entry, 8 bytes: flags, PL1, PL2, RO1, RO2, TRO, OP, 0. */
enum { E_FLAGS, E_PL1, E_PL2, E_RO1, E_RO2, E_TRO, E_OP, E_SIZE = 8 };
#define F_EUC 0x01u
#define F_INIT 0x80u
#define ES_ENTRIES (16u * 16u * 8u)     /* bank x pattern x audio track */
#define ES_LINE_MAX 48

/* Nonzero when every field is in range (anything else reads as never set). */
unsigned es_entry_valid(const uint8_t e[E_SIZE]);
/* Nonzero when the entry is never set, invalid, or equal to the defaults
 * (EUC off, PL1 4, everything else 0, OR): no line is written for it. */
unsigned es_entry_default(const uint8_t e[E_SIZE]);
void es_entry_defaults(uint8_t e[E_SIZE]);

/* "#EUCLID_SEQ=A01:1:E,PL1,PL2,RO1,RO2,TRO,OP\r\n" for entry `index`
 * (bank * 128 + pattern * 8 + track) into out (ES_LINE_MAX bytes, NUL
 * ended); returns its length. */
unsigned es_line_format(char *out, unsigned index, const uint8_t e[E_SIZE]);
/* 0: not our line. 1: ours but malformed (ignored). 2: ours and valid,
 * with *index and v[] set. `line` is NUL ended, without CR LF. */
unsigned es_line_parse(const char *line, unsigned *index, uint8_t v[E_SIZE]);

/* LFO destinations: one byte per bank, Part, audio track and LFO; 0 = none,
 * 1..6 = PL1, PL2, RO1, RO2, TRO, OP. Index ((bank * 4 + part) * 8 + track)
 * * 3 + lfo. */
#define ES_LFO_ENTRIES (16u * 4u * 8u * 3u)
#define ES_LFO_TARGETS 6u

/* "#EUCLID_LFO=A1:3:2:4\r\n": bank A, Part 1, track 3, LFO 2, target 4
 * (RO2). Returns the length. */
unsigned es_lfo_line_format(char *out, unsigned index, unsigned target);
/* 0: not our line. 1: ours but malformed. 2: valid, *index and *target set. */
unsigned es_lfo_line_parse(const char *line, unsigned *index, unsigned *target);

#endif
