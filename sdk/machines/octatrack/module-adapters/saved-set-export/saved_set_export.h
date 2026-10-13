/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef MODWERK_SAVED_SET_EXPORT_H
#define MODWERK_SAVED_SET_EXPORT_H
#include <stdint.h>
#include "loader.h"
#define MSX_CAPACITY (RUNTIME_POOL_BYTES + 0x1000u)
#define MSX_METADATA_BYTES 80u
#define MSX_CHUNK_DATA 448u
#define MSX_CHUNK_BYTES 480u /* never a multiple of EP0's 64-byte packet */
enum msx_status { MSX_IDLE, MSX_PENDING, MSX_READY, MSX_BUSY, MSX_UNSAFE, MSX_READ_FAILED, MSX_INVALID };
struct msx_export {
    volatile uint32_t status;
    uint32_t token, slot, length;
    uint8_t digest[32];
    uint8_t snapshot[MSX_CAPACITY] __attribute__((aligned(4)));
};
/* ISR: queue/release only; serve immutable cached bytes. Token zero is invalid. */
int msx_begin(struct msx_export *, uint32_t slot);
int msx_release(struct msx_export *, uint32_t token);
void msx_reset(struct msx_export *);
void msx_metadata(const struct msx_export *, uint8_t out[MSX_METADATA_BYTES]);
int msx_chunk(const struct msx_export *, uint32_t index, uint8_t out[MSX_CHUNK_BYTES]);
/* Engine only. Reader has exactly two fixed paths; no path or size is host-supplied.
 * It returns READY/UNSAFE/READ_FAILED/INVALID and closes every opened file. */
void msx_service(struct msx_export *, int safe,
    enum msx_status (*read_slot)(uint32_t, uint8_t *, uint32_t, uint32_t *),
    void (*hash)(const uint8_t *, uint32_t, uint8_t[32]));
/* Exact original OS1.40C read-only size dispatchers. Other backends refuse. */
static inline int msx_size_target_allowed(uint32_t target) { return target == 0x4001b888u || target == 0x40018a0cu; }
/* OS1.40C adapter; native tests inject stock calls, never a writer. */
enum msx_status modwerk_saved_set_read(uint32_t slot, uint8_t *out, uint32_t capacity, uint32_t *length);
#endif
