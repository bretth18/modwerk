/* SPDX-License-Identifier: GPL-3.0-or-later
 * Private controller leases for permanent stock-DSP hooks. Neither a rejected
 * packet nor a missing ACK permits freeing a controller or its formatter/page
 * roots. This state machine is independent of catalogue admission. */
#include "stock_hooks.h"
static unsigned index_of(unsigned feature) {
    return feature==MW_HOOK_SIDECHAIN ? 0 : feature==MW_HOOK_MATRIX ? 1 : feature==MW_HOOK_ANALOG_BD ? 2 : 3;
}
static unsigned cores(unsigned feature) { return feature==MW_HOOK_MATRIX ? 1u : 3u; }
static unsigned allowed(unsigned core) { return core ? 5u : 7u; }
void mw_stock_hooks_init(struct mw_stock_hooks *s) {
    *s=(struct mw_stock_hooks){0};
    s->known=3; /* trusted boot upload contains dormant stubs, not a reconnect reset */
}
int mw_stock_hooks_busy(const struct mw_stock_hooks *s) { return s->phase!=0; }
int mw_stock_hooks_ready(struct mw_stock_hooks *s,unsigned feature) {
    if(index_of(feature)>2 || s->phase || s->known!=3 || (s->active[0]|s->active[1])&feature)
        return MW_HOOK_STATE;
    s->ready|=(uint8_t)feature;
    return MW_HOOK_OK;
}
int mw_stock_hooks_reset_begin(struct mw_stock_hooks *s,unsigned feature,uint32_t module,uint32_t generation) {
    unsigned k=index_of(feature);
    if(k>2 || !module || !generation) return MW_HOOK_OWNER;
    if(s->phase==2 || s->known!=3) return MW_HOOK_QUARANTINED;
    if(s->phase) return MW_HOOK_BUSY;
    if((s->active[0]|s->active[1])&feature) return MW_HOOK_STATE;
    if(s->owners[k].module && (s->owners[k].module!=module || s->owners[k].generation!=generation)) return MW_HOOK_OWNER;
    s->owners[k]=(struct mw_hook_owner){module,generation};
    s->phase=3; s->feature=(uint8_t)feature; s->ready&=(uint8_t)~feature;
    for(unsigned c=0;c<2;++c) {
        s->expected[c]=s->desired[c]=s->active[c];
        s->done[c]=(uint8_t)(!(cores(feature)&(1u<<c))); s->inflight[c]=0;
    }
    return MW_HOOK_PENDING;
}
int mw_stock_hooks_reset_done(struct mw_stock_hooks *s,unsigned core,int okay) {
    if(s->phase!=3 || core>1 || s->done[core] || s->inflight[core]) return MW_HOOK_STATE;
    if(!okay) {
        s->known&=(uint8_t)~(1u<<core);
        for(unsigned c=0;c<2;++c) if(s->inflight[c]) s->known&=(uint8_t)~(1u<<c);
        s->phase=2; return MW_HOOK_QUARANTINED;
    }
    s->done[core]=1;
    if(s->done[0] && s->done[1]) { s->ready|=s->feature; s->phase=0; return MW_HOOK_OK; }
    return MW_HOOK_PENDING;
}
int mw_stock_hooks_begin(struct mw_stock_hooks *s,unsigned feature,uint32_t module,uint32_t generation,int enable) {
    unsigned k=index_of(feature);
    if(k>2 || !module || !generation || (enable!=0 && enable!=1)) return MW_HOOK_OWNER;
    if(s->phase==2 || s->known!=3) return MW_HOOK_QUARANTINED;
    if(s->phase) return MW_HOOK_BUSY;
    struct mw_hook_owner *owner=&s->owners[k];
    if(owner->module && (owner->module!=module || owner->generation!=generation)) return MW_HOOK_OWNER;
    if(enable && !(s->ready&feature)) return MW_HOOK_STATE;
    if(!enable && !owner->module) return MW_HOOK_OWNER;
    if(!owner->module) *owner=(struct mw_hook_owner){module,generation};
    s->feature=(uint8_t)feature; s->enabling=(uint8_t)enable; s->phase=1;
    unsigned required=cores(feature);
    for(unsigned c=0;c<2;++c) {
        s->expected[c]=s->active[c];
        s->desired[c]=(uint8_t)(enable ? s->active[c]|feature : s->active[c]&~feature);
        s->done[c]=(uint8_t)(!(required&(1u<<c)) || s->desired[c]==s->active[c]);
        s->inflight[c]=0;
    }
    return MW_HOOK_PENDING;
}
int mw_stock_hooks_tick(struct mw_stock_hooks *s,const struct mw_hook_transport *t) {
    if(s->phase==2) {
        for(unsigned c=0;c<2;++c) if(s->inflight[c]) {
            int status=t->status(c);
            if(status==0) continue;
            t->release(c); s->inflight[c]=0;
            if(status==1) { s->active[c]=s->desired[c]; s->known|=(uint8_t)(1u<<c); }
        }
        return MW_HOOK_QUARANTINED;
    }
    if(!s->phase) return MW_HOOK_OK;
    if(s->phase==3) return MW_HOOK_PENDING; /* reset driver, never a CAS shortcut */
    for(unsigned c=0;c<2;++c) {
        if(s->done[c]) continue;
        if(s->inflight[c]) {
            int status=t->status(c);
            if(status==0) continue;
            t->release(c); s->inflight[c]=0;
            if(status!=1) {
                s->known&=(uint8_t)~(1u<<c);
                for(unsigned pending=0;pending<2;++pending)
                    if(s->inflight[pending]) s->known&=(uint8_t)~(1u<<pending);
                s->phase=2;
                return MW_HOOK_QUARANTINED;
            }
            s->active[c]=s->desired[c]; s->done[c]=1;
        } else if(t->start(c,s->expected[c],s->desired[c])) s->inflight[c]=1;
    }
    if(!s->done[0] || !s->done[1]) return MW_HOOK_PENDING;
    if(!s->enabling) s->ready&=(uint8_t)~s->feature; /* next activation requires a real reset */
    s->phase=0;
    return MW_HOOK_OK;
}
int mw_stock_hooks_observed(struct mw_stock_hooks *s,unsigned core,unsigned mask) {
    if(s->phase!=2 || core>1 || mask&~allowed(core) || s->inflight[core]) return MW_HOOK_STATE;
    /* A readback cannot manufacture an owner for a code path nobody leases. */
    for(unsigned k=0;k<3;++k) if((mask&(1u<<k)) && !s->owners[k].module) return MW_HOOK_OWNER;
    s->active[core]=(uint8_t)mask; s->known|=(uint8_t)(1u<<core);
    if(s->known==3 && !s->inflight[0] && !s->inflight[1]) {
        s->phase=0; s->ready&=(uint8_t)~s->feature;
    }
    return MW_HOOK_OK;
}
int mw_stock_hooks_retire(struct mw_stock_hooks *s,unsigned feature,uint32_t module,uint32_t generation,int roots_clear) {
    unsigned k=index_of(feature);
    if(k>2 || !module || !generation || s->owners[k].module!=module || s->owners[k].generation!=generation)
        return MW_HOOK_OWNER;
    if(!roots_clear || s->phase || s->known!=3 || (s->active[0]|s->active[1])&feature) return MW_HOOK_STATE;
    s->owners[k]=(struct mw_hook_owner){0}; s->ready&=(uint8_t)~feature;
    return MW_HOOK_OK;
}
