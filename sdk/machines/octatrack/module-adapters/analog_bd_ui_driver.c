/* SPDX-License-Identifier: MIT */
/* Private native fixture only: identities below are synthetic helper inputs,
 * never controller association, real board generations or admission proof. */
#include "analog_bd_ui.h"
static struct ab_ui_identity identity;
static struct ab_ui_snapshot snapshot;
struct ab_ui_restore_plan native_plan;
uint8_t native_paused[256];
static int target(void *context,uint32_t address,void *out,uint32_t length)
{
    (void)context;
    const volatile uint8_t *in=(const volatile uint8_t *)(uintptr_t)address;uint8_t *p=out;
    for(uint32_t i=0;i<length;i++)p[i]=in[i];
    return 1;
}
int native_capture(uint32_t lo,uint32_t bytes,uint32_t handlers,uint32_t labels)
{
    for(unsigned i=0;i<32;i++) {identity.package_sha256[i]=1;identity.source_sha256[i]=2;}
    identity.generation=7;identity.image_lo=lo;identity.image_bytes=bytes;
    identity.handlers_offset=handlers;identity.labels_offset=labels;identity.layout_revision=1;
    return ab_ui_snapshot_capture(&identity,target,0,&snapshot);
}
int native_retirement(unsigned paused)
{
    const struct runtime_span span={native_paused,native_paused+sizeof native_paused};
    return ab_ui_retirement_plan(&snapshot,&identity,target,0,&span,paused,&native_plan);
}
