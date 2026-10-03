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
    /* Constant work in the event path: detect uninitialised/corrupt header
     * words without a byte checksum loop under the IRQ mask.
     * The card checkpoint has a separate CRC32 over all its contents. */
    return 0x9e3779b9u ^ ring->magic ^ (ring->version << 3) ^
           (ring->boot * 33u) ^ ring->head ^ (ring->count << 9) ^
           (ring->dropped << 16 | ring->dropped >> 16) ^
           (ring->flushed << 1 | ring->flushed >> 31);
}

void octamod_log_seal(struct octamod_log_ring *ring) { ring->check = header_check(ring); }

int octamod_log_boot(struct octamod_log_ring *ring, struct octamod_log_ring *previous)
{
    int intact = ring->magic == OCTAMOD_LOG_MAGIC && ring->version == OCTAMOD_LOG_VERSION &&
                 ring->count <= OCTAMOD_LOG_RECORDS && ring->check == header_check(ring);
    if (intact) *previous = *ring;
    uint32_t boot = intact && ring->boot < UINT32_MAX ? ring->boot + 1u : 1u;
    ring->magic = OCTAMOD_LOG_MAGIC;
    ring->version = OCTAMOD_LOG_VERSION;
    ring->boot = boot;
    ring->head = ring->count = ring->dropped = ring->flushed = 0;
    octamod_log_seal(ring);
    return intact;
}

void octamod_log(struct octamod_log_ring *ring, uint32_t ticks, enum octamod_log_level level,
                 uint32_t tag, uint16_t code, uint32_t a, uint32_t b)
{
    unsigned short sr = 0;
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
    if (ring->count < OCTAMOD_LOG_RECORDS) ++ring->count;
    else if (ring->dropped < UINT32_MAX) ++ring->dropped;
    octamod_log_seal(ring);
    IRQ_RESTORE(sr);
}

int octamod_log_snapshot(const struct octamod_log_ring *ring, struct octamod_log_ring *snapshot)
{
    unsigned short sr = 0;
    for (unsigned attempt = 0; attempt < 3; ++attempt) {
        IRQ_SAVE(sr);
        snapshot->magic = ring->magic;
        snapshot->version = ring->version;
        snapshot->boot = ring->boot;
        snapshot->head = ring->head;
        snapshot->count = ring->count;
        snapshot->dropped = ring->dropped;
        snapshot->flushed = ring->flushed;
        snapshot->check = ring->check;
        IRQ_RESTORE(sr);
        if (snapshot->count > OCTAMOD_LOG_RECORDS) return 0;
        for (uint32_t n = 0; n < snapshot->count; ++n) {
            uint32_t i = (snapshot->head - snapshot->count + n) & (OCTAMOD_LOG_RECORDS - 1u);
            IRQ_SAVE(sr);
            snapshot->records[i] = ring->records[i];
            IRQ_RESTORE(sr);
        }
        IRQ_SAVE(sr);
        int intact = ring->head == snapshot->head && ring->check == snapshot->check;
        IRQ_RESTORE(sr);
        if (intact && snapshot->check == header_check(snapshot)) return 1;
    }
    return 0;
}

void octamod_log_flushed(struct octamod_log_ring *ring, uint32_t head)
{
    unsigned short sr = 0;
    IRQ_SAVE(sr);
    ring->flushed = head;
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

static int digit(char c) { return c >= '0' && c <= '9'; }
static int lower(char c) { return c >= 'a' && c <= 'z'; }
static int digest(const char *s)
{
    if (!s) return 0;
    for (unsigned i = 0; i < 64; ++i)
        if (!(digit(s[i]) || (s[i] >= 'a' && s[i] <= 'f'))) return 0;
    return s[64] == 0;
}
static int chooser(const char *s)
{
    if (!s) return 0;
    unsigned count = 0, length = 0, total = 0;
    if (!*s) return 1;
    for (; *s; ++s) {
        if (++total > 1024) return 0;
        if (*s == ';') { if (!length || ++count >= 32) return 0; length = 0; continue; }
        if (++length > 48 || !(digit(*s) || lower(*s) || (*s >= 'A' && *s <= 'Z') ||
            *s == ' ' || *s == '-' || *s == '_' || *s == '+' || *s == '.')) return 0;
    }
    return length != 0;
}

static int valid_modules(const char *s)
{
    unsigned total = 0, modules = 0;
    const char *list = s;
    if (!*s) return 1;
    while (*s) {
        const char *begin = s;
        if (++modules > 64 || !(digit(*s) || lower(*s))) return 0;
        unsigned n = 0;
        while (digit(*s) || lower(*s) || *s == '-') { ++s; if (++n > 48) return 0; }
        for (const char *prior = list; prior < begin;) {
            unsigned i = 0;
            while (i < n && prior[i] == begin[i]) ++i;
            if (i == n && prior[i] == '@') return 0;
            while (*prior && *prior != ';') ++prior;
            if (*prior) ++prior;
        }
        if (*s++ != '@') return 0;
        for (unsigned part = 0; part < 3; ++part) {
            if (!digit(*s)) return 0;
            while (digit(*s)) { ++s; if ((unsigned)(s - begin) > OCTAMOD_LOG_MODULES_MAX) return 0; }
            if (part < 2 && *s++ != '.') return 0;
        }
        if (*s == '-') {
            ++s; n = 0;
            while (digit(*s) || lower(*s) || *s == '.') { ++s; if (++n > 24) return 0; }
            if (!n) return 0;
        }
        total += (unsigned)(s - begin);
        if (total > OCTAMOD_LOG_MODULES_MAX) return 0;
        if (!*s) return 1;
        if (*s++ != ';' || !*s || ++total > OCTAMOD_LOG_MODULES_MAX) return 0;
    }
    return 0;
}

static int valid_identity(const struct octamod_log_identity *id)
{
    const char *s;
    unsigned n = 0;
    if (!id || !id->build || !id->os || !id->modules) return 0;
    for (s = id->build; *s; ++s, ++n) if (!((*s >= '0' && *s <= '9') || (*s >= 'a' && *s <= 'f'))) break;
    if (!(n == 16 && !*s)) {
        const char *u = "unknown";
        for (s = id->build; *s && *s == *u; ++s, ++u) {}
        if (*s || *u) return 0;
    }
    for (n = 0, s = id->os; *s; ++s, ++n)
        if (!((*s >= '0' && *s <= '9') || (*s >= 'A' && *s <= 'Z') || (*s >= 'a' && *s <= 'z') || *s == '.')) return 0;
    if (!n || n > 16) return 0;
    if (!digest(id->configuration)) return 0;
    for (unsigned i = 0; i < 16; ++i) if (id->build[i] != id->configuration[i]) return 0;
    return valid_modules(id->modules) && digest(id->source) &&
           chooser(id->fx1) && chooser(id->fx2) && chooser(id->hidden) && id->stock_fx2 <= 1;
}

static void session(struct cursor *c, const struct octamod_log_ring *ring, int recovered)
{
    uint32_t count = ring->count;
    uint32_t first = ring->head - count;
    puts_(c, "# boot="); dec(c, ring->boot, 1); put(c, '\n');
    if (recovered) puts_(c, "# recovered=1\n");
    if (ring->dropped) { puts_(c, "# dropped="); dec(c, ring->dropped, 1); put(c, '\n'); }
    for (uint32_t n = 0; n < count; ++n) {
        uint32_t i = first + n;
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
    if (!valid_identity(identity) || ring->count > OCTAMOD_LOG_RECORDS ||
        (previous && previous->count > OCTAMOD_LOG_RECORDS)) return 0;
    puts_(&c, "# OCTAMOD-LOG v2\n");
    puts_(&c, "# build="); puts_(&c, identity->build); put(&c, '\n');
    puts_(&c, "# os="); puts_(&c, identity->os); put(&c, '\n');
    puts_(&c, "# modules="); puts_(&c, identity->modules); put(&c, '\n');
    puts_(&c, "# configuration="); puts_(&c, identity->configuration); put(&c, '\n');
    puts_(&c, "# source="); puts_(&c, identity->source); put(&c, '\n');
    puts_(&c, "# fx1="); puts_(&c, identity->fx1); put(&c, '\n');
    puts_(&c, "# fx2="); puts_(&c, identity->fx2); put(&c, '\n');
    puts_(&c, "# hidden="); puts_(&c, identity->hidden); put(&c, '\n');
    puts_(&c, "# stockfx2="); dec(&c, identity->stock_fx2, 1); put(&c, '\n');
    if (previous) session(&c, previous, 1);
    session(&c, ring, 0);
    if (c.overflow) return 0;
    /* Detect torn checkpoints; this is integrity, not authentication. */
    uint32_t crc = UINT32_MAX;
    for (uint32_t i = 0; i < c.used; ++i) {
        crc ^= (uint8_t)out[i];
        for (unsigned bit = 0; bit < 8; ++bit)
            crc = (crc >> 1) ^ (0xEDB88320u & (0u - (crc & 1u)));
    }
    puts_(&c, "# complete="); hex(&c, ~crc, 8); put(&c, '\n');
    if (c.overflow) return 0;
    used = c.used;
    /* Fixed payload size. The filesystem may still update FAT metadata. */
    while (c.used < OCTAMOD_LOG_FILE_SIZE) out[c.used++] = '\n';
    return used;
}
