/* Original 1.40C adapter. ABI evidence: the SDK's OctaKit persistence
 * adapter and dsp-dynload preflight. build_local.py fingerprints every
 * referenced firmware routine against the owner's local stock image. */
#include "octamod_log_port.h"
#ifdef OCTAMOD_LOG_HOST
extern uint32_t *olog_host_u32(uint32_t address);
extern uint8_t *olog_host_u8(uint32_t address);
extern int olog_host_size(uint32_t descriptor);
#define U32(a) (*olog_host_u32(a))
#define U8(a) (*olog_host_u8(a))
#else
#define U32(a) (*(volatile uint32_t *)(uintptr_t)(a))
#define U8(a) (*(volatile uint8_t *)(uintptr_t)(a))
#endif
struct file_object { uint32_t word[6]; };
/* NOLOAD reserve, accessed only through the uncached SDRAM alias. */
extern uint8_t octamod_log_io[512];
#define io octamod_log_io
static uint8_t verify[512] = {0};
static uint32_t high_water[2] = {0};
static uint32_t last_context = UINT32_MAX, last_tracks[8] = {0}, tracks_known = 0;
static uint32_t last_card = UINT32_MAX, last_usb = UINT32_MAX;
extern int olog_stock_open(struct file_object *, const char *, const char *, void *, unsigned);
extern int olog_stock_read(struct file_object *, void *, unsigned);
extern int olog_stock_write(struct file_object *, const void *, unsigned);
extern int olog_stock_close(struct file_object *);

#ifndef OCTAMOD_LOG_HOST
static void (*previous_exception)(const uint32_t *) = 0;
static void exception_hook(const uint32_t *frame)
{
    octamod_log_fault(frame[0], frame[1]);
    if (previous_exception) previous_exception(frame);
}
void octamod_log_platform_init(void)
{
    uint16_t sr;
    __asm__ volatile ("move.w %%sr,%0\n\tmove.w #0x2700,%%sr" : "=d" (sr) : : "memory");
    uint32_t installed = U32(0x460ba970u);
    if (installed != (uint32_t)(uintptr_t)exception_hook) {
        previous_exception = (void (*)(const uint32_t *))(uintptr_t)installed;
        U32(0x460ba970u) = (uint32_t)(uintptr_t)exception_hook;
    }
    __asm__ volatile ("move.w %0,%%sr" : : "d" (sr) : "memory");
}
#else
void octamod_log_platform_init(void) {}
#endif
uint32_t octamod_log_ticks(void) { return U32(0x460d5de0u); }
int octamod_log_can_flush(void)
{
    if (U32(0x800068fcu) != 0x460ddde4u) return 0; /* engine task only */
    if (U32(0x460d1cb8u) != 1 || U32(0x460e76a0u)) return 0;
    /* Include independently running audio/MIDI tracks, not just PLAY. */
    for (unsigned i = 0; i < 16; ++i) if (U8(0x80006500u + i)) return 0;
    /* Recorder dispatcher has two 84-byte state rows per track. Zero is
     * inactive; reject pending/active/releasing states in either bank. */
    for (unsigned i = 0; i < 16; ++i) if (U8(0x80004f1eu + i * 84u)) return 0;
    return U32(0x800065b8u) == 0;
}
static int size(struct file_object *f)
{
#ifdef OCTAMOD_LOG_HOST
    return olog_host_size(f->word[0]);
#else
    return ((int (*)(uint32_t))(uintptr_t)U32(0x46c8241eu))(f->word[0]);
#endif
}
static int equal(const void *a, const void *b, unsigned n)
{
    const uint8_t *x = a, *y = b;
    for (unsigned i = 0; i < n; ++i) if (x[i] != y[i]) return 0;
    return 1;
}
unsigned octamod_log_start_slot(void)
{
    /* Preserve a sole checkpoint from an earlier boot. With two files,
     * the untouched peer remains available throughout the first rewrite. */
    struct file_object f;
    int found = olog_stock_open(&f, "/OCTAMOD.LOG", "r", io, sizeof io);
    if (found < 0) return found == -12 ? 0 : 1;
    int owned = size(&f) == OCTAMOD_LOG_FILE_SIZE &&
        olog_stock_read(&f, verify, 17) == 1 && equal(verify, "# OCTAMOD-LOG v2\n", 17);
    (void)olog_stock_close(&f);
    if (!owned) return 1;
    found = olog_stock_open(&f, "/OCTAMOD1.LOG", "r", io, sizeof io);
    if (found >= 0) (void)olog_stock_close(&f);
    return found == -12 ? 1 : 0;
}
int octamod_log_write_checkpoint(unsigned slot, const char *data, uint32_t length, uint32_t used)
{
    const char *path = slot ? "/OCTAMOD1.LOG" : "/OCTAMOD.LOG";
    struct file_object f;
    if (slot > 1 || length != OCTAMOD_LOG_FILE_SIZE || !used || used > length) return 0;
    /* Never truncate or overwrite a foreign/incorrectly sized file. */
    int opened = olog_stock_open(&f, path, "r", io, sizeof io);
    if (opened >= 0) {
        int owned = size(&f) == (int)length && olog_stock_read(&f, verify, sizeof "# OCTAMOD-LOG v2\n" - 1) == 1 &&
                    equal(verify, "# OCTAMOD-LOG v2\n", sizeof "# OCTAMOD-LOG v2\n" - 1);
        int closed = olog_stock_close(&f);
        if (!owned || closed < 0) return 0;
    } else if (opened != -12) return 0; /* raw missing path; -10 empty is foreign */
    if (olog_stock_open(&f, path, "w", io, sizeof io) < 0) return 0;
    int original_size = size(&f), ok = original_size == 0 || original_size == (int)length;
    /* First use/unknown extent: initialise every sector. Later checkpoints
     * rewrite just the prefix that may differ, including old text that must
     * become LF padding. Keep the preallocated logical file length. */
    uint32_t extent = high_water[slot];
    uint32_t written = !extent || original_size == 0 ? length : ((used > extent ? used : extent) + 511u) & ~511u;
    high_water[slot] = 0; /* a failed attempt forces a full rewrite on retry */
    for (unsigned at = 0; ok && at < written; at += 512)
        ok = octamod_log_can_flush() && olog_stock_write(&f, data + at, 512) == 1;
    /* Stock buffered close takes logical length from word 4. A failed
     * sector must never shrink a preallocated checkpoint. The other slot
     * remains intact even when creation of this one fails. */
    if (original_size > 0) f.word[4] = (uint32_t)original_size;
    int closed = olog_stock_close(&f);
    if (!ok || closed < 0) return 0;
    if (olog_stock_open(&f, path, "r", io, sizeof io) < 0) return 0;
    ok = size(&f) == (int)length;
    for (unsigned at = 0; ok && at < length; at += sizeof verify)
        ok = olog_stock_read(&f, verify, sizeof verify) == 1 && equal(verify, data + at, sizeof verify);
    closed = olog_stock_close(&f);
    if (ok && closed >= 0) { high_water[slot] = used; return 1; }
    return 0;
}
void octamod_log_capture_state(uint32_t correlation)
{
    uint32_t card = U32(0x460d1cb8u), usb = U32(0x460e76a0u);
    if (card != last_card) {
        octamod_log_event(OLOG_I, OLOG_TAG('C','A','R','D'), 1, correlation, card); last_card = card;
    }
    if (usb != last_usb) {
        octamod_log_event(OLOG_I, OLOG_TAG('U','S','B',0), 1, correlation, usb); last_usb = usb;
    }
    unsigned part = U8(0x80000003u), track = U8(0x80000000u);
    uint32_t context = (uint32_t)U8(0x80000002u) << 24 | (uint32_t)U8(0x80000004u) << 16 | part << 8 | track;
    unsigned changed = context != last_context;
    if (changed) octamod_log_event(OLOG_I, OLOG_TAG('C','T','X',0), 1, correlation, context);
    last_context = context;
    uint32_t bank = U32(0x46c82456u);
    /* No arbitrary-pointer dereference if project state is uninitialised. */
    if (part > 3 || bank < 0x40000400u || bank > 0x47f00000u) return;
    uint32_t base = bank + 0x8ed80u + part * 6322u;
    for (unsigned i = 0; i < 8; ++i) {
        uint32_t selection = (uint32_t)U8(base + 0x22u + i) << 16 |
                             (uint32_t)U8(base + i) << 8 | U8(base + 8u + i);
        if (!tracks_known || selection != last_tracks[i])
            octamod_log_event(OLOG_I, OLOG_TAG('T','R','K',0), (uint16_t)i, correlation, selection);
        last_tracks[i] = selection;
    }
    tracks_known = 1;
}

/* Observe stock buffered I/O failures without recording paths or contents.
 * The trampolines replay guarded prologues and preserve the stock ABI. */
int olog_open_hook(struct file_object *f, const char *p, const char *m, void *b, unsigned n)
{
    int result = olog_stock_open(f, p, m, b, n);
    if (result < 0) octamod_log_io_error(1, result);
    return result;
}
int olog_read_hook(struct file_object *f, void *b, unsigned n)
{
    int result = olog_stock_read(f, b, n);
    if (result < 0) octamod_log_io_error(2, result);
    return result;
}
int olog_write_hook(struct file_object *f, const void *b, unsigned n)
{
    int result = olog_stock_write(f, b, n);
    if (result < 0) octamod_log_io_error(3, result);
    return result;
}
int olog_close_hook(struct file_object *f)
{
    int result = olog_stock_close(f);
    if (result < 0) octamod_log_io_error(4, result);
    return result;
}
