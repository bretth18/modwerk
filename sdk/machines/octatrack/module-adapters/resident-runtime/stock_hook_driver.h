/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef MODWERK_STOCK_HOOK_DRIVER_H
#define MODWERK_STOCK_HOOK_DRIVER_H
#include "stock_hooks.h"
#define MW_HOOK_CHUNK 24u
struct mw_hook_record { uint32_t space, address, words, owner; };
struct mw_hook_fragment { const uint8_t *start, *end; uint32_t bytes; };
struct mw_hook_boot_core {
    const struct mw_hook_fragment *fragments;
    const struct mw_hook_record *records;
    uint32_t fragment_count, record_count, bytes;
};
struct mw_hook_cursor {
    const uint8_t *at;
    uint32_t bytes, fragment, fragment_bytes, record, word, logical, count, submitted;
    uint16_t run;
    uint8_t zero, header, finished;
    uint32_t chunk[MW_HOOK_CHUNK];
};
struct mw_hook_driver {
    struct mw_stock_hooks leases;
    const struct mw_hook_boot_core *boot;
    struct mw_hook_cursor cursors[2];
    uint32_t module, generation;
    uint8_t resetting;
};
struct mw_hook_driver_transport {
    struct mw_hook_transport cas;
    int (*reset_start)(unsigned core,unsigned feature,unsigned offset,unsigned count,const uint32_t *words);
    int (*resources_idle)(unsigned feature); /* actual live/transition X/Y ownership */
};
/* This driver is called only after exact package/source private admission.
 * It cannot install a controller or widen a catalogue allowlist. */
/* Read under the existing loader/publication stable lock. */
int mw_hook_driver_export_idle(const struct mw_hook_driver *);
void mw_hook_driver_init(struct mw_hook_driver *,const struct mw_hook_boot_core [2]);
int mw_hook_driver_begin(struct mw_hook_driver *,unsigned feature,uint32_t module,uint32_t generation,int enable);
int mw_hook_driver_tick(struct mw_hook_driver *,const struct mw_hook_driver_transport *);
int mw_hook_driver_retire(struct mw_hook_driver *,unsigned feature,uint32_t module,uint32_t generation,int roots_clear);
#endif
