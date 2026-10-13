/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef MODWERK_STOCK_HOOK_RESOURCES_H
#define MODWERK_STOCK_HOOK_RESOURCES_H
#include "stock_hooks.h"
/* Source-reviewed, exact-package policies are supplied by the private manager,
 * never by a module or a host readiness flag. Words include initialization. */
struct mw_hook_buffer_claim { uint32_t words; uint8_t complete, head_safe; };
enum { MW_HOOK_P=0, MW_HOOK_X=1, MW_HOOK_Y=2 };
struct mw_hook_span { uint32_t address, words; uint8_t core, space; };
unsigned mw_stock_hooks_held(const struct mw_stock_hooks *);
int mw_hook_buffer_permitted(const struct mw_stock_hooks *,unsigned core,unsigned kind,unsigned block,
                             const struct mw_hook_buffer_claim *);
/* Both sets must include all exact-source fixed and instance tenants, including
 * pending initialization and outgoing code through its last unbind ACK.
 * Shared X/Y/P aliases are compared across both cores. Incomplete means closed. */
int mw_hook_ranges_idle(unsigned feature,const struct mw_hook_span *live,unsigned live_count,
                        const struct mw_hook_span *target,unsigned target_count,unsigned complete_cores);
#endif
