/* SPDX-License-Identifier: MIT */
#ifndef MODWERK_PRIVATE_ANALOG_BD_UI_H
#define MODWERK_PRIVATE_ANALOG_BD_UI_H
#include "machine_lifetime.h"
#include "loader.h"
/* Preparation only: no production admission or writes. The board must hold
 * its real stable lock from capture through plan verification and restoration.
 * Every identity field comes from trusted source/package association and the
 * actual owned generation; an uploaded layout or readiness flag is no input. */
#define AB_UI_ROOT_ADDRESS 0x460e5e28u
#define AB_UI_ROOT_BYTES 36u
struct ab_ui_identity {
    uint8_t package_sha256[32],source_sha256[32];
    uint32_t generation,image_lo,image_bytes,handlers_offset,labels_offset;
    uint16_t layout_revision;
};
struct ab_ui_snapshot {
    struct ab_ui_identity identity;
    uint8_t preinstall[AB_UI_ROOT_BYTES];
    uint32_t captured;
};
struct ab_ui_restore_plan {
    uint8_t observed[AB_UI_ROOT_BYTES],restore[AB_UI_ROOT_BYTES];
    uint32_t generation,needs_restore;
};
int ab_ui_snapshot_capture(const struct ab_ui_identity *,machine_memory_read,void *,struct ab_ui_snapshot *);
int ab_ui_retirement_plan(const struct ab_ui_snapshot *,const struct ab_ui_identity *,machine_memory_read,void *,
    const struct runtime_span *,unsigned,struct ab_ui_restore_plan *);
#endif
