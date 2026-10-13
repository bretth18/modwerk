/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "stock_hooks.h"
#include <assert.h>
static int status[2], starts[2], releases[2];
static unsigned expected[2], desired[2];
static int start(unsigned core,unsigned before,unsigned after) {
    ++starts[core]; expected[core]=before; desired[core]=after; status[core]=0; return 1;
}
static int state(unsigned core) { return status[core]; }
static void release(unsigned core) { ++releases[core]; }
static const struct mw_hook_transport transport={start,state,release};
int main(void) {
    struct mw_stock_hooks s;
    mw_stock_hooks_init(&s);
    assert(mw_stock_hooks_begin(&s,1,123,7,1)==MW_HOOK_STATE); /* dirty cold RAM refused */
    assert(mw_stock_hooks_ready(&s,1)==MW_HOOK_OK);
    assert(mw_stock_hooks_begin(&s,1,123,7,1)==MW_HOOK_PENDING);
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_PENDING);
    assert(starts[0]==1 && starts[1]==1 && expected[0]==0 && desired[1]==1);
    status[0]=1;
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_PENDING);
    assert(s.active[0]==1 && s.active[1]==0);
    assert(mw_stock_hooks_retire(&s,1,123,7,1)==MW_HOOK_STATE); /* one ACK cannot free controller */
    status[1]=1;
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_OK);
    assert(mw_stock_hooks_begin(&s,1,123,8,0)==MW_HOOK_OWNER); /* same module, another version */
    assert(mw_stock_hooks_ready(&s,2)==MW_HOOK_OK);
    assert(mw_stock_hooks_begin(&s,2,456,1,1)==MW_HOOK_PENDING);
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_PENDING);
    assert(starts[1]==1); /* Output Matrix touches core A only */
    status[0]=1;
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_OK);
    assert(s.active[0]==3 && s.active[1]==1);
    assert(mw_stock_hooks_begin(&s,1,123,7,0)==MW_HOOK_PENDING);
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_PENDING);
    status[0]=1; status[1]=-1; /* timeout/negative ACK: core B application unknown */
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_QUARANTINED);
    assert(s.active[0]==2 && s.owners[0].module==123);
    assert(mw_stock_hooks_retire(&s,1,123,7,1)==MW_HOOK_STATE);
    assert(mw_stock_hooks_begin(&s,4,999,1,1)==MW_HOOK_QUARANTINED);
    assert(mw_stock_hooks_observed(&s,1,4)==MW_HOOK_OWNER); /* no fabricated AB lease */
    assert(mw_stock_hooks_observed(&s,1,2)==MW_HOOK_STATE); /* no Matrix on core B */
    assert(mw_stock_hooks_observed(&s,1,1)==MW_HOOK_OK); /* independently read still enabled */
    assert(mw_stock_hooks_begin(&s,1,123,7,0)==MW_HOOK_PENDING);
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_PENDING);
    status[1]=1;
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_OK);
    assert(mw_stock_hooks_retire(&s,1,123,7,0)==MW_HOOK_STATE); /* DSP quiescence does not clear UI roots */
    assert(mw_stock_hooks_retire(&s,1,123,7,1)==MW_HOOK_OK);
    assert(s.owners[0].module==0 && s.active[0]==2 && s.active[1]==0);
    assert(mw_stock_hooks_begin(&s,1,123,7,1)==MW_HOOK_STATE); /* old state needs reset */
    assert(mw_stock_hooks_ready(&s,1)==MW_HOOK_OK);
    assert(mw_stock_hooks_begin(&s,1,123,9,1)==MW_HOOK_PENDING);
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_PENDING);
    status[0]=-1;
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_QUARANTINED);
    assert(s.inflight[1] && s.known==0);
    assert(mw_stock_hooks_observed(&s,1,1)==MW_HOOK_STATE); /* command still outstanding */
    assert(mw_stock_hooks_observed(&s,0,2)==MW_HOOK_OK);
    assert(mw_stock_hooks_busy(&s));
    status[1]=1;
    assert(mw_stock_hooks_tick(&s,&transport)==MW_HOOK_QUARANTINED);
    assert(!s.inflight[1] && s.active[1]==1);
    assert(mw_stock_hooks_observed(&s,0,2)==MW_HOOK_OK);
    assert(mw_stock_hooks_begin(&s,1,123,9,0)==MW_HOOK_PENDING);
    return 0;
}
