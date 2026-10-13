/* SPDX-License-Identifier: MIT */
#ifndef MODWERK_MACHINE_LIFETIME_H
#define MODWERK_MACHINE_LIFETIME_H
#include <stdint.h>
/* The caller holds a stable publication boundary. read returns 1 on a complete
 * big-endian target-memory read, 0 when unavailable. No arbitrary RAM scan.
 * This covers reviewed 1.40C UI roots, not all possible page/widget caches.
 * Old bounds include the retired image's code, data and BSS. Cached/uncached
 * aliases compare by physical identity; actual reads preserve the root's alias. */
typedef int (*machine_memory_read)(void *context, uint32_t address, void *out, uint32_t length);
enum machine_lifetime_result { MACHINE_CLEAR=0, MACHINE_RETAINED=1, MACHINE_UNKNOWN=2 };
int machine_ui_lifetime(machine_memory_read read, void *context, uint32_t old_lo, uint32_t old_hi);
#endif
