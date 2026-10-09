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

/* ---- the EUCLID page --------------------------------------------------- */

static const char *const ops[ES_OP_COUNT] = { "OR", "XOR", "AND", "SUB" };
static const char *const names[6] = { "PL1", "PL2", "LEN", "RO1", "RO2", "TRO" };

static void text(void *surface, int x, int y, const char *s) {
    ((void (*)(uint32_t, void *, int, int, int, const char *))0x40012bd8u)(0x400ba876u, surface, x, y, -1, s);
}

static void number(char *out, unsigned v) {
    unsigned i = 0;
    if (v >= 10) out[i++] = (char)('0' + v / 10 % 10);
    out[i++] = (char)('0' + v % 10);
    out[i] = 0;
}

static void draw(void) {
    if (!es_window) return;
    unsigned t = U8(TRACK_IDX);
    uint8_t *e = entry(t);
    void *surface = (void *)(uintptr_t)(es_window + 0x24);
    ((void (*)(void *))0x4003567cu)(surface);
    if (!e) return;
    int height = (int)U32(es_window + 0x28);
    unsigned len = track_length(t);
    unsigned values[6] = { e[E_PL1], e[E_PL2], len, e[E_RO1], e[E_RO2], e[E_TRO] };
    char buf[4];
    for (unsigned i = 0; i < 6; i++) {
        int x = 6 + 34 * (int)(i % 3), y = height - 22 - 16 * (int)(i / 3);
        text(surface, x, y, names[i]);
        number(buf, values[i] > 99 ? 99 : values[i]);
        text(surface, x + 18, y, buf);
    }
    text(surface, 6, height - 54, "OP:");
    text(surface, 22, height - 54, ops[e[E_OP] % ES_OP_COUNT]);
    text(surface, 64, height - 54, e[E_FLAGS] & F_EUC ? "EUC:ON" : "EUC:OFF");
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

static void open_page(void) {
    if (es_window || !entry(U8(TRACK_IDX))) return;
    uint32_t w = ((uint32_t (*)(int, int, int, int, int, void (*)(void)))0x4005829cu)
        (110, 58, -1, 0, 1, es_close_cb);
    if (!w) return;
    es_window = w;
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
    if (edge == 1 && U32(TTE_WINDOW) && U32(TTE_ROW) == 0) open_page();
}

/* NO acts on release, so its press never reaches the layer underneath once
 * this one is popped. */
void es_key(unsigned code, unsigned edge) {
    if (!es_window) return;
    if (code == 0x32) {
        if (edge == 0) {
            close_page();
            ((void (*)(void))0x4007c050u)();
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
