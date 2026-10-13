/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef MODWERK_STOCK_HOOKS_H
#define MODWERK_STOCK_HOOKS_H
#include <stdint.h>

#define MW_HOOK_SIDECHAIN 1u
#define MW_HOOK_MATRIX 2u
#define MW_HOOK_ANALOG_BD 4u
#define MW_HOOK_CAS 10u
#define MW_HOOK_RESET 11u
enum { MW_HOOK_OK=0, MW_HOOK_PENDING=1, MW_HOOK_BUSY=2, MW_HOOK_OWNER=3,
       MW_HOOK_STATE=4, MW_HOOK_QUARANTINED=5 };
struct mw_hook_owner { uint32_t module, generation; };
struct mw_stock_hooks {
    struct mw_hook_owner owners[3];
    uint8_t active[2], expected[2], desired[2], inflight[2], done[2];
    uint8_t known, phase, feature, enabling, ready;
};
/* Return complete=1, pending=0, failed=-1, idle=-2. A failed transport may
 * have applied its packet without an observed ACK: ownership must stay held. */
struct mw_hook_transport {
    int (*start)(unsigned core, unsigned expected, unsigned desired);
    int (*status)(unsigned core);
    void (*release)(unsigned core);
};
void mw_stock_hooks_init(struct mw_stock_hooks *);
/* Authored DSP state must have been initialized while dormant. The trusted
 * boot/reset driver supplies this only after its actual bounded writes ACK. */
int mw_stock_hooks_ready(struct mw_stock_hooks *, unsigned feature);
/* Reserve this exact controller generation during actual initialization.
 * Every required core must ACK its complete fixed record stream. */
int mw_stock_hooks_reset_begin(struct mw_stock_hooks *, unsigned feature,
                              uint32_t module, uint32_t generation);
int mw_stock_hooks_reset_done(struct mw_stock_hooks *, unsigned core, int okay);
int mw_stock_hooks_begin(struct mw_stock_hooks *, unsigned feature,
                        uint32_t module, uint32_t generation, int enable);
int mw_stock_hooks_tick(struct mw_stock_hooks *, const struct mw_hook_transport *);
/* A quarantined transport can be reconciled only from independently checked
 * receiver PEEK results after the old command is no longer outstanding. */
int mw_stock_hooks_observed(struct mw_stock_hooks *, unsigned core, unsigned mask);
/* Only after disable ACKs AND the caller's existing foreign-root fence passed.
 * Every lifetime token is version/instance-specific, including same-module updates. */
int mw_stock_hooks_retire(struct mw_stock_hooks *, unsigned feature,
                         uint32_t module, uint32_t generation, int roots_clear);
int mw_stock_hooks_busy(const struct mw_stock_hooks *);
#endif
