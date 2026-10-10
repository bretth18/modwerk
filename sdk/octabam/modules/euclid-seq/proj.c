/* Euclid Seq project-file lines: pure functions, host-tested by verify.py. */
#include "proj.h"
#include "gen.h"

static const char key[] = "#EUCLID_SEQ=";
#define KEY_LEN (sizeof key - 1)

unsigned es_entry_valid(const uint8_t e[E_SIZE]) {
    return (e[E_FLAGS] & ~(F_EUC | F_INIT)) == 0 && e[E_PL1] <= ES_MAX_STEPS
        && e[E_PL2] <= ES_MAX_STEPS && e[E_RO1] < ES_MAX_STEPS && e[E_RO2] < ES_MAX_STEPS
        && e[E_TRO] < ES_MAX_STEPS && e[E_OP] < ES_OP_COUNT && !e[7];
}

void es_entry_defaults(uint8_t e[E_SIZE]) {
    e[E_FLAGS] = F_INIT; e[E_PL1] = 4; e[E_PL2] = 0;
    e[E_RO1] = e[E_RO2] = e[E_TRO] = 0; e[E_OP] = ES_OP_OR; e[7] = 0;
}

unsigned es_entry_default(const uint8_t e[E_SIZE]) {
    return !(e[E_FLAGS] & F_INIT) || !es_entry_valid(e)
        || (!(e[E_FLAGS] & F_EUC) && e[E_PL1] == 4 && !e[E_PL2] && !e[E_RO1]
            && !e[E_RO2] && !e[E_TRO] && e[E_OP] == ES_OP_OR);
}

static unsigned put_num(char *out, unsigned v) {
    if (v >= 10) { out[0] = (char)('0' + v / 10); out[1] = (char)('0' + v % 10); return 2; }
    out[0] = (char)('0' + v);
    return 1;
}

unsigned es_line_format(char *out, unsigned index, const uint8_t e[E_SIZE]) {
    unsigned n = 0, bp = index / 8, pattern = bp % 16 + 1;
    for (; n < KEY_LEN; ++n) out[n] = key[n];
    out[n++] = (char)('A' + bp / 16 % 16);
    out[n++] = (char)('0' + pattern / 10);
    out[n++] = (char)('0' + pattern % 10);
    out[n++] = ':';
    out[n++] = (char)('1' + index % 8);
    out[n++] = ':';
    out[n++] = (e[E_FLAGS] & F_EUC) ? '1' : '0';
    for (unsigned f = E_PL1; f <= E_OP; ++f) { out[n++] = ','; n += put_num(out + n, e[f] % 100); }
    out[n++] = '\r';
    out[n++] = '\n';
    out[n] = 0;
    return n;
}

static unsigned digit(char c) { return (unsigned)(unsigned char)c - '0'; }

unsigned es_line_parse(const char *line, unsigned *index, uint8_t v[E_SIZE]) {
    for (unsigned k = 0; k < KEY_LEN; ++k)
        if (line[k] != key[k]) return 0;
    const char *p = line + KEY_LEN;
    /* Each test reads a character only after the one before it matched, so
       nothing past the line's NUL is read. */
    if (p[0] < 'A' || p[0] > 'P' || digit(p[1]) > 9 || digit(p[2]) > 9 || p[3] != ':'
        || p[4] < '1' || p[4] > '8' || p[5] != ':' || (p[6] != '0' && p[6] != '1'))
        return 1;
    unsigned pattern = digit(p[1]) * 10 + digit(p[2]), track = (unsigned)(p[4] - '1');
    if (pattern < 1 || pattern > 16) return 1;
    v[E_FLAGS] = (uint8_t)(F_INIT | (p[6] == '1' ? F_EUC : 0));
    v[7] = 0;
    p += 7;
    for (unsigned f = E_PL1; f <= E_OP; ++f) {
        unsigned x = 0, n = 0;
        if (*p++ != ',') return 1;
        while (digit(*p) <= 9 && n < 3) { x = x * 10 + digit(*p); ++p; ++n; }
        if (!n || digit(*p) <= 9 || x > 255) return 1;
        v[f] = (uint8_t)x;
    }
    if (*p || !es_entry_valid(v)) return 1;
    *index = ((unsigned)(line[KEY_LEN] - 'A') * 16 + pattern - 1) * 8 + track;
    return 2;
}

static const char lkey[] = "#EUCLID_LFO=";
#define LKEY_LEN (sizeof lkey - 1)

unsigned es_lfo_line_format(char *out, unsigned index, unsigned target) {
    unsigned n = 0, lfo = index % 3, track = index / 3 % 8, part = index / 24 % 4, bank = index / 96 % 16;
    for (; n < LKEY_LEN; ++n) out[n] = lkey[n];
    out[n++] = (char)('A' + bank);
    out[n++] = (char)('1' + part);
    out[n++] = ':';
    out[n++] = (char)('1' + track);
    out[n++] = ':';
    out[n++] = (char)('1' + lfo);
    out[n++] = ':';
    out[n++] = (char)('0' + target % 10);
    out[n++] = '\r';
    out[n++] = '\n';
    out[n] = 0;
    return n;
}

unsigned es_lfo_line_parse(const char *line, unsigned *index, unsigned *target) {
    for (unsigned k = 0; k < LKEY_LEN; ++k)
        if (line[k] != lkey[k]) return 0;
    const char *p = line + LKEY_LEN;
    if (p[0] < 'A' || p[0] > 'P' || p[1] < '1' || p[1] > '4' || p[2] != ':'
        || p[3] < '1' || p[3] > '8' || p[4] != ':' || p[5] < '1' || p[5] > '3'
        || p[6] != ':' || p[7] < '1' || p[7] > '0' + (char)ES_LFO_TARGETS || p[8])
        return 1;
    *index = (((unsigned)(p[0] - 'A') * 4 + (unsigned)(p[1] - '1')) * 8 + (unsigned)(p[3] - '1')) * 3
        + (unsigned)(p[5] - '1');
    *target = (unsigned)(p[7] - '0');
    return 2;
}
