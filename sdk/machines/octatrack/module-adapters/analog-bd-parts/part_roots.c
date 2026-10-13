/* SPDX-License-Identifier: GPL-3.0-or-later
 * Authored bounded preparation, derived from reviewed runtime/context source
 * checkpoints listed in README. It deliberately has no semantic-complete end.
 */
#include "part_roots.h"
#define BANK0 0x400e21e0u
#define BANK_STRIDE 0x9b340u
#define PART_BYTES 6322u
#define RAM_END 0x47f00000u
#define UNCACHED 0x08000000u
#define CURRENT_TCB 0x800068fcu
#define READY_LISTS 0x800068dcu
static const struct {uint32_t tcb,stack,size;} tasks[]={
    {0x46c7fb0cu,0x46c7ea20u,0x1000u},{0x460bcc2cu,0x460bc42cu,0x800u},
    {0x460d4f80u,0x460d4780u,0x800u},{0x460d59d4u,0x460d51d4u,0x800u},
    {0x460fab80u,0x460fabd4u,0x2000u},{0x460ffd44u,0x460fdd44u,0x2000u},
    {0x460e0e38u,0x460dee38u,0x2000u},{0x460ddde4u,0x460d9de4u,0x4000u},
    {0x46105508u,0x4610555cu,0x2000u},{0x46c7bed8u,0x460d6de4u,0x2000u},
    {0x46c7ae84u,0x46c7aed8u,0xff4u},
};
enum {START,REGISTERS,HEAD,NEXT,TASK,SCAN,VERIFY,MATCH_REGISTERS,DONE};
static const uint32_t fixed_parts[]={0x100a4eceu,0x100ab196u,0x460c8122u,0x460bf218u};
static unsigned level(void)
{
#ifdef MODWERK_AB_COLLECT_HOST
    extern unsigned mw_ab_collect_test_sr(void);
    return mw_ab_collect_test_sr()&0x0700u;
#else
    uint32_t sr;
    __asm__ __volatile__("move.w %%sr,%0":"=d"(sr)::"memory");
    return sr&0x0700u;
#endif
}
static int refuse(struct mw_ab_part_roots *s)
{s->status=MW_AB_ROOT_UNKNOWN;s->retained=3u;return 0;}
static int known(uint32_t tcb)
{for(unsigned i=0;i<11u;++i)if(tasks[i].tcb==tcb)return (int)i;return -1;}
static int metadata_at(uint32_t at)
{
    if(at==CURRENT_TCB || (at>=READY_LISTS && at<CURRENT_TCB && !(at&3u)))return 1;
    for(unsigned i=0;i<11u;++i)if(at==tasks[i].tcb || at==tasks[i].tcb+0x48u)return 1;
    return 0;
}
static int span_known(const struct mw_ab_root_span *span)
{
    for(unsigned i=0;i<11u;++i){
        if(span->to==tasks[i].stack+tasks[i].size && span->from>=tasks[i].stack &&
           span->from<=span->to && !(span->from&1u))return 1;
        if(span->from==tasks[i].tcb+0x0cu && span->to==tasks[i].tcb+0x4cu)return 1;
    }
    return 0;
}
static uint32_t physical(uint32_t value)
{return value>=0x48000000u && value<RAM_END+UNCACHED?value-UNCACHED:value;}
static int add_part(struct mw_ab_part_roots *s,uint32_t at)
{
    /* Keep the actual observed cached/uncached alias for the later read. */
    for(unsigned i=0;i<s->part_count;++i)if(physical(s->parts[i])==physical(at))return 1;
    if(s->part_count==MW_AB_ROOT_PARTS)return refuse(s);
    s->parts[s->part_count++]=at;return 1;
}
static int observe(struct mw_ab_part_roots *s,uint32_t value)
{
    uint32_t p=physical(value),base=0,alias=value-p;
    for(unsigned i=0;i<2u;++i)
        if(s->owned[i].bytes && p>=s->owned[i].canonical &&
           p-s->owned[i].canonical<s->owned[i].bytes)s->retained|=1u<<i;
    if(p>=BANK0 && p-BANK0<16u*BANK_STRIDE){
        uint32_t bank=(p-BANK0)/BANK_STRIDE,at=(p-BANK0)%BANK_STRIDE;
        if(at>=0x8ed80u && at-0x8ed80u<4u*PART_BYTES)
            base=BANK0+bank*BANK_STRIDE+0x8ed80u+(at-0x8ed80u)/PART_BYTES*PART_BYTES;
        else if(at>=0x9504au && at-0x9504au<4u*PART_BYTES)
            base=BANK0+bank*BANK_STRIDE+0x9504au+(at-0x9504au)/PART_BYTES*PART_BYTES;
    }
    for(unsigned i=0;i<4u && !base;++i){
        uint32_t n=i<2u?4u:1u;
        if(p>=fixed_parts[i] && p-fixed_parts[i]<n*PART_BYTES)
            base=fixed_parts[i]+(p-fixed_parts[i])/PART_BYTES*PART_BYTES;
    }
    /* Arbitrary transient Part pointers cannot be classified away safely;
     * ending this raw scan therefore never reports semantic completeness. */
    return !base || add_part(s,base+alias);
}
static int word(struct mw_ab_part_roots *s,uint32_t at,uint32_t *out,int remember)
{
    if(s->phase!=SCAN && !metadata_at(at))return refuse(s);
    uint8_t b[4];++s->reads;++s->total_reads;
    if(s->reader.read(s->reader.context,at,b,4)!=1 || level()!=0x0400u)return refuse(s);
    *out=(uint32_t)b[0]<<24|(uint32_t)b[1]<<16|(uint32_t)b[2]<<8|b[3];
    if(remember){
        if(s->meta_count==MW_AB_ROOT_META)return refuse(s);
        s->metadata[s->meta_count++]=(struct mw_ab_root_word){at,*out};
    }
    return 1;
}
static int reg(struct mw_ab_part_roots *s,unsigned index,uint32_t *out)
{
    ++s->reads;++s->total_reads;
    return s->reader.entry_register(s->reader.context,index,out)==1 && level()==0x0400u?1:refuse(s);
}
int mw_ab_part_roots_begin(struct mw_ab_part_roots *s,const struct mw_ab_root_reader *reader,
    const struct mw_ab_root_extent owned[2])
{
    if(!s)return 0;
    /* Refuse an unsafe interrupt mask before clearing even owned scan state. */
    if(level()!=0x0400u){s->last_reads=0;s->total_reads=0;return refuse(s);}
    /* Avoid a full-size temporary object on the stock task's limited stack. */
    volatile uint8_t *clear=(volatile uint8_t *)s;
    for(unsigned i=0;i<sizeof *s;++i)clear[i]=0;
    s->status=MW_AB_ROOT_PENDING;
    if(!reader || !reader->read || !reader->entry_register || !owned)return refuse(s);
    for(unsigned i=0;i<2u;++i){
        uint32_t at=owned[i].canonical,n=owned[i].bytes;
        if((!n && at) || (n && (at<0x40000000u || at>=RAM_END || n>RAM_END-at)))return refuse(s);
        s->owned[i]=owned[i];
    }
    if(owned[0].bytes && owned[1].bytes &&
       owned[0].canonical<owned[1].canonical+owned[1].bytes &&
       owned[1].canonical<owned[0].canonical+owned[0].bytes)return refuse(s);
    s->reader=*reader;
    /* Source-proven stock full-Part clipboard/undo storage. Both are read
     * conservatively even when an unrelated clipboard kind is selected. */
    add_part(s,0x460c8122u);add_part(s,0x460bf218u);return 1;
}
enum mw_ab_root_status mw_ab_part_roots_step(struct mw_ab_part_roots *s)
{
    if(!s)return MW_AB_ROOT_UNKNOWN;
    s->reads=0;
    if(s->status>MW_AB_ROOT_UNKNOWN){refuse(s);return s->status;}
    if(s->status!=MW_AB_ROOT_PENDING)return s->status;
    if(level()!=0x0400u || !s->reader.read || !s->reader.entry_register ||
       s->phase>DONE || s->part_count>MW_AB_ROOT_PARTS || s->meta_count>MW_AB_ROOT_META ||
       s->span_count>MW_AB_ROOT_SPANS || s->hops>11u ||
       (s->phase==REGISTERS && s->index>=16u) ||
       ((s->phase==HEAD || s->phase==NEXT) && s->priority>=8u) ||
       (s->phase==TASK && s->index>=11u) ||
       (s->phase==SCAN && (s->span_index>=s->span_count || !span_known(&s->spans[s->span_index]) ||
            s->at<s->spans[s->span_index].from || s->at>s->spans[s->span_index].to || (s->at&1u))) ||
       (s->phase==VERIFY && s->index>=s->meta_count) ||
       (s->phase==MATCH_REGISTERS && s->index>=16u)){
        refuse(s);return s->status;
    }
    while(s->reads<MW_AB_ROOT_READS && s->status==MW_AB_ROOT_PENDING){
        uint32_t value=0;
        switch(s->phase){
        case START:
            if(!word(s,CURRENT_TCB,&s->current,1) || known(s->current)<0){refuse(s);break;}
            s->phase=REGISTERS;break;
        case REGISTERS:
            if(!reg(s,s->index,&value) || !observe(s,value))break;
            s->registers[s->index++]=value;
            if(s->index==16u){s->index=0;s->phase=HEAD;}break;
        case HEAD:
            if(!word(s,READY_LISTS+4u*s->priority,&s->head,1))break;
            s->next=s->head;s->hops=0;s->phase=NEXT;break;
        case NEXT:
            if(!s->next){
                if(++s->priority==8u){s->phase=TASK;s->index=0;}else s->phase=HEAD;
                break;
            }
            {
                int i=known(s->next);
                if(i<0 || s->hops==11u || (s->seen&(1u<<(unsigned)i))){refuse(s);break;}
                s->seen|=1u<<(unsigned)i;++s->hops;
                if(!word(s,s->next,&value,1))break;
                if(value==s->head)value=0;
                s->next=value;
            }break;
        case TASK:
            {
                unsigned i=s->index;
                uint32_t top=tasks[i].stack+tasks[i].size;
                if(tasks[i].tcb==s->current)value=s->registers[15];
                else if(!word(s,tasks[i].tcb+0x48u,&value,1))break;
                if((value&1u) || value<tasks[i].stack || value>top){refuse(s);break;}
                unsigned needed=tasks[i].tcb==s->current?1u:2u;
                if(needed>MW_AB_ROOT_SPANS-s->span_count){refuse(s);break;}
                s->spans[s->span_count++]=(struct mw_ab_root_span){value,top};
                if(tasks[i].tcb!=s->current)
                    s->spans[s->span_count++]=(struct mw_ab_root_span){tasks[i].tcb+0x0cu,tasks[i].tcb+0x4cu};
                if(++s->index==11u){s->phase=SCAN;s->at=s->spans[0].from;}
            }break;
        case SCAN:
            if(!span_known(&s->spans[s->span_index]) ||
               s->at<s->spans[s->span_index].from || s->at>s->spans[s->span_index].to || (s->at&1u)){
                refuse(s);break;
            }
            if(s->at+4u>s->spans[s->span_index].to){
                if(++s->span_index==s->span_count){s->phase=VERIFY;s->index=0;}
                else s->at=s->spans[s->span_index].from;
                break;
            }
            if(!word(s,s->at,&value,0) || !observe(s,value))break;
            s->at+=2u;break;
        case VERIFY:
            if(!word(s,s->metadata[s->index].at,&value,0) || value!=s->metadata[s->index].value){refuse(s);break;}
            if(++s->index==s->meta_count){s->phase=MATCH_REGISTERS;s->index=0;}break;
        case MATCH_REGISTERS:
            if(!reg(s,s->index,&value) || value!=s->registers[s->index]){refuse(s);break;}
            if(++s->index==16u){s->phase=DONE;s->status=MW_AB_ROOT_BYTES_SCANNED;}break;
        default:refuse(s);break;
        }
    }
    s->last_reads=s->reads;return s->status;
}
int mw_ab_part_roots_extra(const struct mw_ab_part_roots *s,unsigned index,uint32_t *out)
{
    if(!s || !out || s->status!=MW_AB_ROOT_BYTES_SCANNED ||
       s->part_count>MW_AB_ROOT_PARTS || index>=s->part_count)return -1;
    *out=s->parts[index];return 1;
}
