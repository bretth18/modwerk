/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "stock_hook_resources.h"
static const uint32_t fx1[4]={0x1000u,0x1c00u,0x2800u,0x3400u};
static const uint32_t fx2[2][4]={{0x4000u,0x8000u,0x30000u,0x34000u},
                                {0x4000u,0x8000u,0x38000u,0x3c000u}};
unsigned mw_stock_hooks_held(const struct mw_stock_hooks *s) {
    if(!s || s->known!=3u || s->phase>3u) return 7u;
    unsigned held=0;
    for(unsigned k=0;k<3;++k) {
        if(!!s->owners[k].module!=!!s->owners[k].generation) return 7u; /* corrupt token stays reserved */
        if(s->owners[k].module) held|=1u<<k;
    }
    return held;
}
static int valid(const struct mw_hook_span *r) {
    if(r->core>1 || r->space>2 || !r->words || r->address>=0x40000u || r->words>0x40000u-r->address) return 0;
    /* A span cannot straddle private memory and the physical shared aliases. */
    return !(r->address<0x30000u && r->address+r->words>0x30000u);
}
static int intersects(const struct mw_hook_span *a,const struct mw_hook_span *b) {
    int shared=a->address>=0x30000u && b->address>=0x30000u;
    return (shared || (a->core==b->core && a->space==b->space)) &&
           a->address<b->address+b->words && b->address<a->address+a->words;
}
static int meets(unsigned feature,const struct mw_hook_span *r) {
    for(unsigned c=0;c<2;++c) {
        struct mw_hook_span owned={0x7f0u,0x210u,(uint8_t)c,MW_HOOK_Y};
        if(feature&MW_HOOK_SIDECHAIN) {
            if(intersects(r,&owned)) return 1;
            owned.address=c ? 0x3bdfeu : 0x33dfeu; owned.words=0x202u;
            if(intersects(r,&owned)) return 1;
        }
        owned=(struct mw_hook_span){0x2840u,0xec0u,(uint8_t)c,MW_HOOK_X};
        if((feature&MW_HOOK_ANALOG_BD) && intersects(r,&owned)) return 1;
    }
    struct mw_hook_span matrix={0xc00u,0xc1u,0,MW_HOOK_Y};
    return (feature&MW_HOOK_MATRIX) && intersects(r,&matrix);
}
int mw_hook_buffer_permitted(const struct mw_stock_hooks *s,unsigned core,unsigned kind,unsigned block,
                             const struct mw_hook_buffer_claim *claim) {
    if(!s || core>1 || kind>1 || block>3 || !claim || claim->complete!=1 || claim->head_safe>1 ||
       !claim->words || claim->words>(kind ? 16384u : 3072u)) return 0;
    struct mw_hook_span span={kind ? fx2[core][block] : fx1[block],claim->words,(uint8_t)core,MW_HOOK_Y};
    /* T7's staging / T3's mailbox are live stock tenants even with no hook.
     * A source-proved shadow or excluded-prefix footprint is required. */
    if(kind && block==2 && !claim->head_safe) return 0;
    /* The reservation begins before reset, survives disable ACK, and ends
     * only when the exact generation's foreign-root retirement succeeded. */
    return !meets(mw_stock_hooks_held(s),&span);
}
int mw_hook_ranges_idle(unsigned feature,const struct mw_hook_span *live,unsigned live_count,
                        const struct mw_hook_span *target,unsigned target_count,unsigned complete_cores) {
    if((feature!=1u && feature!=2u && feature!=4u) || complete_cores!=3u ||
       live_count>128u || target_count>128u || (!live && live_count) || (!target && target_count)) return 0;
    for(unsigned n=0;n<live_count;++n) if(!valid(&live[n]) || meets(feature,&live[n])) return 0;
    for(unsigned n=0;n<target_count;++n) if(!valid(&target[n]) || meets(feature,&target[n])) return 0;
    return 1;
}
