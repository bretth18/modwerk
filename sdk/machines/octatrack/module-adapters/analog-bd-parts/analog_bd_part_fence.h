/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef MODWERK_ANALOG_BD_PART_FENCE_H
#define MODWERK_ANALOG_BD_PART_FENCE_H
#include <stdint.h>
#define MW_AB_EXTRA_PARTS_MAX 16u
/* Trusted board readers, never uploaded roots or readiness bits. Read returns
 * exactly1 for the complete requested1..4 bytes. extra_part returns1 with an
 * actual current/paused Part address,0 only for independently complete end,
 * any other result for unknown. Missing callbacks refuse. */
struct mw_ab_part_reader {
    void *context;
    int (*read)(void *, uint32_t, uint8_t *, unsigned);
    int (*extra_part)(void *, unsigned, uint32_t *);
};
enum mw_ab_part_result { MW_AB_PART_CLEAR=0, MW_AB_PART_RETAINED=1, MW_AB_PART_UNKNOWN=2 };
/* Read-only additional removal predicate under a qualified stable snapshot.
 * Reads all16banks' working/saved Parts, currentCS1 mirrors and bounded actual
 * current/paused extras. AB/1 with FLEX1 retains; AB prefix with unsupported
 * revision/type refuses as unknown. Marker absence is never generation or
 * whole-image/UI-root retirement authority. No production wiring/enable path.
 */
int mw_ab_part_fence(const struct mw_ab_part_reader *);
#endif
