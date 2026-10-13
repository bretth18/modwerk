/* SPDX-License-Identifier: GPL-3.0-or-later
 * Private native fixture only. Original entry registers are authored synthetic
 * memory here, never an actual backend snapshot or production completeness.
 */
#include "part_roots.h"
#define STATE ((struct mw_ab_part_roots *)0x47010000u)
#define REPORT ((volatile uint32_t *)0x47020000u)
static int read_word(void *context,uint32_t at,uint8_t *out,unsigned n)
{
    (void)context;
    const volatile uint8_t *source=(const volatile uint8_t *)(uintptr_t)at;
    for(unsigned i=0;i<n;++i)out[i]=source[i];
    return 1;
}
static int entry(void *context,unsigned index,uint32_t *out)
{(void)context;*out=((const volatile uint32_t *)0x47001000u)[index];return 1;}
int roots_begin(void)
{
    const struct mw_ab_root_reader reader={0,read_word,entry};
    const struct mw_ab_root_extent owned[2]={{0x47080000u,4096u},{0x47082000u,2048u}};
    return mw_ab_part_roots_begin(STATE,&reader,owned);
}
int roots_step(void){return mw_ab_part_roots_step(STATE);}
void roots_report(void)
{
    REPORT[0]=STATE->status;REPORT[1]=STATE->last_reads;REPORT[2]=STATE->total_reads;
    REPORT[3]=STATE->retained;REPORT[4]=STATE->part_count;
    uint32_t value=0;REPORT[5]=(uint32_t)mw_ab_part_roots_extra(STATE,STATE->part_count,&value);
}
/* Authored bounded compiler support, avoiding any stock/library substitution. */
void *memset(void *out,int value,unsigned long n)
{volatile unsigned char *p=out;for(unsigned long i=0;i<n;++i)p[i]=(unsigned char)value;return out;}
void *memcpy(void *out,const void *in,unsigned long n)
{
    volatile unsigned char *p=out;
    const volatile unsigned char *q=in;
    for(unsigned long i=0;i<n;++i)p[i]=q[i];
    return out;
}
