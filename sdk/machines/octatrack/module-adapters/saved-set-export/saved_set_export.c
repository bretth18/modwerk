/* SPDX-License-Identifier: GPL-3.0-or-later
 * Local developer recovery only. Bounded immutable snapshots of the two saved
 * module files; no card writes, arbitrary paths, memory reads or code execution.
 * The caller accesses this state through its uncached alias on ColdFire. */
#include "saved_set_export.h"
static void put32(uint8_t *p, uint32_t v) { p[0] = (uint8_t)(v >> 24); p[1] = (uint8_t)(v >> 16); p[2] = (uint8_t)(v >> 8); p[3] = (uint8_t)v; }
static void publish(struct msx_export *s, uint32_t status) { __asm__ volatile ("" ::: "memory"); s->status = status; }
int msx_begin(struct msx_export *s, uint32_t slot)
{
    if (slot > 1u || s->status != MSX_IDLE || s->token >= 65535u) return 0;
    ++s->token; s->slot = slot; s->length = 0;
    publish(s, MSX_PENDING); return 1;
}
int msx_release(struct msx_export *s, uint32_t token)
{
    if (!token || token != s->token || s->status == MSX_IDLE) return 0;
    s->length = 0; publish(s, MSX_IDLE); return 1;
}
void msx_reset(struct msx_export *s) { s->length = 0; publish(s, MSX_IDLE); }
void msx_metadata(const struct msx_export *s, uint8_t out[MSX_METADATA_BYTES])
{
    uint32_t ready = s->status == MSX_READY;
    for (unsigned i = 0; i < MSX_METADATA_BYTES; ++i) out[i] = 0;
    put32(out, 0x4d575345u); out[4] = 1; out[5] = (uint8_t)s->status; out[6] = (uint8_t)s->slot;
    put32(out + 8, s->token); put32(out + 12, ready ? s->length : 0);
    if (ready) {
        for (unsigned i = 0; i < 32u; ++i) out[16 + i] = s->digest[i];
        /* The original file's identity is data, never an admission decision. */
        if (s->length >= 52u && s->snapshot[0] == 'M' && s->snapshot[1] == 'W' && s->snapshot[2] == 'S' && s->snapshot[3] == 'T')
            for (unsigned i = 0; i < 32u; ++i) out[48 + i] = s->snapshot[20 + i];
    }
}
int msx_chunk(const struct msx_export *s, uint32_t index, uint8_t out[MSX_CHUNK_BYTES])
{
    if (s->status != MSX_READY || !s->length || s->length > MSX_CAPACITY || index > (MSX_CAPACITY - 1u) / MSX_CHUNK_DATA) return 0;
    uint32_t offset = index * MSX_CHUNK_DATA;
    if (offset >= s->length) return 0;
    uint32_t n = s->length - offset; if (n > MSX_CHUNK_DATA) n = MSX_CHUNK_DATA;
    for (unsigned i = 0; i < MSX_CHUNK_BYTES; ++i) out[i] = 0;
    put32(out, 0x4d575343u); out[4] = 1; out[5] = MSX_READY; out[6] = (uint8_t)s->slot;
    put32(out + 8, s->token); put32(out + 12, offset); put32(out + 16, s->length); put32(out + 20, n);
    for (uint32_t i = 0; i < n; ++i) out[32 + i] = s->snapshot[offset + i];
    return 1;
}
void msx_service(struct msx_export *s, int safe,
    enum msx_status (*read_slot)(uint32_t, uint8_t *, uint32_t, uint32_t *),
    void (*hash)(const uint8_t *, uint32_t, uint8_t[32]))
{
    if (s->status != MSX_PENDING) return;
    const uint32_t token = s->token, slot = s->slot;
    uint32_t length = 0; uint8_t digest[32];
    enum msx_status result = safe && read_slot && hash ? read_slot(slot, s->snapshot, MSX_CAPACITY, &length) : MSX_UNSAFE;
    if (result == MSX_READY) {
        if (!length || length > MSX_CAPACITY) result = MSX_INVALID;
        else hash(s->snapshot, length, digest);
    } else if (result != MSX_UNSAFE && result != MSX_READ_FAILED && result != MSX_INVALID) result = MSX_READ_FAILED;
    /* Release/reset or a new request may have interrupted the file read/hash. */
    if (s->status != MSX_PENDING || s->token != token || s->slot != slot) return;
    s->length = result == MSX_READY ? length : 0;
    if (result == MSX_READY) for (unsigned i = 0; i < 32u; ++i) s->digest[i] = digest[i];
    publish(s, result);
}
