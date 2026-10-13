/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef MODWERK_AB_PART_ROOTS_H
#define MODWERK_AB_PART_ROOTS_H
#include <stdint.h>
#define MW_AB_ROOT_READS 8u
#define MW_AB_ROOT_PARTS 16u
#define MW_AB_ROOT_SPANS 22u
#define MW_AB_ROOT_META 32u
struct mw_ab_root_extent { uint32_t canonical, bytes; };
/* Board-owned original backend-entry registers, not an uploaded context.
 * Both readers return exactly1 for a complete read. No completeness callback. */
struct mw_ab_root_reader {
    void *context;
    int (*read)(void *,uint32_t,uint8_t *,unsigned);
    int (*entry_register)(void *,unsigned,uint32_t *);
};
enum mw_ab_root_status {
    MW_AB_ROOT_PENDING=0,
    /* Only the bounded root-byte scan ended. Semantic Part completeness is
     * unproven, so this never grants Part or whole-allocation clearance. */
    MW_AB_ROOT_BYTES_SCANNED=1,
    MW_AB_ROOT_UNKNOWN=2
};
struct mw_ab_root_span { uint32_t from,to; };
struct mw_ab_root_word { uint32_t at,value; };
struct mw_ab_part_roots {
    struct mw_ab_root_reader reader;
    struct mw_ab_root_extent owned[2]; /* independently bound predecessor/candidate */
    uint32_t registers[16],parts[MW_AB_ROOT_PARTS];
    struct mw_ab_root_span spans[MW_AB_ROOT_SPANS];
    struct mw_ab_root_word metadata[MW_AB_ROOT_META];
    uint32_t current,head,next,at,seen;
    unsigned phase,index,priority,hops,span_count,span_index,part_count,meta_count;
    unsigned retained; /* bit0 predecessor / bit1 candidate; never a clear decision */
    unsigned reads,last_reads,total_reads;
    enum mw_ab_root_status status;
};
/* Requires actual level4 task lock throughout all calls; the helper checks
 * actual SR and never changes it. Frame levels5/6 remain enabled. Trusted
 * whole canonical extents are copied, never inferred from staging addresses. */
int mw_ab_part_roots_begin(struct mw_ab_part_roots *,const struct mw_ab_root_reader *,
    const struct mw_ab_root_extent owned[2]);
enum mw_ab_root_status mw_ab_part_roots_step(struct mw_ab_part_roots *);
/* Returns1 for an observed source-known Part base after byte scanning.
 * End/unknown always returns-1: no current implementation returns complete0. */
int mw_ab_part_roots_extra(const struct mw_ab_part_roots *,unsigned,uint32_t *);
#endif
