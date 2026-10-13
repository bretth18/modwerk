/* SPDX-License-Identifier: GPL-3.0-or-later
 * Bounded per-frame initialization from the authored, checked .boot stream.
 * A controller generation is held before the first chunk until both reset and
 * CAS ACKs complete, or indefinitely in quarantine. No clock of its own. */
#include "stock_hook_driver.h"
static int byte(struct mw_hook_cursor *c,const struct mw_hook_boot_core *b,uint32_t *out) {
    if(c->bytes>=b->bytes) return 0;
    if(c->fragment>=b->fragment_count) return 0;
    const struct mw_hook_fragment *fragment=&b->fragments[c->fragment];
    if(c->fragment_bytes==fragment->bytes) {
        if(c->run || c->at!=fragment->end || ++c->fragment>=b->fragment_count) return 0;
        fragment=&b->fragments[c->fragment]; c->fragment_bytes=0; c->at=fragment->start;
    }
    if(!c->run) {
        if(c->at>=fragment->end) return 0;
        unsigned token=*c->at++;
        c->run=(uint16_t)((token&127u)+1u); c->zero=(uint8_t)(token>>7);
    }
    if(!c->zero && c->at>=fragment->end) return 0;
    *out=c->zero ? 0u : *c->at++;
    --c->run; ++c->bytes; ++c->fragment_bytes; return 1;
}
static int word(struct mw_hook_cursor *c,const struct mw_hook_boot_core *b,uint32_t *out) {
    uint32_t a,d,e;
    if(!byte(c,b,&a) || !byte(c,b,&d) || !byte(c,b,&e)) return 0;
    *out=a|(d<<8)|(e<<16); return 1;
}
/* One bounded chunk, never crossing a declared record. Skipped records are
 * still parsed and checked; neither a caller nor a module names DSP memory. */
static int next(struct mw_hook_cursor *c,const struct mw_hook_boot_core *b,unsigned feature) {
    unsigned budget=64; /* includes skipped features: bounded UI work per tick */
    c->count=0;
    while(c->record<b->record_count) {
        const struct mw_hook_record *r=&b->records[c->record];
        if(!c->header) {
            uint32_t space,address,count;
            if(!word(c,b,&space) || !word(c,b,&address) || !word(c,b,&count) ||
               space!=r->space || address!=r->address || count!=r->words || !count || count>4096u) return -1;
            c->header=1; c->word=0;
        }
        while(c->word<r->words) {
            uint32_t value;
            if(!word(c,b,&value)) return -1;
            ++c->word;
            if(r->owner==feature) {
                c->chunk[c->count++]=value;
                if(c->count==MW_HOOK_CHUNK || c->word==r->words) {
                    if(c->word==r->words) ++c->record,c->header=0;
                    return 1;
                }
            } else if(!--budget) {
                if(c->word==r->words) ++c->record,c->header=0;
                return 2;
            }
        }
        ++c->record; c->header=0;
    }
    if(c->bytes!=b->bytes || c->run || c->fragment+1!=b->fragment_count ||
       c->fragment_bytes!=b->fragments[c->fragment].bytes || c->at!=b->fragments[c->fragment].end) return -1;
    c->finished=1; return 0;
}
int mw_hook_driver_export_idle(const struct mw_hook_driver *d) {
    if(d->resetting || d->leases.phase || d->leases.known!=3u ||
       d->leases.inflight[0] || d->leases.inflight[1] ||
       (d->leases.active[0]&~7u) || (d->leases.active[1]&~5u) || (d->leases.ready&~7u)) return 0;
    unsigned active=d->leases.active[0]|d->leases.active[1]|d->leases.ready;
    for(unsigned k=0;k<3;++k) {
        const struct mw_hook_owner *owner=&d->leases.owners[k];
        if(!!owner->module!=!!owner->generation || ((active>>k&1u) && !owner->module)) return 0;
    }
    return 1;
}
void mw_hook_driver_init(struct mw_hook_driver *d,const struct mw_hook_boot_core boot[2]) {
    *d=(struct mw_hook_driver){0}; d->boot=boot; mw_stock_hooks_init(&d->leases);
}
int mw_hook_driver_begin(struct mw_hook_driver *d,unsigned feature,uint32_t module,uint32_t generation,int enable) {
    if(enable!=0 && enable!=1) return MW_HOOK_OWNER;
    if(!enable) return mw_stock_hooks_begin(&d->leases,feature,module,generation,0);
    int result=mw_stock_hooks_reset_begin(&d->leases,feature,module,generation);
    if(result!=MW_HOOK_PENDING) return result;
    d->module=module; d->generation=generation; d->resetting=1;
    for(unsigned c=0;c<2;++c) d->cursors[c]=(struct mw_hook_cursor){.at=d->boot[c].fragments[0].start};
    return MW_HOOK_PENDING;
}
int mw_hook_driver_tick(struct mw_hook_driver *d,const struct mw_hook_driver_transport *t) {
    struct mw_stock_hooks *s=&d->leases;
    if(s->phase==2) { d->resetting=0; return mw_stock_hooks_tick(s,&t->cas); }
    if(!d->resetting) return mw_stock_hooks_tick(s,&t->cas);
    for(unsigned core=0;core<2;++core) {
        struct mw_hook_cursor *c=&d->cursors[core];
        if(s->done[core]) continue;
        if(s->inflight[core]) {
            int status=t->cas.status(core);
            if(!status) continue;
            t->cas.release(core); s->inflight[core]=0;
            if(status!=1) return mw_stock_hooks_reset_done(s,core,0);
            c->logical+=c->submitted; c->submitted=0;
        }
        if(!t->resources_idle(s->feature)) continue;
        if(!c->count) {
            int result=next(c,&d->boot[core],s->feature);
            if(result<0) return mw_stock_hooks_reset_done(s,core,0);
            if(result==2) continue;
            if(!result) {
                int done=mw_stock_hooks_reset_done(s,core,1);
                if(done==MW_HOOK_OK) {
                    d->resetting=0;
                    return mw_stock_hooks_begin(s,s->feature,d->module,d->generation,1);
                }
                continue;
            }
        }
        if(t->reset_start(core,s->feature,c->logical,c->count,c->chunk)) {
            c->submitted=c->count; c->count=0; s->inflight[core]=1;
        }
    }
    return MW_HOOK_PENDING;
}
int mw_hook_driver_retire(struct mw_hook_driver *d,unsigned feature,uint32_t module,uint32_t generation,int roots_clear) {
    return mw_stock_hooks_retire(&d->leases,feature,module,generation,roots_clear);
}
