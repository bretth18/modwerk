/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "stock_hook_resources.h"
#include "buffers.h"
#include <assert.h>
#include <string.h>
static struct mw_stock_hooks leases;
static struct mw_hook_buffer_claim claims[MODWERK_FX_IDS];
int modwerk_dsp_buffer_permitted(unsigned c,unsigned k,unsigned b,unsigned id) {
    return id<MODWERK_FX_IDS && mw_hook_buffer_permitted(&leases,c,k,b,&claims[id]);
}
static void start(struct dl_buffers *b,unsigned map,uint8_t running[16],uint8_t ids[16],uint8_t reads[MODWERK_FX_IDS]) {
    mw_stock_hooks_init(&leases); dl_buffers_init(b,map);
    memset(running,0,16); memset(ids,0,16); memset(reads,0,MODWERK_FX_IDS);
    memset(claims,0,sizeof claims);
    claims[32]=(struct mw_hook_buffer_claim){16384u,1,0}; reads[32]=1; /* exact full-ring claim, no head shadow */
    claims[33]=(struct mw_hook_buffer_claim){16384u,1,1}; reads[33]=1; /* independently proved head shadow */
}
static void commit(struct dl_buffers *b) {
    uint32_t value; int index;
    while((index=dl_buffers_next(b,&value))>=0) dl_buffers_written(b,(unsigned)index);
    dl_buffers_retire(b);
}
static int no_start(unsigned c,unsigned a,unsigned b) { (void)c;(void)a;(void)b;return 0; }
static int no_status(unsigned c) { (void)c;return -2; }
static void no_release(unsigned c) { (void)c; }
int main(void) {
    struct dl_buffers b; uint8_t running[16],ids[16],reads[MODWERK_FX_IDS];
    for(unsigned core=0;core<2;++core) for(unsigned map=0;map<2;++map) {
        start(&b,map,running,ids,reads); unsigned first=core ? 8u : 12u,capacity=map ? 2u : 3u;
        for(unsigned n=0;n<capacity;++n) ids[first+n]=32;
        assert(dl_buffers_prepare(&b,running,ids,reads)==DL_BUF_OK);
        for(unsigned n=0;n<capacity;++n) assert(b.target[first+n]!=2 && (!map || b.target[first+n]!=1));
        commit(&b); memcpy(running,ids,16);
        ids[first+capacity]=32;
        assert(dl_buffers_prepare(&b,running,ids,reads)==DL_BUF_MEMORY && !b.open);
        /* Removing an outgoing instance does not free its ring before ACKed retirement. */
        ids[first]=0;
        assert(dl_buffers_prepare(&b,running,ids,reads)==DL_BUF_MEMORY && !b.open);
        ids[first+capacity]=0;
        assert(dl_buffers_prepare(&b,running,ids,reads)==DL_BUF_OK); commit(&b); memcpy(running,ids,16);
        ids[first+capacity]=32;
        assert(dl_buffers_prepare(&b,running,ids,reads)==DL_BUF_OK); commit(&b);
    }
    start(&b,0,running,ids,reads);
    for(unsigned i=8;i<16;++i) ids[i]=33;
    assert(dl_buffers_prepare(&b,running,ids,reads)==DL_BUF_OK); commit(&b); memcpy(running,ids,16);
    assert(b.live[10]==2 && b.live[14]==2);
    assert(mw_stock_hooks_reset_begin(&leases,1,17,23)==MW_HOOK_PENDING);
    assert(dl_buffers_prepare(&b,running,ids,reads)==DL_BUF_MEMORY && !b.open); /* retained blocks are checked too */
    assert(mw_stock_hooks_reset_done(&leases,0,1)==MW_HOOK_PENDING);
    assert(mw_stock_hooks_reset_done(&leases,1,1)==MW_HOOK_OK);
    assert(mw_stock_hooks_begin(&leases,1,17,23,0)==MW_HOOK_PENDING);
    const struct mw_hook_transport t={no_start,no_status,no_release};
    assert(mw_stock_hooks_tick(&leases,&t)==MW_HOOK_OK);
    assert(!leases.active[0] && !leases.active[1]);
    assert(dl_buffers_prepare(&b,running,ids,reads)==DL_BUF_MEMORY); /* ACK alone does not relinquish ownership */
    assert(mw_stock_hooks_retire(&leases,1,17,23,0)==MW_HOOK_STATE);
    assert(mw_stock_hooks_retire(&leases,1,17,24,1)==MW_HOOK_OWNER);
    assert(mw_stock_hooks_retire(&leases,1,17,23,1)==MW_HOOK_OK);
    assert(dl_buffers_prepare(&b,running,ids,reads)==DL_BUF_OK); dl_buffers_cancel(&b);
    claims[33].complete=0;
    assert(dl_buffers_prepare(&b,running,ids,reads)==DL_BUF_MEMORY);
    struct mw_hook_span span={0x33dfe,1,1,MW_HOOK_X};
    assert(!mw_hook_ranges_idle(1,&span,1,0,0,3)); /* shared alias, other core and memory space */
    assert(!mw_hook_ranges_idle(1,0,0,&span,1,3)); /* pending init is equally held */
    span=(struct mw_hook_span){0x3bdfe,1,0,MW_HOOK_P}; assert(!mw_hook_ranges_idle(1,&span,1,0,0,3));
    span=(struct mw_hook_span){0x7f0,1,1,MW_HOOK_Y}; assert(!mw_hook_ranges_idle(1,&span,1,0,0,3));
    span=(struct mw_hook_span){0xc00,0xc1,1,MW_HOOK_Y}; assert(mw_hook_ranges_idle(2,&span,1,0,0,3));
    span.core=0; assert(!mw_hook_ranges_idle(2,&span,1,0,0,3));
    span=(struct mw_hook_span){0x2840,0xec0,0,MW_HOOK_Y}; assert(mw_hook_ranges_idle(4,&span,1,0,0,3));
    span.space=MW_HOOK_X; assert(!mw_hook_ranges_idle(4,&span,1,0,0,3));
    span.core=1; assert(!mw_hook_ranges_idle(4,&span,1,0,0,3));
    span=(struct mw_hook_span){0x4000,16384,0,MW_HOOK_Y}; assert(mw_hook_ranges_idle(1,&span,1,0,0,3));
    assert(!mw_hook_ranges_idle(1,&span,1,0,0,1)); /* incomplete second-core ledger */
    span.address=0x3ffff; span.words=2; assert(!mw_hook_ranges_idle(1,&span,1,0,0,3));
    span.address=0x2ffff; assert(!mw_hook_ranges_idle(1,&span,1,0,0,3));
    assert(!mw_hook_ranges_idle(3,0,0,0,0,3));
    return 0;
}
