/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "stock_hook_driver.h"
#include "stock_hook_resources.h"
#include <assert.h>
int modwerk_stock_hook_export_idle(void);
int modwerk_stock_hook_begin(unsigned,uint32_t,uint32_t,int);
int modwerk_stock_hook_retire(unsigned,uint32_t,uint32_t,int);
int modwerk_dsp_buffer_permitted(unsigned,unsigned,unsigned,unsigned);
const struct mw_hook_boot_core modwerk_hook_boot[2]={{0},{0}};
static int saved,policy;
int modwerk_saved_set_busy(void) { return saved; }
int dl_publication_idle(void) { return 1; }
int modwerk_stock_hook_buffer_policy(unsigned core,unsigned id,struct mw_hook_buffer_claim *out) {
    (void)core;(void)id; *out=(struct mw_hook_buffer_claim){16384u,1,0};return policy;
}
int main(void) {
    assert(modwerk_stock_hook_export_idle());
    saved=1;
    assert(modwerk_stock_hook_begin(1,17,23,0)==MW_HOOK_BUSY);
    assert(modwerk_stock_hook_begin(1,17,23,1)==MW_HOOK_BUSY);
    assert(modwerk_stock_hook_retire(1,17,23,1)==MW_HOOK_BUSY);
    saved=0;
    assert(modwerk_stock_hook_begin(1,17,23,1)==MW_HOOK_STATE); /* default-closed admission */
    assert(modwerk_stock_hook_begin(1,17,23,0)==MW_HOOK_OWNER);
    assert(!modwerk_dsp_buffer_permitted(0,1,0,32)); /* no identity policy */
    policy=1;
    assert(modwerk_dsp_buffer_permitted(0,1,0,32));
    assert(!modwerk_dsp_buffer_permitted(0,1,2,32));
    assert(modwerk_stock_hook_export_idle());
    return 0;
}
