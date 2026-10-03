/* OCTAMOD.LOG ring and formatter (DRAFT). See octamod_log.h and FORMAT.md. */
#include "octamod_log.h"

/* Interrupt masking. On the MCF5xxx the logger raises the SR interrupt mask
 * to 7 around the head update so a record is never torn by an ISR that also
 * logs. The host build (tests) is single-threaded. */
#ifdef OCTAMOD_LOG_HOST
#define IRQ_SAVE(sr)    ((void)(sr))
#define IRQ_RESTORE(sr) ((void)(sr))
#else
#define IRQ_SAVE(sr)    __asm__ volatile("move.w %%sr,%0\n\tmove.w #0x2700,%%sr" : "=d"(sr) :: "memory")
#define IRQ_RESTORE(sr) __asm__ volatile("move.w %0,%%sr" :: "d"(sr) : "memory")
#endif

static uint32_t header_check(const struct octamod_log_ring *ring)
{
    /* FNV-1a over the header words: detects a ring that was never written
     * or was scribbled over, not a deliberate forgery. */
    const uint32_t words[6] = { ring->magic, ring->version, ring->boot, ring->head, ring->reserved, ring->flushed };
    uint32_t hash = 2166136261u;
    for (unsigned i = 0; i < 6; ++i)
        for (unsigned shift = 0; shift < 32; shift += 8) {
            hash ^= (words[i] >> shift) & 0xffu;
            hash *= 16777619u;
        }
    return hash;
}

void octamod_log_seal(struct octamod_log_ring *ring) { ring->check = header_check(ring); }

int octamod_log_boot(struct octamod_log_ring *ring, struct octamod_log_ring *previous)
{
    int intact = ring->magic == OCTAMOD_LOG_MAGIC && ring->version == OCTAMOD_LOG_VERSION &&
                 ring->check == header_check(ring);
    if (intact) *previous = *ring;
    uint32_t boot = intact ? ring->boot + 1u : 1u;
    ring->magic = OCTAMOD_LOG_MAGIC;
    ring->version = OCTAMOD_LOG_VERSION;
    ring->boot = boot;
    ring->head = ring->reserved = ring->flushed = 0;
    octamod_log_seal(ring);
    return intact;
}

void octamod_log(struct octamod_log_ring *ring, uint32_t ticks, enum octamod_log_level level,
                 uint32_t tag, uint16_t code, uint32_t a, uint32_t b)
{
    unsigned short sr;
    IRQ_SAVE(sr);
    struct octamod_log_record *record = &ring->records[ring->head & (OCTAMOD_LOG_RECORDS - 1u)];
    record->ticks = ticks;
    record->tag = tag;
    record->a = a;
    record->b = b;
    record->code = code;
    record->level = (uint8_t)level;
    record->reserved = 0;
    ring->head++;
    octamod_log_seal(ring);
    IRQ_RESTORE(sr);
}

/* ---- formatting -------------------------------------------------------- */

struct cursor { char *out; uint32_t used; int overflow; };

static void put(struct cursor *c, char ch)
{
    if (c->used >= OCTAMOD_LOG_FILE_SIZE) { c->overflow = 1; return; }
    c->out[c->used++] = ch;
}
static void puts_(struct cursor *c, const char *s) { while (*s) put(c, *s++); }
static void hex(struct cursor *c, uint32_t value, unsigned digits)
{
    while (digits--) put(c, "0123456789ABCDEF"[(value >> (digits * 4u)) & 15u]);
}
static void dec(struct cursor *c, uint32_t value, unsigned width)
{
    char digits[10];
    unsigned n = 0;
    do { digits[n++] = (char)('0' + value % 10u); value /= 10u; } while (value && n < sizeof digits);
    while (width > n) { put(c, '0'); --width; }
    while (n) put(c, digits[--n]);
}

static int valid_tag(uint32_t tag)
{
    int ended = 0;
    for (int shift = 24; shift >= 0; shift -= 8) {
        unsigned ch = (tag >> shift) & 0xffu;
        if (!ch) { if (shift == 24) return 0; ended = 1; continue; }
        if (ended || !((ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '_')) return 0;
    }
    return 1;
}
static int valid_level(uint8_t level)
{
    return level == OLOG_D || level == OLOG_I || level == OLOG_W || level == OLOG_E || level == OLOG_F;
}

static int valid_identity(const struct octamod_log_identity *id)
{
    const char *s;
    unsigned n = 0;
    if (!id->build || !id->os || !id->modules) return 0;
    for (s = id->build; *s; ++s, ++n) if (!((*s >= '0' && *s <= '9') || (*s >= 'a' && *s <= 'f'))) break;
    if (!(n == 16 && !*s)) {
        const char *u = "unknown";
        for (s = id->build; *s && *s == *u; ++s, ++u) {}
        if (*s || *u) return 0;
    }
    for (n = 0, s = id->os; *s; ++s, ++n)
        if (!((*s >= '0' && *s <= '9') || (*s >= 'A' && *s <= 'Z') || (*s >= 'a' && *s <= 'z') || *s == '.')) return 0;
    if (!n || n > 16) return 0;
    /* modules= is validated character-wise only; the web parser checks the
     * id@version grammar. Keep it printable and bounded. */
    for (n = 0, s = id->modules; *s; ++s, ++n) if (*s < 33 || *s > 126 || n >= OCTAMOD_LOG_MODULES_MAX) return 0;
    return 1;
}

static void session(struct cursor *c, const struct octamod_log_ring *ring, int recovered)
{
    uint32_t count = ring->head < OCTAMOD_LOG_RECORDS ? ring->head : OCTAMOD_LOG_RECORDS;
    uint32_t first = ring->head - count;
    puts_(c, "# boot="); dec(c, ring->boot, 1); put(c, '\n');
    if (recovered) puts_(c, "# recovered=1\n");
    if (first) { puts_(c, "# dropped="); dec(c, first, 1); put(c, '\n'); }
    for (uint32_t i = first; i < ring->head; ++i) {
        const struct octamod_log_record *r = &ring->records[i & (OCTAMOD_LOG_RECORDS - 1u)];
        /* A record scribbled by a crash must not poison the file the web
         * parser accepts: substitute a visible marker instead. */
        int ok = valid_tag(r->tag) && valid_level(r->level);
        dec(c, i % 100000u, 5); put(c, ' ');
        hex(c, r->ticks, 8); put(c, ' ');
        put(c, ok ? (char)r->level : 'W'); put(c, ' ');
        if (ok) {
            for (int shift = 24; shift >= 0; shift -= 8) {
                char ch = (char)((r->tag >> shift) & 0xffu);
                if (ch) put(c, ch);
            }
        } else puts_(c, "LOG");
        put(c, ' ');
        hex(c, ok ? r->code : 0xBADu, 4); put(c, ' ');
        hex(c, r->a, 8); put(c, ' ');
        hex(c, r->b, 8); put(c, '\n');
    }
}

uint32_t octamod_log_format(const struct octamod_log_ring *ring, const struct octamod_log_ring *previous,
                            const struct octamod_log_identity *identity, char *out)
{
    struct cursor c = { out, 0, 0 };
    uint32_t used;
    if (!valid_identity(identity)) return 0;
    puts_(&c, "# OCTAMOD-LOG v1\n");
    puts_(&c, "# build="); puts_(&c, identity->build); put(&c, '\n');
    puts_(&c, "# os="); puts_(&c, identity->os); put(&c, '\n');
    puts_(&c, "# modules="); puts_(&c, identity->modules); put(&c, '\n');
    if (previous) session(&c, previous, 1);
    session(&c, ring, 0);
    if (c.overflow) return 0;
    used = c.used;
    /* Fixed size: rewriting the same clusters never changes the FAT. */
    while (c.used < OCTAMOD_LOG_FILE_SIZE) out[c.used++] = '\n';
    return used;
}
