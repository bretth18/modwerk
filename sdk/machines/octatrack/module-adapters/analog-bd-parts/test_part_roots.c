/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "part_roots.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>
static const struct {uint32_t tcb,stack,size;} task[]={
    {0x46c7fb0c,0x46c7ea20,0x1000},{0x460bcc2c,0x460bc42c,0x800},
    {0x460d4f80,0x460d4780,0x800},{0x460d59d4,0x460d51d4,0x800},
    {0x460fab80,0x460fabd4,0x2000},{0x460ffd44,0x460fdd44,0x2000},
    {0x460e0e38,0x460dee38,0x2000},{0x460ddde4,0x460d9de4,0x4000},
    {0x46105508,0x4610555c,0x2000},{0x46c7bed8,0x460d6de4,0x2000},
    {0x46c7ae84,0x46c7aed8,0xff4},
};
static unsigned sr=0x2400;
unsigned mw_ab_collect_test_sr(void){return sr;}
struct fixture {
    unsigned current,reads,fail,change;
    int failure;
    uint32_t tcb,head[8],next[11],entry[16],saved[11];
    uint8_t registers[11][64],stack[11][0x4000];
};
static void put(uint8_t *p,uint32_t v){p[0]=v>>24;p[1]=v>>16;p[2]=v>>8;p[3]=v;}
static int read_word(void *context,uint32_t at,uint8_t *out,unsigned n)
{
    struct fixture *f=context;assert(n==4);++f->reads;
    if(f->reads==f->fail)return f->failure;
    uint32_t value=0;int scalar=1;
    if(at==0x800068fc)value=f->tcb+(f->change && f->reads>f->change?4u:0u);
    else if(at>=0x800068dc && at<0x800068fc && !(at&3u))value=f->head[(at-0x800068dc)/4];
    else {
        scalar=0;
        for(unsigned i=0;i<11;++i){
            if(at==task[i].tcb){value=f->next[i];scalar=1;break;}
            if(at==task[i].tcb+0x48){value=f->saved[i];scalar=1;break;}
            if(at>=task[i].tcb+0x0c && at+4<=task[i].tcb+0x4c){memcpy(out,f->registers[i]+at-task[i].tcb-0x0c,4);return 1;}
            if(at>=task[i].stack && at+4<=task[i].stack+task[i].size){memcpy(out,f->stack[i]+at-task[i].stack,4);return 1;}
        }
    }
    assert(scalar);put(out,value);return 1;
}
static int entry(void *context,unsigned index,uint32_t *out)
{
    struct fixture *f=context;assert(index<16);++f->reads;
    if(f->reads==f->fail)return f->failure;
    *out=f->entry[index];return 1;
}
static void reset(struct fixture *f,unsigned current,int full)
{
    memset(f,0,sizeof *f);f->current=current;f->tcb=task[current].tcb;
    f->head[3]=task[current].tcb;f->next[current]=task[current].tcb;
    for(unsigned i=0;i<11;++i)f->saved[i]=task[i].stack+(full?0u:task[i].size-16u);
    f->entry[15]=f->saved[current];sr=0x2400;
}
static enum mw_ab_root_status scan(struct fixture *f,struct mw_ab_part_roots *s,const struct mw_ab_root_extent *owned)
{
    struct mw_ab_root_reader r={f,read_word,entry};
    if(!mw_ab_part_roots_begin(s,&r,owned))return s->status;
    uint32_t out=0;assert(mw_ab_part_roots_extra(s,0,&out)==-1);
    unsigned budget=10000;
    while(s->status==MW_AB_ROOT_PENDING && budget--){
        unsigned before=f->reads;mw_ab_part_roots_step(s);
        assert(f->reads-before<=MW_AB_ROOT_READS);assert(s->last_reads<=MW_AB_ROOT_READS);
        assert(sr==0x2400);
    }
    assert(budget);return s->status;
}
static int has(const struct mw_ab_part_roots *s,uint32_t base)
{for(unsigned i=0;i<s->part_count;++i)if(s->parts[i]==base)return 1;return 0;}
int main(void)
{
    static struct fixture f;struct mw_ab_part_roots s;unsigned cases=0,max_reads=0;
    const struct mw_ab_root_extent owned[2]={{0x41000000,4096},{0x42000000,2048}};
    for(unsigned current=0;current<11;++current)for(unsigned full=0;full<2;++full){
        reset(&f,current,full);assert(scan(&f,&s,owned)==MW_AB_ROOT_BYTES_SCANNED);
        assert(s.retained==0 && s.part_count==2);uint32_t value=0;
        assert(mw_ab_part_roots_extra(&s,0,&value)==1 && value==0x460c8122);
        assert(mw_ab_part_roots_extra(&s,1,&value)==1 && value==0x460bf218);
        assert(mw_ab_part_roots_extra(&s,2,&value)==-1); /* never complete0 */
        if(s.total_reads>max_reads)max_reads=s.total_reads;
        ++cases;
    }
    for(unsigned which=0;which<2;++which)for(unsigned alias=0;alias<2;++alias)
        for(unsigned reg=0;reg<15;++reg)for(unsigned offset=0;offset<3;++offset){
            reset(&f,3,0);f.entry[reg]=owned[which].canonical+(offset==2?owned[which].bytes-1:offset*32u)+alias*0x08000000;
            assert(scan(&f,&s,owned)==MW_AB_ROOT_BYTES_SCANNED && s.retained==(1u<<which));++cases;
        }
    for(unsigned which=0;which<2;++which)for(unsigned alias=0;alias<2;++alias)
        for(unsigned current=0;current<11;++current)for(unsigned held=0;held<11;++held){
            reset(&f,current,0);put(f.stack[held]+task[held].size-14,owned[which].canonical+7+alias*0x08000000);
            assert(scan(&f,&s,owned)==MW_AB_ROOT_BYTES_SCANNED && s.retained==(1u<<which));++cases;
        }
    for(unsigned current=0;current<11;++current)for(unsigned held=0;held<11;++held)if(current!=held){
        reset(&f,current,0);put(f.registers[held]+56,owned[0].canonical);
        assert(scan(&f,&s,owned)==MW_AB_ROOT_BYTES_SCANNED && s.retained==1);++cases;
    }
    for(unsigned bank=0;bank<16;++bank)for(unsigned region=0;region<2;++region)
        for(unsigned index=0;index<4;++index)for(unsigned alias=0;alias<2;++alias){
            uint32_t base=0x400e21e0+bank*0x9b340+(region?0x9504a:0x8ed80)+index*6322+alias*0x08000000;
            reset(&f,3,0);f.entry[1]=base+6319;
            assert(scan(&f,&s,owned)==MW_AB_ROOT_BYTES_SCANNED && has(&s,base));++cases;
        }
    for(unsigned region=0;region<2;++region)for(unsigned index=0;index<4;++index){
        uint32_t base=(region?0x100ab196:0x100a4ece)+index*6322;
        reset(&f,3,0);f.entry[2]=base+1;
        assert(scan(&f,&s,owned)==MW_AB_ROOT_BYTES_SCANNED && has(&s,base));++cases;
    }
    reset(&f,3,0);f.entry[0]=0x43000000; /* unresolved transient-capable root */
    assert(scan(&f,&s,owned)==MW_AB_ROOT_BYTES_SCANNED);uint32_t value=0;
    assert(mw_ab_part_roots_extra(&s,s.part_count,&value)==-1);++cases;
    for(unsigned fail=1;fail<=250;++fail)for(int result=-1;result<=2;++result)if(result!=1){
        reset(&f,3,0);f.fail=fail;f.failure=result;
        assert(scan(&f,&s,owned)==MW_AB_ROOT_UNKNOWN && s.retained==3);++cases;
    }
    for(unsigned bad=0;bad<7;++bad){
        reset(&f,3,0);
        if(bad==0)f.tcb=0x47000000;
        if(bad==1)f.head[2]=0x47000000;
        if(bad==2)f.head[2]=f.head[3]; /* duplicated priority list */
        if(bad==3){f.head[0]=task[0].tcb;f.next[0]=task[1].tcb;f.next[1]=task[1].tcb;}
        if(bad==4)f.saved[0]=task[0].stack-2;
        if(bad==5)f.saved[0]=task[0].stack+task[0].size+2;
        if(bad==6)f.entry[15]|=1;
        assert(scan(&f,&s,owned)==MW_AB_ROOT_UNKNOWN && s.retained==3);++cases;
    }
    reset(&f,3,0);f.change=30;assert(scan(&f,&s,owned)==MW_AB_ROOT_UNKNOWN);++cases;
    reset(&f,3,0);for(unsigned i=0;i<15;++i)f.entry[i]=0x400e21e0+i*0x9b340+0x8ed80;
    assert(scan(&f,&s,owned)==MW_AB_ROOT_UNKNOWN && s.retained==3);++cases;
    for(unsigned level=0;level<8;++level)if(level!=4){
        reset(&f,3,0);sr=0x2000|level<<8;struct mw_ab_root_reader r={&f,read_word,entry};
        assert(!mw_ab_part_roots_begin(&s,&r,owned) && s.retained==3 && f.reads==0);++cases;
    }
    const struct mw_ab_root_extent invalid[][2]={
        {{0x49000000,4096},{0,0}},{{0x41000000,0},{0,0}},{{0x47efffff,2},{0,0}},
        {{0x41000000,4096},{0x41000001,128}},{{0xffffffff,0xffffffff},{0,0}},
    };
    for(unsigned i=0;i<sizeof invalid/sizeof invalid[0];++i){reset(&f,3,0);assert(scan(&f,&s,invalid[i])==MW_AB_ROOT_UNKNOWN);++cases;}
    for(unsigned bad=0;bad<7;++bad){
        reset(&f,3,0);struct mw_ab_root_reader r={&f,read_word,entry};
        assert(mw_ab_part_roots_begin(&s,&r,owned));
        if(bad==0)s.phase=0xffffffffu;
        if(bad==1)s.part_count=MW_AB_ROOT_PARTS+1;
        if(bad==2)s.meta_count=MW_AB_ROOT_META+1;
        if(bad==3)s.span_count=MW_AB_ROOT_SPANS+1;
        if(bad==4)s.reader.read=NULL;
        if(bad==5)s.status=(enum mw_ab_root_status)7;
        if(bad==6)sr=0x2700;
        assert(mw_ab_part_roots_step(&s)==MW_AB_ROOT_UNKNOWN && s.retained==3 && f.reads==0);++cases;
    }
    for(unsigned bad=0;bad<2;++bad){
        reset(&f,3,0);struct mw_ab_root_reader r={&f,read_word,entry};
        assert(mw_ab_part_roots_begin(&s,&r,owned));
        s.phase=4u;s.index=bad?0u:3u;s.current=task[3].tcb;
        s.registers[15]=f.entry[15];s.span_count=MW_AB_ROOT_SPANS-(bad?1u:0u);
        struct mw_ab_root_span before[MW_AB_ROOT_SPANS];memcpy(before,s.spans,sizeof before);
        assert(mw_ab_part_roots_step(&s)==MW_AB_ROOT_UNKNOWN && s.retained==3);
        assert(s.span_count==MW_AB_ROOT_SPANS-(bad?1u:0u) && !memcmp(before,s.spans,sizeof before));++cases;
    }
    reset(&f,3,0);assert(scan(&f,&s,owned)==MW_AB_ROOT_BYTES_SCANNED);
    s.part_count=MW_AB_ROOT_PARTS+1;
    assert(mw_ab_part_roots_extra(&s,MW_AB_ROOT_PARTS,&value)==-1);
    assert(mw_ab_part_roots_extra(&s,0,&value)==-1);++cases;
    for(unsigned bad=0;bad<3;++bad){
        reset(&f,3,0);struct mw_ab_root_reader r={&f,read_word,entry};
        assert(mw_ab_part_roots_begin(&s,&r,owned));
        while(s.span_count<21u)assert(mw_ab_part_roots_step(&s)==MW_AB_ROOT_PENDING);
        if(bad==0){s.spans[s.span_index]=(struct mw_ab_root_span){0x30000000,0x30001000};s.at=0x30000000;}
        else if(bad==1)s.metadata[0].at=0x30000000;
        else {
            s.spans[s.span_index+1]=(struct mw_ab_root_span){0x30000000,0x30001000};
            s.at=s.spans[s.span_index].to;
        }
        while(s.status==MW_AB_ROOT_PENDING)mw_ab_part_roots_step(&s);
        assert(s.status==MW_AB_ROOT_UNKNOWN && s.retained==3);++cases;
    }
    printf("PASS bounded AB root preparation: %u synthetic cases; max%u reads, step<=%u; semantic end unknown, no board snapshot or retirement authority\n",cases,max_reads,MW_AB_ROOT_READS);
}
