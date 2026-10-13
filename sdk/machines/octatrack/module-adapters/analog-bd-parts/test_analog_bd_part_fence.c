/* SPDX-License-Identifier: GPL-3.0-or-later
 * Authored synthetic Part fixtures, no firmware bytes or hardware callbacks. */
#include "analog_bd_part_fence.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define STRIDE 6322u
#define BANK0 0x400e21e0u
#define BANK_STRIDE 0x9b340u
struct fixture {
    uint8_t rows[136u+MW_AB_EXTRA_PARTS_MAX][STRIDE];
    uint32_t current;unsigned reads,failed_at,extras,extra_unknown,alias_reads;
    int failed_result,extra_result,extra_override;uint32_t extra_address;
};
static uint32_t address(unsigned row)
{
    if(row<128u)return BANK0+(row/8u)*BANK_STRIDE+(row%8u<4u?0x8ed80u:0x9504au)+(row%4u)*STRIDE;
    if(row<136u)return(row<132u?0x100a4eceu:0x100ab196u)+(row%4u)*STRIDE;
    return 0x47000000u+(row-136u)*0x10000u;
}
static int read_part(void *context,uint32_t at,uint8_t *out,unsigned bytes)
{
    struct fixture *f=context;++f->reads;assert(bytes>=1u && bytes<=4u);
    if(f->reads==f->failed_at){memset(out,0xff,bytes);return f->failed_result;}
    if(at==0x46c82456u){assert(bytes==4u);for(unsigned i=0;i<4u;++i)out[i]=(uint8_t)(f->current>>(24u-8u*i));return 1;}
    if(at>=0x48000000u && at<0x50000000u){at-=0x08000000u;++f->alias_reads;}
    for(unsigned row=0;row<136u+MW_AB_EXTRA_PARTS_MAX;++row){uint32_t base=address(row);
        if(at>=base && at-base<=STRIDE-bytes){memcpy(out,f->rows[row]+at-base,bytes);return 1;}}
    return 0;
}
static int extra_part(void *context,unsigned index,uint32_t *at)
{
    struct fixture *f=context;
    if(index==f->extra_unknown)return f->extra_result;
    if(index>=f->extras)return 0;
    *at=f->extra_override?f->extra_address:address(136u+index);return 1;
}
static void fresh(struct fixture *f)
{
    memset(f,0,sizeof *f);f->current=BANK0;f->failed_at=0xffffffffu;f->extra_unknown=0xffffffffu;
}
static void sign(struct fixture *f,unsigned row,unsigned track,unsigned type,unsigned revision)
{
    f->rows[row][0x22u+track]=(uint8_t)type;
    uint8_t *p=f->rows[row]+60u+30u*track;p[0]='A';p[1]='B';p[2]=(uint8_t)revision;
}
int main(void)
{
    struct fixture *f=calloc(1,sizeof *f);assert(f);
    struct mw_ab_part_reader reader={f,read_part,extra_part};unsigned cases=0;
    assert(mw_ab_part_fence(NULL)==MW_AB_PART_UNKNOWN);
    struct mw_ab_part_reader missing={f,NULL,extra_part};assert(mw_ab_part_fence(&missing)==MW_AB_PART_UNKNOWN);
    missing.read=read_part;missing.extra_part=NULL;assert(mw_ab_part_fence(&missing)==MW_AB_PART_UNKNOWN);
    for(unsigned alias=0;alias<2u;++alias)for(unsigned bank=0;bank<16u;++bank){
        fresh(f);f->current=BANK0+bank*BANK_STRIDE+(alias?0x08000000u:0);
        assert(mw_ab_part_fence(&reader)==MW_AB_PART_CLEAR && f->reads==2177u);
        assert(f->alias_reads==(alias?2048u:0));++cases;
        for(unsigned row=0;row<136u;++row)for(unsigned track=0;track<8u;++track){
            sign(f,row,track,1,1);f->reads=0;
            assert(mw_ab_part_fence(&reader)==MW_AB_PART_RETAINED);++cases;
            memset(f->rows[row]+60u+30u*track,0,3);f->rows[row][0x22u+track]=0;
        }
    }
    for(unsigned failure=1;failure<=2177u;++failure)for(int result=-1;result<=2;++result)if(result!=1){
        fresh(f);f->failed_at=failure;f->failed_result=result;assert(mw_ab_part_fence(&reader)==MW_AB_PART_UNKNOWN);++cases;
    }
    for(unsigned type=0;type<6u;++type)for(unsigned revision=0;revision<3u;++revision){
        fresh(f);sign(f,0,0,type,revision);assert(mw_ab_part_fence(&reader)==(type==1u && revision==1u?MW_AB_PART_RETAINED:MW_AB_PART_UNKNOWN));++cases;
    }
    for(uint32_t bad=0;bad<4u;++bad){fresh(f);f->current=bad==0?0:bad==1?BANK0+1u:bad==2?BANK0+16u*BANK_STRIDE:0x4c0e21e0u;assert(mw_ab_part_fence(&reader)==MW_AB_PART_UNKNOWN);++cases;}
    for(unsigned extra=0;extra<MW_AB_EXTRA_PARTS_MAX;++extra){
        fresh(f);f->extras=extra+1u;sign(f,136u+extra,7,1,1);assert(mw_ab_part_fence(&reader)==MW_AB_PART_RETAINED);++cases;
    }
    fresh(f);f->extras=MW_AB_EXTRA_PARTS_MAX;assert(mw_ab_part_fence(&reader)==MW_AB_PART_CLEAR);++cases;
    fresh(f);f->extras=MW_AB_EXTRA_PARTS_MAX+1u;assert(mw_ab_part_fence(&reader)==MW_AB_PART_UNKNOWN);++cases;
    for(int unknown=-1;unknown<=2;++unknown)if(unknown!=0 && unknown!=1){fresh(f);f->extra_unknown=0;f->extra_result=unknown;assert(mw_ab_part_fence(&reader)==MW_AB_PART_UNKNOWN);++cases;}
    const uint32_t invalid_extra[]={0,0x47000001u,0x47ffff00u,0x4fffffffu,0x100a4ecfu};
    for(unsigned i=0;i<sizeof invalid_extra/sizeof invalid_extra[0];++i){fresh(f);f->extras=1;f->extra_override=1;f->extra_address=invalid_extra[i];assert(mw_ab_part_fence(&reader)==MW_AB_PART_UNKNOWN);++cases;}
    fresh(f);f->extras=1;f->extra_override=1;f->extra_address=0x4f000000u;sign(f,136,7,1,1);assert(mw_ab_part_fence(&reader)==MW_AB_PART_RETAINED);++cases;
    fresh(f);f->rows[135][0x22u+7u]=255;assert(mw_ab_part_fence(&reader)==MW_AB_PART_UNKNOWN);++cases;
    free(f);printf("PASS conservative AB Part fence: %u synthetic layout/read/refusal cases; no board callback or generation proof\n",cases);
    return 0;
}
