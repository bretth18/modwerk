/* Euclid Seq native adapter for locally verified Octatrack OS 1.40C.
 * Writes Euclidean trigs into the current pattern's real trig masks, so the
 * stock sequencer plays them with its own tempo, speed, swing and locks.
 * Pattern-write, window and layer idioms follow VECTOR and Analog BD
 * (Sam Banks' MIT octabam editor tooling). Addresses: see README.md. */
#include "gen.h"
#include "proj.h"

#define U8(a) (*(volatile uint8_t *)(uintptr_t)(a))
#define U32(a) (*(volatile uint32_t *)(uintptr_t)(a))

#define BANK_PTR 0x46c82456u      /* edited bank's RAM image */
#define BANK0 0x400e21e0u         /* bank A; 16 banks follow */
#define BANK_STRIDE 0x9b340u
#define TRACK_IDX 0x100b14ccu     /* selected audio track */
#define PATTERN_IDX 0x100b14d0u   /* edited pattern */
#define PATTERN_STRIDE 0x8ed8u
#define TRACK_STRIDE 0x91au
#define SRAM_PATTERNS 0x1001614eu /* battery mirror of the edited bank */
#define MIDI_MODE 0x80000012u     /* nonzero while MIDI tracks are shown */
#define GRID_REC 0x460d1736u
#define TTE_WINDOW 0x460e73ccu    /* TRACK TRIG EDIT window handle */
#define TTE_ROW 0x460e73e4u       /* its selected row; 0 = TRIGS */
#define SCREEN_DIRTY 0x46c7c72cu


/* Settings per bank, pattern and audio track, kept in battery RAM so they
 * survive a power cycle (which reads no project file), and in the project
 * file's "#EUCLID_SEQ=" lines (es_project_*). Stock references nothing in
 * battery RAM 0x100f859c..0x100fff00 (Play Modes INVESTIGATION.md); Play
 * Modes owns 0x100f8600..0x100f8f06. This table: 'E' 'S' 'N' '1', 12 bytes
 * reserved, then 2,048 entries of 8 bytes, 0x100f9000..0x100fd010. */
#define NV_BASE 0x100f9000u
#define NV_TABLE (NV_BASE + 16u)
#define NV_ENTRIES ES_ENTRIES
static const char nv_magic[4] = { 'E', 'S', 'N', '1' };

static uint8_t *slot(unsigned index) {
    return (uint8_t *)(uintptr_t)(NV_TABLE + index * E_SIZE);
}

/* Every entry back to "never set" (the defaults). */
static void nv_clear(void) {
    volatile uint8_t *p = (volatile uint8_t *)(uintptr_t)NV_TABLE;
    for (unsigned k = 0; k < NV_ENTRIES * E_SIZE; ++k) p[k] = 0;
    for (unsigned k = 0; k < 4; ++k) U8(NV_BASE + k) = (uint8_t)nv_magic[k];
}

/* A missing copy (first boot, cleared battery RAM, another firmware's data
 * there) starts empty. */
static void nv_ensure(void) {
    for (unsigned k = 0; k < 4; ++k)
        if (U8(NV_BASE + k) != (uint8_t)nv_magic[k]) { nv_clear(); return; }
}

static uint32_t es_window = 0;
extern uint32_t es_page_layer[];
static int bank_index(void) {
    uint32_t b = U32(BANK_PTR);
    if (b < BANK0 || (b - BANK0) % BANK_STRIDE) return -1;
    b = (b - BANK0) / BANK_STRIDE;
    return b < 16 ? (int)b : -1;
}

static uint8_t *entry(unsigned t) {
    int b = bank_index();
    unsigned p = U8(PATTERN_IDX);
    if (b < 0 || p >= 16 || t >= 8 || U32(MIDI_MODE)) return 0;
    nv_ensure();
    uint8_t *e = slot(((unsigned)b * 16 + p) * 8 + t);
    if (!(e[E_FLAGS] & F_INIT) || !es_entry_valid(e)) es_entry_defaults(e);
    return e;
}

static volatile uint8_t *pattern(void) {
    return (volatile uint8_t *)(uintptr_t)(U32(BANK_PTR) + U8(PATTERN_IDX) * PATTERN_STRIDE);
}

/* The track's own length: per-track in PER TRACK scale mode, else the
 * pattern's (the same choice the stock grid handler makes). */
static unsigned track_length(unsigned t) {
    volatile uint8_t *pat = pattern();
    unsigned len = pat[0x8e55] ? pat[t * TRACK_STRIDE + 0x50] : pat[0x8e53];
    return len > ES_MAX_STEPS ? ES_MAX_STEPS : len;
}

static void put(volatile uint8_t *rec, uint32_t mirror, unsigned off, uint8_t value) {
    if (rec[off] != value) { rec[off] = value; U8(mirror + off) = value; }
}

/* Make mask 0 match the generator (no trigs past the length), editing each
 * step exactly as the stock grid editor does: a placed trig clears the
 * step's other trig types and condition word; a removed trig also clears
 * its 32 lock bytes. Runs on the UI task (key/encoder handlers) only. */
static int apply(unsigned t) {
    uint8_t *e = entry(t);
    if (!e || !(e[E_FLAGS] & F_EUC)) return 0;
    uint32_t bank = U32(BANK_PTR);
    uint32_t off = U8(PATTERN_IDX) * PATTERN_STRIDE + t * TRACK_STRIDE;
    volatile uint8_t *rec = (volatile uint8_t *)(uintptr_t)(bank + off);
    uint32_t mirror = SRAM_PATTERNS + off;
    unsigned len = track_length(t), s, k;
    if (!len) return 0;
    EsParams p = { (uint8_t)len, e[E_PL1], e[E_PL2], e[E_RO1], e[E_RO2], e[E_TRO], e[E_OP] };
    uint8_t mask[8];
    es_mask(&p, mask);
    int changed = 0;
    for (s = 0; s < ES_MAX_STEPS; s++) {
        unsigned byte = 7 - s / 8;
        uint8_t bit = (uint8_t)(1u << (s % 8));
        unsigned want = mask[byte] & bit, have = rec[byte] & bit;
        if (want && !have) {
            put(rec, mirror, byte, rec[byte] | bit);
            for (k = 1; k < 4; k++) put(rec, mirror, 8 * k + byte, rec[8 * k + byte] & (uint8_t)~bit);
            put(rec, mirror, 0x89a + 2 * s, 0);
            put(rec, mirror, 0x89b + 2 * s, 0);
            changed = 1;
        } else if (!want && have) {
            for (k = 0; k < 4; k++) put(rec, mirror, 8 * k + byte, rec[8 * k + byte] & (uint8_t)~bit);
            for (k = 0; k < 32; k++) put(rec, mirror, 0x59 + 32 * s + k, 0xff);
            put(rec, mirror, 0x89b + 2 * s, 0);
            changed = 1;
        }
    }
    if (changed) {
        /* Same dirty flags and track publication as the stock editor. */
        U32(bank + 0x9b332u) = 1; U32(0x100f8598u) = 1;
        ((void (*)(void))0x40027e00u)();
        ((void (*)(void))0x400339d8u)();
        ((void (*)(unsigned))0x4009da20u)(t);
        U32(SCREEN_DIRTY) = 1;
        /* The grid LED painter runs only while no window owns the panel;
           repaint the trig keys now, as the stock painter 0x40043fdc does
           in grid recording. */
        if (U32(GRID_REC) && t == U8(TRACK_IDX))
            ((void (*)(unsigned))0x40034bd4u)(0);
    }
    return changed;
}

/* PATTERN SCALE changed a length (pattern or track): follow it on every EUC
 * track of the pattern. Called from the length setter's stub, UI task. */
void es_length_changed(void) {
    for (unsigned t = 0; t < 8; t++) apply(t);
}

/* ---- LFO destinations ---------------------------------------------------
 * LFO SETUP's PMTR knob continues past FX2 into six EUCLID destinations:
 * PL1, PL2, RO1, RO2, TRO and OP. Stock-safety: the Part never stores a
 * code the stock engine does not know. A EUCLID destination is kept in the
 * module's own battery table (and project lines); the Part byte holds the
 * LFO's own speed (code 6 + lfo), so stock firmware, or a build without
 * this module, lets that LFO modulate only its own speed, which reaches no
 * sound because the LFO has no other destination. The module routes such
 * an LFO's output to es_lfo_buf instead (the engine stubs in hooks.s).
 * Table: 'E' 'S' 'L' '1', 12 bytes reserved, then 1,536 bytes
 * (bank x Part x track x LFO), 0x100fd100..0x100fd710. */
#define PART_IDX 0x100b14cfu      /* the active Part */
#define LFO_SELECTED 0x460d1a32u  /* LFO SETUP's selected LFO (3 = DESIGN) */
#define TRANSPORT 0x800065b8u     /* 0 stopped, 1 playing (Play Modes) */
#define NL_BASE 0x100fd100u
#define NL_TABLE (NL_BASE + 16u)
static const char nl_magic[4] = { 'E', 'S', 'L', '1' };

static void nl_clear(void) {
    volatile uint8_t *p = (volatile uint8_t *)(uintptr_t)NL_TABLE;
    for (unsigned k = 0; k < ES_LFO_ENTRIES; ++k) p[k] = 0;
    for (unsigned k = 0; k < 4; ++k) U8(NL_BASE + k) = (uint8_t)nl_magic[k];
}

static unsigned nl_ok(void) {
    for (unsigned k = 0; k < 4; ++k)
        if (U8(NL_BASE + k) != (uint8_t)nl_magic[k]) return 0;
    return 1;
}

/* The current bank and Part's entry for (track, LFO), or 0. */
static volatile uint8_t *nl_entry(unsigned t, unsigned l) {
    int b = bank_index();
    unsigned part = U8(PART_IDX);
    if (b < 0 || part >= 4 || t >= 8 || l >= 3) return 0;
    return (volatile uint8_t *)(uintptr_t)(NL_TABLE + (((unsigned)b * 4 + part) * 8 + t) * 3 + l);
}

/* 0 none, 1..6 a EUCLID destination; read-only (no table repair here, it
 * runs on the frame path). */
static unsigned lfo_target(unsigned t, unsigned l) {
    volatile uint8_t *e;
    if (!nl_ok() || !(e = nl_entry(t, l))) return 0;
    return *e <= ES_LFO_TARGETS ? *e : 0;
}

/* Per track and LFO: the routed output (stock parameter scale, centre
 * ES_MOD_FULL) and its destination (0 none). Written by the engine stubs
 * each frame, read by the step evaluation. */
int16_t es_lfo_buf[24];
uint8_t es_lfo_tgt[24];

/* Engine stubs (0x40003c98, 0x4000d032): LFO l of track t has its own speed
 * as destination. If the module's table names a EUCLID destination, return
 * the halfword the stock engine should modulate instead, preset to the
 * centre so it ends up holding centre + depth x output. */
int16_t *es_lfo_route(unsigned t, unsigned l) {
    unsigned i = t * 3 + l, k = lfo_target(t, l);
    if (i >= 24) return 0;
    es_lfo_tgt[i] = (uint8_t)k;
    if (!k) return 0;
    es_lfo_buf[i] = ES_MOD_FULL;
    return &es_lfo_buf[i];
}

static unsigned length_at(volatile uint8_t *pat, unsigned t) {
    unsigned len = pat[0x8e55] ? pat[t * TRACK_STRIDE + 0x50] : pat[0x8e53];
    return len > ES_MAX_STEPS ? ES_MAX_STEPS : len;
}

/* The modulated settings of an EUC track; 0 when nothing modulates it (the
 * stored pattern is then exactly the generator's). */
static unsigned live_params(unsigned t, unsigned bank, unsigned pattern, EsParams *p) {
    int off[6] = { 0, 0, 0, 0, 0, 0 };
    unsigned any = 0, l;
    if (t >= 8 || bank >= 16 || pattern >= 16) return 0;
    for (l = 0; l < 3; l++) {
        unsigned k = es_lfo_tgt[t * 3 + l];
        if (k && k <= ES_LFO_TARGETS) { off[k - 1] += es_lfo_buf[t * 3 + l] - ES_MOD_FULL; any = 1; }
    }
    if (!any) return 0;
    const uint8_t *e = slot((bank * 16 + pattern) * 8 + t);
    if (!es_entry_valid(e) || !(e[E_FLAGS] & F_INIT) || !(e[E_FLAGS] & F_EUC)) return 0;
    volatile uint8_t *pat = (volatile uint8_t *)(uintptr_t)(BANK0 + bank * BANK_STRIDE + pattern * PATTERN_STRIDE);
    unsigned len = length_at(pat, t);
    if (!len) return 0;
    p->len = (uint8_t)len; p->pl1 = e[E_PL1]; p->pl2 = e[E_PL2];
    p->ro1 = e[E_RO1]; p->ro2 = e[E_RO2]; p->tro = e[E_TRO]; p->op = e[E_OP];
    es_modulate(p, off);
    return 1;
}

/* The sequencer's step evaluation 0x4009d1e8(track, bank, pattern, step,
 * ...) reads mask 0 twice (hooks.s es_eva_stub, es_evb_stub): -1 keeps the
 * stored bit, else the modulated pulse (0/1). Runs on the sequencer task and,
 * for the first step on PLAY, on the UI task: no shared scratch state. */
int es_live_bit(unsigned t, unsigned bank, unsigned pattern, unsigned step) {
    EsParams p;
    if (!live_params(t, bank, pattern, &p)) return -1;
    return (int)es_step(&p, step);
}

/* The grid LED painter's mask-0 word for trig page 3 - widx (0x40034df4):
 * while playing, an EUC track shows its live pulses. */
unsigned es_led_word(unsigned word, unsigned widx, unsigned key) {
    int b;
    if (!U32(TRANSPORT) || widx > 3 || key > 15 || (b = bank_index()) < 0) return word;
    int bit = es_live_bit(U8(TRACK_IDX), (unsigned)b, U8(PATTERN_IDX), 16 * (3 - widx) + key);
    if (bit < 0) return word;
    return bit ? word | (1u << key) : word & ~(1u << key);
}

/* LFO SETUP's PMTR knob on an audio track (0x400392cc): the stock list order
 * (machine, LFO, AMP, FX1, FX2 pages) with six EUCLID positions after FX2.
 * Returns the byte to store. */
static const uint8_t page_order[5] = { 0, 2, 1, 3, 4 };

unsigned es_pmtr_knob(unsigned l, int current, unsigned arg) {
    unsigned t = U8(TRACK_IDX), own = 6 + l, k = 0;
    volatile uint8_t *e = nl_entry(t, l);
    if (e && !nl_ok()) nl_clear();
    if (e && *e <= ES_LFO_TARGETS) k = *e;
    int v = current == (int)own && k ? 29 + (int)k : current;
    if (v < 0) v = 0;
    int pos = v < 30 ? page_order[v / 6] * 6 + v % 6 : v;
    pos += ((int (*)(int, unsigned))0x4003249cu)(0, arg);
    if (pos < 0) pos = 0;
    if (pos > 29 + (int)ES_LFO_TARGETS) pos = 29 + (int)ES_LFO_TARGETS;
    int nv = pos < 30 ? page_order[pos / 6] * 6 + pos % 6 : pos;
    if (!e || l > 2) return nv > 29 ? 29u : (unsigned)nv;
    if (nv >= 30) { *e = (uint8_t)(nv - 29); return own; }
    if (nv == (int)own) *e = 0;
    return (unsigned)nv;
}

/* The PMTR formatter (0x4003bf64, LFO SETUP): the selected LFO's EUCLID
 * destination as "EUC" over its name. Nonzero = printed. */
static const char *const lfo_names[ES_LFO_TARGETS] = { "PL1", "PL2", "RO1", "RO2", "TRO", "OP" };

unsigned es_pmtr_fmt(char *buf, int value) {
    unsigned l = U32(LFO_SELECTED), k, i;
    if (U32(MIDI_MODE) || l > 2 || value != (int)(6 + l)) return 0;
    if (!(k = lfo_target(U8(TRACK_IDX), l))) return 0;
    const char *n = lfo_names[k - 1];
    for (i = 0; n[i]; i++) buf[i] = n[i];
    buf[i] = 0;
    buf[5] = 'E'; buf[6] = 'U'; buf[7] = 'C'; buf[8] = 0;
    return 1;
}

/* ---- purple trigs (MKII) ----------------------------------------------- */

#define PANEL_MKII 0x46c8d18cu    /* nonzero with the MKII panel's RGB LEDs */
#define LED_BRIGHTNESS 0x800000d0u
#define PANEL_TX_USED 0x400b96ccu /* bytes queued in the 2,048-byte panel ring */

static uint32_t led_shown = 0, led_level = 0;

/* Lookup without creating a settings entry. */
static unsigned euc_on(unsigned t) {
    int b = bank_index();
    unsigned p = U8(PATTERN_IDX);
    if (b < 0 || p >= 16 || t >= 8 || U32(MIDI_MODE)) return 0;
    nv_ensure();
    const uint8_t *e = slot(((unsigned)b * 16 + p) * 8 + t);
    return es_entry_valid(e) && (e[E_FLAGS] & F_INIT) && (e[E_FLAGS] & F_EUC);
}

/* Runs before each stock LED-row update. The MKII palette holds one colour
 * per key and state; state 1 is a trig. In grid recording on an EUC track
 * the 16 trig keys show it purple, elsewhere stock red at the same stock
 * brightness level. Messages go out only on a change, and only when the
 * panel ring has room, so this never waits on the UART. */
void es_led_sync(void) {
    if (!U32(PANEL_MKII)) return;
    static const uint8_t levels[3] = { 0x0c, 0x30, 0x44 };
    uint32_t b = U32(LED_BRIGHTNESS);
    uint32_t level = levels[b > 2 ? 2 : b];
    uint32_t want = U32(GRID_REC) && euc_on(U8(TRACK_IDX));
    if (want == led_shown && level == led_level) return;
    if (U32(PANEL_TX_USED) > 2048 - 16 * 6 - 64) return;
    for (unsigned k = 0; k < 16; k++)
        ((void (*)(unsigned, unsigned, unsigned, unsigned, unsigned))0x40013368u)
            (2 * k, 1, level, 0, want ? level : 0);
    led_shown = want; led_level = level;
}

/* The live recorder's stub: nonzero means it records nothing on track t. */
unsigned es_rec_blocked(unsigned t) {
    return euc_on(t);
}

/* Called from the two grid-editor stubs: nonzero leaves the step alone. */
unsigned es_blocked(void) {
    if (!U32(GRID_REC)) return 0;
    if (U32(TTE_WINDOW) && U32(TTE_ROW) != 0) return 0;
    uint8_t *e = entry(U8(TRACK_IDX));
    return e && (e[E_FLAGS] & F_EUC);
}

/* The grid recording trig shift (FUNC+LEFT/RIGHT, 0x400502f8): nonzero
   leaves an EUC track's trigs where the generator put them. Shifting the
   SLIDE, SWING or REC.TRG rows from TRACK TRIG EDIT is unchanged. */
unsigned es_shift_blocked(void) {
    if (U32(MIDI_MODE)) return 0;
    if (U32(TTE_WINDOW) && U32(TTE_ROW) != 0) return 0;
    return euc_on(U8(TRACK_IDX));
}

/* ---- drawing helpers (stock routines) ----------------------------------- */

#define FONT 0x400ba876u
#define MAIN_SURFACE 0x400bf10au  /* the main screen; y grows upward */

static void text(void *surface, int x, int y, int align, int invert, const char *s) {
    /* 0x40013904(font, surface, x, y, align 0/1/2 = left/centre/right,
       invert, width template, format, ...) */
    ((void (*)(uint32_t, void *, int, int, int, int, const char *, const char *, ...))0x40013904u)
        (FONT, surface, x, y, align, invert, s, "%s", s);
}

static void fill(void *surface, int x0, int y0, int x1, int y1, int colour) {
    ((void (*)(void *, int, int, int, int, int))0x40012254u)(surface, x0, y0, x1, y1, colour);
}

static void number(char *out, unsigned v) {
    unsigned i = 0;
    if (v >= 10) out[i++] = (char)('0' + v / 10 % 10);
    out[i++] = (char)('0' + v % 10);
    out[i] = 0;
}

static const char *const ops[ES_OP_COUNT] = { "OR", "XOR", "AND", "SUB" };

/* Mask 0 of track t for the trig page on screen, one bit per step. */
static unsigned page_trigs(unsigned t, unsigned *first, unsigned *count) {
    unsigned len = track_length(t), start = U32(0x460d174cu), s, bits = 0;
    if (start >= ES_MAX_STEPS) start = 0;
    volatile uint8_t *rec = pattern() + t * TRACK_STRIDE;
    EsParams p;
    int b = bank_index();
    unsigned live = U32(TRANSPORT) && b >= 0 && live_params(t, (unsigned)b, U8(PATTERN_IDX), &p);
    for (s = 0; s < 16 && start + s < len; s++)
        if (live ? es_step(&p, start + s)
                 : rec[7 - (start + s) / 8] & (1u << ((start + s) % 8))) bits |= 1u << s;
    *first = start; *count = s;
    return bits;
}

/* Sixteen cells, a solid block per trig and a floor pixel per empty step,
   with a wider gap between groups of four. */
static void step_bar(void *surface, int x, int y, unsigned t) {
    unsigned first, count, bits = page_trigs(t, &first, &count);
    for (unsigned s = 0; s < 16; s++) {
        int cx = x + 3 * (int)s + (int)(s / 4);
        if (s >= count) continue;
        if (bits & (1u << s)) fill(surface, cx, y + 3, cx + 1, y, 1);
        else fill(surface, cx, y, cx + 1, y, 1);
    }
}

/* ---- the EUCLID trig mode ------------------------------------------------ */

/* The TRIG MODE list (FUNC+UP/DOWN) gets a seventh row, EUCLID, on audio
 * tracks. The stock mode word 0x460d16f0 keeps TRACKS (0) while it is
 * selected, so every stock reader behaves as in TRACKS; only the mode panel,
 * its compact parameter page, the status icon and FUNC+RIGHT look at es_mode.
 * Runtime state, like the stock mode word. */
#define TRIG_MODE 0x460d16f0u
#define SELECTOR_ROW 0x46c7d338u
uint8_t es_mode = 0;

static unsigned active(void) { return es_mode && !U32(MIDI_MODE); }

unsigned es_sel_count(void) { return U32(MIDI_MODE) ? 3 : 7; }

unsigned es_sel_row(void) { return active() ? 6 : U32(TRIG_MODE); }

/* The selector stores the chosen row's mode; v is the stock table's value. */
unsigned es_sel_pick(unsigned v) {
    if (U32(MIDI_MODE)) return v;
    es_mode = U32(SELECTOR_ROW) == 6;
    return es_mode ? 0 : v;
}

static void settings_text(char *out, const uint8_t *e) {
    char n[4];
    unsigned i = 0, k;
    number(n, e[E_PL1]); for (k = 0; n[k]; k++) out[i++] = n[k];
    out[i++] = ':';
    number(n, e[E_PL2]); for (k = 0; n[k]; k++) out[i++] = n[k];
    out[i] = 0;
}

/* The mode panel's title bar, as the stock title painter draws SLICES. */
void es_title(void) {
    void *surface = (void *)(uintptr_t)MAIN_SURFACE;
    uint8_t *e = entry(U8(TRACK_IDX));
    char buf[8];
    fill(surface, 0x3d, 0x1f, 0x75, 0x19, 1);
    text(surface, 0x3e, 0x1a, 0, 1, "EUCLID");
    if (e && (e[E_FLAGS] & F_EUC)) {
        settings_text(buf, e);
        text(surface, 0x75, 0x1a, 2, 1, buf);
    }
    U32(SCREEN_DIRTY) = 1;
}

/* The panel body: operator and EUC state, then the trig page as a bar. */
void es_body(void) {
    void *surface = (void *)(uintptr_t)MAIN_SURFACE;
    unsigned t = U8(TRACK_IDX);
    uint8_t *e = entry(t);
    fill(surface, 0x3c, 0x18, 0x76, 8, 0);
    if (!e) return;
    if (e[E_FLAGS] & F_EUC) {
        text(surface, 0x3e, 0x11, 0, 0, ops[e[E_OP] % ES_OP_COUNT]);
        text(surface, 0x75, 0x11, 2, 0, "EUC ON");
    } else {
        text(surface, 0x75, 0x11, 2, 0, "EUC OFF");
    }
    step_bar(surface, 0x3f, 0x0a, t);
    U32(SCREEN_DIRTY) = 1;
}

/* ---- the EUCLID page --------------------------------------------------- */

/* Six boxes in the stock setup-page layout (AMP SETUP, 0x40036794): x = 53,
 * 73, 93; y = 29 top row, 2 bottom row; names centred at x+9, y+19; the
 * stock dial widget 0x400479b4(x, y, slot, value 0..127, flags, formatter,
 * surface) draws the box, the dial and the value (flags 8 = value shown). */
static const char *const names[6] = { "PL1", "PL2", "LEN", "RO1", "RO2", "TRO" };
static unsigned shown[6];
static uint8_t es_from_tte = 0;

static void fmt_value(char *buf, unsigned i) { number(buf, shown[i] > 99 ? 99 : shown[i]); }
static void fmt0(char *b, int v) { (void)v; fmt_value(b, 0); }
static void fmt1(char *b, int v) { (void)v; fmt_value(b, 1); }
static void fmt2(char *b, int v) { (void)v; fmt_value(b, 2); }
static void fmt3(char *b, int v) { (void)v; fmt_value(b, 3); }
static void fmt4(char *b, int v) { (void)v; fmt_value(b, 4); }
static void fmt5(char *b, int v) { (void)v; fmt_value(b, 5); }
static void (*const fmts[6])(char *, int) = { fmt0, fmt1, fmt2, fmt3, fmt4, fmt5 };

static void draw(void) {
    if (!es_window) return;
    unsigned t = U8(TRACK_IDX);
    uint8_t *e = entry(t);
    void *surface = (void *)(uintptr_t)(es_window + 0x24);
    ((void (*)(void *))0x4003567cu)(surface);
    if (!e) return;
    unsigned len = track_length(t);
    unsigned maxes[6] = { len, len, ES_MAX_STEPS, len ? len - 1 : 0, len ? len - 1 : 0, len ? len - 1 : 0 };
    shown[0] = e[E_PL1]; shown[1] = e[E_PL2]; shown[2] = len;
    shown[3] = e[E_RO1]; shown[4] = e[E_RO2]; shown[5] = e[E_TRO];
    /* frame: the divider between the left panel and the boxes, the row
       rule and the dotted column dividers, as AMP SETUP draws them */
    ((void (*)(void *, int, int, int, int))0x40011b94u)(surface, 0x34, 2, 0x36, 1);
    ((void (*)(void *, int, int, int))0x40011a58u)(surface, 0x34, 0x1c, 0x6f);
    ((void (*)(void *, int, int, int, int, int))0x40012004u)(surface, 0x48, 2, 0x48, 0x36, 1);
    ((void (*)(void *, int, int, int, int, int))0x40012004u)(surface, 0x5c, 2, 0x5c, 0x36, 1);
    for (unsigned i = 0; i < 6; i++) {
        int x = 53 + 20 * (int)(i % 3), y = 29 - 27 * (int)(i / 3);
        unsigned v = maxes[i] ? shown[i] * 127u / maxes[i] : 0;
        ((void (*)(int, int, int, int, int, void (*)(char *, int), void *))0x400479b4u)
            (x, y, (int)i, (int)(v > 127 ? 127 : v), 8, fmts[i], surface);
        text(surface, x + 9, y + 19, 1, 0, names[i]);
    }
    /* left panel: EUC state, the operator and the trig page */
    text(surface, 26, 46, 1, 0, "EUC");
    if (e[E_FLAGS] & F_EUC) {
        fill(surface, 13, 43, 39, 36, 1);
        text(surface, 26, 37, 1, 1, "ON");
    } else {
        text(surface, 26, 37, 1, 0, "OFF");
    }
    text(surface, 26, 24, 1, 0, "OP");
    text(surface, 26, 15, 1, 0, ops[e[E_OP] % ES_OP_COUNT]);
    step_bar(surface, 2, 4, t);
    U32(SCREEN_DIRTY) = 1;
}

static void close_page(void) {
    if (!es_window) return;
    ((void (*)(uint32_t *))0x40055db4u)(&es_window);
    ((void (*)(uint32_t *))0x4003146cu)(es_page_layer);
    es_window = 0;
    U32(SCREEN_DIRTY) = 1;
    ((void (*)(int))0x4004d948u)(-1);
}

/* The window system calls this when another window replaces the page. */
void es_close_cb(void) { close_page(); }

static void open_page(unsigned from_tte) {
    if (es_window || !entry(U8(TRACK_IDX))) return;
    uint32_t w = ((uint32_t (*)(int, int, int, int, int, void (*)(void)))0x4005829cu)
        (115, 64, 0, 0, 1, es_close_cb);
    if (!w) return;
    es_window = w;
    es_from_tte = (uint8_t)from_tte;
    ((void (*)(uint32_t, const char *, unsigned))0x400570b8u)(w, "EUCLID", 0);
    es_page_layer[0] = 0;
    ((void (*)(uint32_t *))0x40031494u)(es_page_layer);
    draw();
}

/* RIGHT on TRACK TRIG EDIT's TRIGS row opens the page. RIGHT has no stock
 * binding in that window. The firmware keeps one modal window, so creating
 * the page closes TRACK TRIG EDIT through its own close routine; NO on the
 * page reopens it through its own open routine. */
void es_tte_right(unsigned code, unsigned edge) {
    (void)code;
    if (edge == 1 && U32(TTE_WINDOW) && U32(TTE_ROW) == 0) open_page(1);
}

/* FUNC+RIGHT (the FUNC layer's 0x400503c4): in the EUCLID trig mode it
 * opens the page; nonzero = handled. Other modes run the stock handler
 * (in grid recording it shifts the track's trigs one step later). */
unsigned es_func_right(unsigned edge) {
    if (!active()) return 0;
    if (edge == 1) open_page(0);
    return 1;
}

/* NO acts on release, so its press never reaches the layer underneath once
 * this one is popped. */
void es_key(unsigned code, unsigned edge) {
    if (!es_window) return;
    if (code == 0x32) {
        if (edge == 0) {
            unsigned tte = es_from_tte;
            close_page();
            if (tte) ((void (*)(void))0x4007c050u)();
            else if (active()) ((void (*)(void))0x4004581cu)();
        }
        return;
    }
    if (edge != 1) return;
    if (code == 0x31) {
        uint8_t *e = entry(U8(TRACK_IDX));
        if (!e) return;
        e[E_FLAGS] ^= F_EUC;
        apply(U8(TRACK_IDX));
        draw();
    }
    /* UP and DOWN are held here so they do not reach the grid underneath. */
}

void es_knob(unsigned index, int delta) {
    if (!es_window || index > 6 || index == 2) return;
    unsigned t = U8(TRACK_IDX);
    uint8_t *e = entry(t);
    if (!e) return;
    static const uint8_t field[7] = { E_PL1, E_PL2, 0, E_RO1, E_RO2, E_TRO, E_OP };
    unsigned len = track_length(t);
    int max = index == 6 ? ES_OP_COUNT - 1 : index < 2 ? (int)len : (int)len - 1;
    int v = (int)e[field[index]] + delta;
    if (max < 0) max = 0;
    if (v < 0) v = 0;
    if (v > max) v = max;
    if ((uint8_t)v == e[field[index]]) return;
    e[field[index]] = (uint8_t)v;
    apply(t);
    draw();
}

/* ---- the project file ----------------------------------------------------
 * One "#EUCLID_SEQ=" line per bank, pattern and track whose settings differ
 * from the defaults (proj.c). The stock loader skips every line starting
 * with '#' (0x400867aa), so the file still loads on stock firmware. */
#define WRITE 0x400166b8u               /* write(file, buffer, length), the writer's a2 */

/* The writer's stub (0x400888d2): every non-default entry to `file`. A
 * failed write is not checked here; the stock line that follows checks its
 * own. */
void es_project_write(unsigned file) {
    static char line[ES_LINE_MAX];
    nv_ensure();
    for (unsigned i = 0; i < NV_ENTRIES; ++i) {
        const uint8_t *e = slot(i);
        if (es_entry_default(e)) continue;
        unsigned n = es_line_format(line, i, e);
        ((int (*)(unsigned, const char *, unsigned))WRITE)(file, line, n);
    }
    if (!nl_ok()) return;
    for (unsigned i = 0; i < ES_LFO_ENTRIES; ++i) {
        unsigned k = U8(NL_TABLE + i);
        if (!k || k > ES_LFO_TARGETS) continue;
        unsigned n = es_lfo_line_format(line, i, k);
        ((int (*)(unsigned, const char *, unsigned))WRITE)(file, line, n);
    }
}

/* The loader's head (0x400866e2): a storing pass (parse_only 0) starts from
 * the defaults, so a project saved without the lines, or on stock
 * firmware, loads with EUC off everywhere. */
void es_project_begin(unsigned parse_only) {
    if (!parse_only) { nv_clear(); nl_clear(); }
}

/* Every line the loader finishes (0x40088224, the loop's next-line point,
 * reached by stock lines and by '#' lines alike). Ours set one entry on a
 * storing pass; a malformed line is ignored. */
void es_project_line(const char *line, unsigned parse_only) {
    unsigned index, target;
    uint8_t v[E_SIZE];
    if (parse_only) return;
    if (es_lfo_line_parse(line, &index, &target) == 2) {
        if (!nl_ok()) nl_clear();
        U8(NL_TABLE + index) = (uint8_t)target;
        return;
    }
    if (es_line_parse(line, &index, v) != 2) return;
    nv_ensure();
    /* Field by field: m68k-elf-gcc compiled a copy loop here to
       move.b (%a0)+,(%a0,%d0.l), whose destination the emulator computes
       with the incremented a0, one byte off. */
    uint8_t *e = slot(index);
    e[0] = v[0]; e[1] = v[1]; e[2] = v[2]; e[3] = v[3];
    e[4] = v[4]; e[5] = v[5]; e[6] = v[6]; e[7] = v[7];
}
