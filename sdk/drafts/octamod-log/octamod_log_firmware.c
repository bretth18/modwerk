/* OCTAMOD.LOG firmware glue (DRAFT -- deliberately does not build).
 *
 * Everything here that touches stock firmware is UNRESOLVED and must be
 * established against the owner's own OS 1.40C image (never committed) and
 * qualified in the emulator with --card-rw before any hardware run. See
 * README.md "Open research". The ring and formatter in octamod_log.c are
 * firmware-independent and host-tested. */
#include "octamod_log.h"

#ifndef OCTAMOD_LOG_FS_WRITE
#error "OCTAMOD.LOG: the firmware file-write entry and its open mode are unresolved (README.md, Open research 1)."
#endif

/* Known read-side file API, from platform/dsp-dynload-transport/preflight.c:
 * pointers stored in a table in SRAM. The write slot is NOT known: the
 * integrator defines OCTAMOD_LOG_FS_WRITE (table address) and
 * OCTAMOD_LOG_FS_MODE (open mode string) only after disassembly proves them. */
#define FS(address, type) ((type)(uintptr_t)*(volatile uint32_t *)(uintptr_t)(address))
#define FS_OPEN  0x46c8242au /* int open(const char *path, const char *mode) */
#define FS_CLOSE 0x46c82422u /* int close(int fd) */
#define FS_SEEK  0x46c8243eu /* int seek(int fd, unsigned offset) */

/* No-init: must be placed by the build outside .bss so the stock C runtime
 * does not clear it at boot (README.md, Open research 3). */
static struct octamod_log_ring ring __attribute__((section(".octamod_noinit")));
static struct octamod_log_ring previous;
static int have_previous, ready;
/* 32 KiB: the RAM budget for this buffer is an open question; a streaming
 * per-sector formatter would remove it (README.md, Open research 4). */
static char file[OCTAMOD_LOG_FILE_SIZE] __attribute__((aligned(512)));

extern const struct octamod_log_identity octamod_log_identity; /* emitted by the composer */
extern uint32_t octamod_log_ticks(void);                       /* stock tick counter, unresolved */

/* Hook A (unresolved site): early boot, before any module logs. */
void octamod_log_on_boot(void)
{
    have_previous = octamod_log_boot(&ring, &previous);
    ready = 1;
    octamod_log(&ring, octamod_log_ticks(), OLOG_I, OLOG_TAG('B','O','O','T'), 0x0001, have_previous, 0);
}

/* The public entry modules call. Cheap, interrupt-safe, never touches the card. */
void octamod_log_event(enum octamod_log_level level, uint32_t tag, uint16_t code, uint32_t a, uint32_t b)
{
    if (ready) octamod_log(&ring, octamod_log_ticks(), level, tag, code, a, b);
}

/* Hook B (unresolved site): CPU exception entry. Records the faulting PC,
 * format/vector word and SR, then falls through to the stock handler. The
 * record survives only if the reset keeps SDRAM (unmeasured). */
void octamod_log_fault(uint32_t format_vector, uint32_t pc)
{
    if (ready) octamod_log(&ring, octamod_log_ticks(), OLOG_F, OLOG_TAG('F','L','T',0), (uint16_t)((format_vector >> 18) & 0xffu), pc, format_vector);
}

/* Hook C (unresolved site): a point where the firmware itself already does
 * card I/O from task context with playback stopped -- the SAVE PROJECT path
 * after its own writes, and once after the card is mounted at boot. Never
 * from an interrupt, never during playback. */
int octamod_log_flush(void)
{
    uint32_t used = octamod_log_format(&ring, have_previous ? &previous : 0, &octamod_log_identity, file);
    if (!used) return -1;
    int fd = FS(FS_OPEN, int (*)(const char *, const char *))(OCTAMOD_LOG_PATH, OCTAMOD_LOG_FS_MODE);
    if (fd < 1) return -1;
    int ok = FS(FS_SEEK, int (*)(int, unsigned))(fd, 0) >= 0;
    for (uint32_t sector = 0; ok && sector < OCTAMOD_LOG_FILE_SIZE / 512u; ++sector)
        ok = FS(OCTAMOD_LOG_FS_WRITE, int (*)(int, const void *, unsigned))(fd, file + sector * 512u, 1) > 0;
    ok = FS(FS_CLOSE, int (*)(int))(fd) >= 0 && ok;
    if (ok) { ring.flushed = ring.head; octamod_log_seal(&ring); have_previous = 0; }
    octamod_log(&ring, octamod_log_ticks(), ok ? OLOG_I : OLOG_E, OLOG_TAG('L','O','G',0), 0x0002, used, (uint32_t)ok);
    return ok ? 0 : -1;
}
