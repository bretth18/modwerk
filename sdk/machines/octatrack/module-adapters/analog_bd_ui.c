/* SPDX-License-Identifier: MIT */
/* Stock-free 1.40C semantic preparation. Closing the engine window leaves
 * handler/label arrays retained. Snapshot restoration is planned only after
 * exact current and paused consumers are clear; this file performs no writes. */
#include "analog_bd_ui.h"
#include <stddef.h>
static uint32_t be32(const uint8_t *p)
{ return (uint32_t)p[0]<<24|(uint32_t)p[1]<<16|(uint32_t)p[2]<<8|p[3]; }
static uint32_t physical(uint32_t p)
{ return p>=0x48000400u&&p<0x4ff00000u?p-0x08000000u:p; }
static int equal(const uint8_t *a,const uint8_t *b,unsigned n)
{ for(unsigned i=0;i<n;i++)if(a[i]!=b[i])return 0;return 1; }
static void copy(uint8_t *out,const uint8_t *in,unsigned n)
{ for(unsigned i=0;i<n;i++)out[i]=in[i]; }
static int nonzero(const uint8_t *p,unsigned n)
{ for(unsigned i=0;i<n;i++)if(p[i])return 1;return 0; }
static int valid(const struct ab_ui_identity *i)
{
    if(!i || !nonzero(i->package_sha256,32) || !nonzero(i->source_sha256,32) || !i->generation ||
       i->layout_revision!=1 || !i->image_bytes || i->image_bytes>RUNTIME_IMAGE_BYTES) return 0;
    uint32_t lo=physical(i->image_lo);
    if(lo<0x40000400u || lo>=0x47f00000u || i->image_bytes>0x47f00000u-lo ||
       (i->handlers_offset&1u) || (i->labels_offset&1u) || i->image_bytes<8u ||
       i->handlers_offset>i->image_bytes-8u || i->labels_offset>i->image_bytes-8u ||
       (i->handlers_offset<i->labels_offset+8u && i->labels_offset<i->handlers_offset+8u)) return 0;
    return 1;
}
static int same(const struct ab_ui_identity *a,const struct ab_ui_identity *b)
{
    return valid(a)&&valid(b)&&equal(a->package_sha256,b->package_sha256,32)&&
        equal(a->source_sha256,b->source_sha256,32)&&a->generation==b->generation&&
        a->image_lo==b->image_lo&&a->image_bytes==b->image_bytes&&
        a->handlers_offset==b->handlers_offset&&a->labels_offset==b->labels_offset&&
        a->layout_revision==b->layout_revision;
}
static int held(uint32_t value,const struct ab_ui_identity *i)
{
    value=physical(value);uint32_t lo=physical(i->image_lo);
    return (value>=lo&&value<lo+i->image_bytes) ||
        (value>=0x4006d754u&&value<0x4006d94au) ||
        (value>=0x40020c28u&&value<0x40020c3au) ||
        (value>=AB_UI_ROOT_ADDRESS&&value<AB_UI_ROOT_ADDRESS+AB_UI_ROOT_BYTES);
}
static int baseline_roots(const uint8_t *value)
{
    uint32_t handlers=be32(value),labels=be32(value+4);
    /* A previous dynamic owner's arrays or destination cannot be assumed
     * durable. Only absent or immutable stock arrays are preserved here;
     * unknown pairs and a retained selection destination fail closed. */
    if(be32(value+8) || be32(value+12) || (!handlers)!=(!labels)) return 0;
    if(!handlers) return 1;
    return !(handlers&1u) && !(labels&1u) && handlers>=0x40000400u &&
        labels>=0x40000400u && handlers<=0x400e21d8u && labels<=0x400e21d8u;
}
int ab_ui_snapshot_capture(const struct ab_ui_identity *identity,machine_memory_read read,void *context,struct ab_ui_snapshot *out)
{
    if(!out) return RUNTIME_MALFORMED;
    out->captured=0;
    if(!valid(identity)||!read) return RUNTIME_MALFORMED;
    uint8_t value[AB_UI_ROOT_BYTES];
    if(!read(context,AB_UI_ROOT_ADDRESS,value,sizeof value)) return RUNTIME_MALFORMED;
    if(!baseline_roots(value)) return RUNTIME_IN_USE;
    for(unsigned n=0;n<sizeof value;n+=4) if(held(be32(value+n),identity)) return RUNTIME_IN_USE;
    if(machine_ui_lifetime(read,context,identity->image_lo,identity->image_lo+identity->image_bytes)!=MACHINE_CLEAR)
        return RUNTIME_IN_USE;
    copy((uint8_t *)&out->identity,(const uint8_t *)identity,sizeof *identity);
    copy(out->preinstall,value,sizeof value);out->captured=1;
    return RUNTIME_OK;
}
int ab_ui_retirement_plan(const struct ab_ui_snapshot *snapshot,const struct ab_ui_identity *identity,
    machine_memory_read read,void *context,const struct runtime_span *span,unsigned count,struct ab_ui_restore_plan *out)
{
    if(!out) return RUNTIME_MALFORMED;
    out->needs_restore=0;out->generation=0;
    if(!snapshot||snapshot->captured!=1||!same(&snapshot->identity,identity)||!read||
       (count&&!span)||count>RUNTIME_PAUSED) return RUNTIME_MALFORMED;
    if(!baseline_roots(snapshot->preinstall)) return RUNTIME_MALFORMED;
    for(unsigned n=0;n<AB_UI_ROOT_BYTES;n+=4)
        if(held(be32(snapshot->preinstall+n),identity)) return RUNTIME_MALFORMED;
    uint8_t value[AB_UI_ROOT_BYTES];
    if(!read(context,AB_UI_ROOT_ADDRESS,value,sizeof value)) return RUNTIME_MALFORMED;
    if(be32(value+8)) return RUNTIME_IN_USE;
    int baseline=equal(value,snapshot->preinstall,sizeof value);
    if(!baseline) {
        uint32_t lo=physical(identity->image_lo);
        if(physical(be32(value))!=lo+identity->handlers_offset ||
           physical(be32(value+4))!=lo+identity->labels_offset || be32(value+12) ||
           be32(value+16)>1u || be32(value+20)>1u || be32(value+24)>1u ||
           be32(value+28)!=6u || be32(value+32)!=2u) return RUNTIME_IN_USE;
    }
    if(machine_ui_lifetime(read,context,identity->image_lo,identity->image_lo+identity->image_bytes)!=MACHINE_CLEAR ||
       machine_ui_lifetime(read,context,0x4006d754u,0x4006d94au)!=MACHINE_CLEAR ||
       machine_ui_lifetime(read,context,0x40020c28u,0x40020c3au)!=MACHINE_CLEAR) return RUNTIME_IN_USE;
    for(unsigned n=0;n<count;n++) {
        uintptr_t from=(uintptr_t)span[n].from,to=(uintptr_t)span[n].to;
        if(from>to || to-from>0x10000u) return RUNTIME_IN_USE;
        for(const uint8_t *p=span[n].from;to-(uintptr_t)p>=4u;p+=2)
            if(held(be32(p),identity)) return RUNTIME_IN_USE;
    }
    copy(out->observed,value,sizeof value);copy(out->restore,snapshot->preinstall,sizeof value);
    out->generation=identity->generation;out->needs_restore=!baseline;
    return RUNTIME_OK;
}
