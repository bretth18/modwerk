/* OCTAMOD.LOG -- low-level event log for Octatrack modules (DRAFT).
 *
 * A fixed RAM ring of 20-byte binary records. Logging is a handful of
 * stores with interrupts masked: no formatting, no allocation, no card
 * I/O, safe from task and interrupt context. Text is produced only at
 * flush time (octamod_log_format), and the card write happens only from a
 * flush site where the firmware already does file I/O (see README.md).
 *
 * The ring lives in a no-init section so a warm reset may leave it intact;
 * the next boot recovers it and flushes the previous session. Whether the
 * OT's SDRAM keeps its contents across a crash reset is UNMEASURED.
 *
 * File format: FORMAT.md. Web parser: src/community/ot-log.ts. */
#ifndef OCTAMOD_LOG_H
#define OCTAMOD_LOG_H

#include <stdint.h>

#define OCTAMOD_LOG_RECORDS   256u      /* power of two */
#define OCTAMOD_LOG_FILE_SIZE 32768u    /* fixed: the file never grows */
#define OCTAMOD_LOG_MODULES_MAX 2048u   /* longest modules= header value */
#define OCTAMOD_LOG_PATH      "/OCTAMOD.LOG"
#define OCTAMOD_LOG_MAGIC     0x4F4C4F47u /* "OLOG" */
#define OCTAMOD_LOG_VERSION   2u /* retained RAM layout and text version */

enum octamod_log_level { OLOG_D = 'D', OLOG_I = 'I', OLOG_W = 'W', OLOG_E = 'E', OLOG_F = 'F' };

/* Four-character tag packed big-endian, 'A'-'Z', '0'-'9', '_'; shorter tags
 * are left-aligned and zero-filled. Reserved: BOOT LOG FLT CARD. Modules use
 * their own short key, e.g. OLOG_TAG('R','P','T','C'). */
#define OLOG_TAG(a, b, c, d) (((uint32_t)(a) << 24) | ((uint32_t)(b) << 16) | ((uint32_t)(c) << 8) | (uint32_t)(d))

struct octamod_log_record {
    uint32_t ticks;   /* firmware tick counter at the event */
    uint32_t tag;
    uint32_t a, b;    /* event arguments (address, value, state ...) */
    uint16_t code;    /* tag-specific event code */
    uint8_t level;    /* enum octamod_log_level */
    uint8_t reserved;
};

struct octamod_log_ring {
    uint32_t magic, version;
    uint32_t boot;        /* boot counter, carried across recovery */
    uint32_t head;        /* records written this session; text seq = index % 100000 */
    uint32_t count;       /* valid records, independent of head wrapping */
    uint32_t dropped;     /* saturating overwritten-record counter */
    uint32_t flushed;     /* head value at the last successful flush */
    uint32_t check;       /* header checksum: see octamod_log_seal */
    struct octamod_log_record records[OCTAMOD_LOG_RECORDS];
};

/* Identity written into every file header. */
struct octamod_log_identity {
    const char *build;    /* 16 lowercase hex (configuration hash) or "unknown" */
    const char *os;       /* e.g. "1.40C" */
    const char *modules;  /* "id@version;id@version" */
    /* v2 headers. Build is a configuration identity, never the digest of an
     * image containing its own digest. Source fingerprints original logger
     * and selected module sources. Chooser order is significant. */
    const char *configuration; /* full SHA-256 */
    const char *source;        /* full SHA-256 */
    const char *fx1, *fx2, *hidden; /* semicolon-separated native keys */
    uint32_t stock_fx2;
};

/* Boot: if the ring header survived the reset, copy that session to
 * *previous (for the next flush) and continue its boot counter; otherwise
 * start at boot 1. Returns 1 when a previous session was recovered. */
int octamod_log_boot(struct octamod_log_ring *ring, struct octamod_log_ring *previous);

/* Append one record. Never blocks, never fails: the oldest record is
 * overwritten when the ring is full and reported as
 * "# dropped=" in the file. */
void octamod_log(struct octamod_log_ring *ring, uint32_t ticks, enum octamod_log_level level,
                 uint32_t tag, uint16_t code, uint32_t a, uint32_t b);

/* Render the whole file (header, previous session if recovered, current
 * session, newline padding) into exactly OCTAMOD_LOG_FILE_SIZE bytes.
 * Returns the number of meaningful bytes before the padding, or 0 if the
 * identity is invalid. Pure: no I/O, host-testable. */
uint32_t octamod_log_format(const struct octamod_log_ring *ring, const struct octamod_log_ring *previous,
                            const struct octamod_log_identity *identity, char *out);

/* Recompute the header checksum after changing header fields. */
void octamod_log_seal(struct octamod_log_ring *ring);

/* Copy a stable view using one short interrupt-masked copy per record.
 * Return 0 when writers keep changing the ring; caller retries at a later
 * safe point. Never format the live ring. */
int octamod_log_snapshot(const struct octamod_log_ring *ring, struct octamod_log_ring *snapshot);
void octamod_log_flushed(struct octamod_log_ring *ring, uint32_t head);

#endif
