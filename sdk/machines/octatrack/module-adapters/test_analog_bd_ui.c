/* SPDX-License-Identifier: MIT */
#include "analog_bd_ui.h"
#include <assert.h>
#include <string.h>
static uint8_t roots[AB_UI_ROOT_BYTES],paused[68];
static uint32_t cached;
static int unavailable;
static void word(uint8_t *p,uint32_t value)
{ p[0]=(uint8_t)(value>>24);p[1]=(uint8_t)(value>>16);p[2]=(uint8_t)(value>>8);p[3]=(uint8_t)value; }
static int read_memory(void *context,uint32_t at,void *out,uint32_t n)
{
    (void)context;
    if(unavailable) return 0;
    if(at==AB_UI_ROOT_ADDRESS&&n==sizeof roots) {memcpy(out,roots,n);return 1;}
    if(at<0x40000400u || at>=0x47f00000u || n>0x47f00000u-at) return 0;
    memset(out,0,n);
    if(at<=0x46c7d8deu&&at+n>=0x46c7d8e2u) word((uint8_t *)out+0x46c7d8deu-at,cached);
    return 1;
}
int main(void)
{
    struct ab_ui_identity identity={0};
    memset(identity.package_sha256,1,32);memset(identity.source_sha256,2,32);
    identity.generation=7;identity.image_lo=0x47080000;identity.image_bytes=16000;
    identity.handlers_offset=100;identity.labels_offset=200;identity.layout_revision=1;
    word(roots,0x400b2000);word(roots+4,0x400b3000);
    struct ab_ui_snapshot snapshot;struct ab_ui_restore_plan plan;
    struct runtime_span span={paused,paused+sizeof paused};
    assert(ab_ui_snapshot_capture(&identity,read_memory,0,&snapshot)==RUNTIME_OK);
    assert(ab_ui_retirement_plan(&snapshot,&identity,read_memory,0,&span,1,&plan)==RUNTIME_OK&&!plan.needs_restore);
    uint8_t baseline[sizeof roots];memcpy(baseline,roots,sizeof roots);
    for(unsigned alias=0;alias<=0x08000000u;alias+=0x08000000u) {
        word(roots,identity.image_lo+identity.handlers_offset+alias);
        word(roots+4,identity.image_lo+identity.labels_offset+alias);
        word(roots+16,0);word(roots+20,1);word(roots+24,1);word(roots+28,6);word(roots+32,2);
        assert(ab_ui_retirement_plan(&snapshot,&identity,read_memory,0,&span,1,&plan)==RUNTIME_OK&&plan.needs_restore);
        assert(!memcmp(plan.observed,roots,sizeof roots)&&!memcmp(plan.restore,baseline,sizeof roots)&&plan.generation==7);
        const uint32_t holds[]={identity.image_lo,identity.image_lo+identity.image_bytes-1,
            0x4006d908,0x4006d754,0x40020c34,AB_UI_ROOT_ADDRESS};
        for(unsigned i=0;i<sizeof holds/sizeof *holds;i++) {
            word(paused+2,holds[i]+(i<2?alias:0));
            assert(ab_ui_retirement_plan(&snapshot,&identity,read_memory,0,&span,1,&plan)==RUNTIME_IN_USE&&!plan.needs_restore);
            memset(paused,0,sizeof paused);
        }
        cached=identity.image_lo+64+alias;
        assert(ab_ui_retirement_plan(&snapshot,&identity,read_memory,0,&span,1,&plan)==RUNTIME_IN_USE);cached=0;
        word(roots+8,0x46c7d34c);
        assert(ab_ui_retirement_plan(&snapshot,&identity,read_memory,0,&span,1,&plan)==RUNTIME_IN_USE);word(roots+8,0);
        word(roots,0x400b4000); /* a subsequently reused stock menu must survive */
        uint8_t before[sizeof roots];memcpy(before,roots,sizeof roots);
        assert(ab_ui_retirement_plan(&snapshot,&identity,read_memory,0,&span,1,&plan)==RUNTIME_IN_USE);
        assert(!memcmp(before,roots,sizeof roots));
    }
    memcpy(roots,baseline,sizeof roots);
    struct ab_ui_identity changed=identity;changed.generation++;
    assert(ab_ui_retirement_plan(&snapshot,&changed,read_memory,0,&span,1,&plan)==RUNTIME_MALFORMED);
    changed=identity;changed.package_sha256[0]^=1;
    assert(ab_ui_retirement_plan(&snapshot,&changed,read_memory,0,&span,1,&plan)==RUNTIME_MALFORMED);
    changed=identity;changed.source_sha256[0]^=1;
    assert(ab_ui_retirement_plan(&snapshot,&changed,read_memory,0,&span,1,&plan)==RUNTIME_MALFORMED);
    changed=identity;changed.layout_revision=2;
    assert(ab_ui_retirement_plan(&snapshot,&changed,read_memory,0,&span,1,&plan)==RUNTIME_MALFORMED);
    unavailable=1;
    assert(ab_ui_retirement_plan(&snapshot,&identity,read_memory,0,&span,1,&plan)==RUNTIME_MALFORMED);
    assert(ab_ui_snapshot_capture(&identity,read_memory,0,&snapshot)==RUNTIME_MALFORMED&&!snapshot.captured);
    unavailable=0;identity.image_lo=0xfffffff0;
    assert(ab_ui_snapshot_capture(&identity,read_memory,0,&snapshot)==RUNTIME_MALFORMED);
    identity.image_lo=0x47080000;word(roots,0x47040000);
    assert(ab_ui_snapshot_capture(&identity,read_memory,0,&snapshot)==RUNTIME_IN_USE);
    memcpy(roots,baseline,sizeof roots);word(roots+12,0x46000000);
    assert(ab_ui_snapshot_capture(&identity,read_memory,0,&snapshot)==RUNTIME_IN_USE);
    memcpy(roots,baseline,sizeof roots);word(roots+4,0);
    assert(ab_ui_snapshot_capture(&identity,read_memory,0,&snapshot)==RUNTIME_IN_USE);
    return 0;
}
