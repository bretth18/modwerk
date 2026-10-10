/* Euclid Seq native adapter for locally verified Octatrack OS 1.40C.
 * Writes Euclidean trigs into the current pattern's real trig masks, so the
 * stock sequencer plays them with its own tempo, speed, swing and locks.
 * Pattern-write, window and layer idioms follow VECTOR and Analog BD
 * (Sam Banks' MIT octabam editor tooling). Addresses: see README.md. */
#include "gen.h"

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

#define F_EUC 0x01u
#define F_INIT 0x80u
enum { E_FLAGS, E_PL1, E_PL2, E_RO1, E_RO2, E_TRO, E_OP, E_SIZE = 8 };

/* Runtime settings per bank, pattern and audio track. Not project data. */
static uint8_t settings[16 * 16 * 8][E_SIZE] = {{0}};
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
    uint8_t *e = settings[((unsigned)b * 16 + p) * 8 + t];
    if (!(e[E_FLAGS] & F_INIT)) {
        e[E_FLAGS] = F_INIT; e[E_PL1] = 4; e[E_PL2] = 0;
        e[E_RO1] = e[E_RO2] = e[E_TRO] = 0; e[E_OP] = ES_OP_OR;
    }
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
    return settings[((unsigned)b * 16 + p) * 8 + t][E_FLAGS] & F_EUC;
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
    for (s = 0; s < 16 && start + s < len; s++)
        if (rec[7 - (start + s) / 8] & (1u << ((start + s) % 8))) bits |= 1u << s;
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
