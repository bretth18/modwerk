/* SPDX-License-Identifier: MIT */
#include "machine_lifetime.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>
#define CACHE 0x46c7d8deu
#define ROOT 0x460d165cu
#define DATA 0x40001000u
#define OLD 0x44000000u
static unsigned char cache[1696],root[4],data[8192];
static uint32_t fail_at;
static unsigned old_reads,reads;
static void put(unsigned char *p,uint32_t value)
{ p[0]=value>>24;p[1]=value>>16;p[2]=value>>8;p[3]=value; }
static int read_target(void *ctx,uint32_t at,void *out,uint32_t bytes)
{
 (void)ctx;reads++;
 if(at>=0x48000400u&&at<0x4ff00000u)at-=0x08000000u;
 if(at>=OLD&&at<OLD+4096) {old_reads++;return 0;}
 if(at==fail_at)return 0;
 if(at>=CACHE&&at-CACHE<=sizeof(cache)&&bytes<=sizeof(cache)-(at-CACHE))memcpy(out,cache+at-CACHE,bytes);
 else if(at==ROOT&&bytes==4)memcpy(out,root,4);
 else if(at>=DATA&&at-DATA<=sizeof(data)&&bytes<=sizeof(data)-(at-DATA))memcpy(out,data+at-DATA,bytes);
 else return 0;
 return 1;
}
static void reset(void)
{ memset(cache,0,sizeof(cache));memset(root,0,4);memset(data,0,sizeof(data));fail_at=0;old_reads=reads=0; }
static int scan(void)
{ int result=machine_ui_lifetime(read_target,0,OLD,OLD+4096);assert(old_reads==0);return result; }
int main(void)
{
 reset();assert(scan()==MACHINE_CLEAR);
 /* Every cache halfword and chunk boundary is tested, including the end. */
 for(unsigned at=0;at+4<=sizeof(cache);at+=2){reset();put(cache+at,OLD+12);assert(scan()==MACHINE_RETAINED);}
 /* Owning extent boundaries are inclusive/exclusive, for either reference
  * alias. Even an odd data pointer in the final byte retains the owner. */
 for(unsigned alias=0;alias<2;alias++) {
  const uint32_t offsets[]={0,8,4095};
  for(unsigned i=0;i<3;i++){reset();put(cache+2,OLD+alias*0x08000000u+offsets[i]);assert(scan()==MACHINE_RETAINED);}
  reset();put(cache+2,OLD+alias*0x08000000u+4096);assert(scan()==MACHINE_CLEAR);
  /* A layer straddling the owner's start must never be dereferenced. */
  reset();put(root,OLD+alias*0x08000000u-12);assert(scan()==MACHINE_RETAINED);
 }
 reset();put(root,OLD+12);assert(scan()==MACHINE_RETAINED);
 reset();put(root,OLD+0x08000000u+12);assert(scan()==MACHINE_RETAINED);
 reset();put(root,DATA+0x08000000u);assert(scan()==MACHINE_CLEAR);
 reset();put(root,DATA+0x08000000u);put(data,DATA);assert(scan()==MACHINE_UNKNOWN);
 reset();put(root,OLD+12);assert(machine_ui_lifetime(read_target,0,OLD+0x08000000u,OLD+0x08000000u+4096)==MACHINE_RETAINED);assert(old_reads==0);
 reset();put(root,DATA);put(data,OLD+4);assert(scan()==MACHINE_RETAINED);
 reset();put(root,DATA);put(data+12,OLD+4);assert(scan()==MACHINE_RETAINED);
 reset();put(cache+12,DATA);put(data+12,OLD+4);assert(scan()==MACHINE_RETAINED);
 /* A stock layer may contain a definition array with package callbacks. */
 for(unsigned field=2;field<=10;field+=4){reset();put(root,DATA);put(data+4,DATA+128);data[128]=49;put(data+128+field,OLD+8);data[154]=255;assert(scan()==MACHINE_RETAINED);}
 for(unsigned field=2;field<=10;field+=4){reset();put(root,DATA+0x08000000u);put(data+4,DATA+128+0x08000000u);data[128]=49;put(data+128+field,OLD+8+0x08000000u);data[154]=255;assert(scan()==MACHINE_RETAINED);}
 reset();put(root,DATA);put(data+4,DATA+128);data[128]=49;put(data+142,OLD+8);data[154]=255;assert(scan()==MACHINE_RETAINED);
 reset();put(root,DATA);put(data+8,DATA+128);data[128]=0;put(data+146,OLD+8);data[150]=255;assert(scan()==MACHINE_RETAINED);
 reset();put(root,DATA);put(data+4,DATA+128);data[128]=255;assert(scan()==MACHINE_CLEAR);
 reset();put(root,DATA);put(data+8,DATA+128);data[128]=255;assert(scan()==MACHINE_CLEAR);
 /* Primary/auxiliary relations can share and cross nodes without a loop. */
 reset();put(root,DATA);put(data,DATA+32);put(data+32+12,DATA);assert(scan()==MACHINE_CLEAR);
 reset();put(root,DATA);put(data,DATA);assert(scan()==MACHINE_UNKNOWN);
 reset();put(cache+12,DATA);put(data+12,DATA);assert(scan()==MACHINE_UNKNOWN);
 reset();put(root,DATA);put(data,DATA+32);put(data+32,DATA);assert(scan()==MACHINE_UNKNOWN);
 reset();put(root,DATA+1);assert(scan()==MACHINE_UNKNOWN);
 reset();put(root,0xdeadbeefu);assert(scan()==MACHINE_UNKNOWN);
 reset();put(root,DATA);put(data+4,DATA+8190);assert(scan()==MACHINE_UNKNOWN);
 reset();put(root,DATA);fail_at=DATA;assert(scan()==MACHINE_UNKNOWN);
 reset();fail_at=CACHE+30;assert(scan()==MACHINE_UNKNOWN);
 reset();put(root,DATA);put(data+4,DATA+128);assert(scan()==MACHINE_UNKNOWN); /* no sentinel before unreadable boundary */
 reset();put(root,DATA);for(unsigned i=0;i<64;i++)put(data+32*i,DATA+32*(i+1));assert(scan()==MACHINE_UNKNOWN);
 reset();assert(machine_ui_lifetime(0,0,OLD,OLD+4)==MACHINE_UNKNOWN);
 assert(machine_ui_lifetime(read_target,0,OLD+4,OLD)==MACHINE_UNKNOWN);
 assert(machine_ui_lifetime(read_target,0,OLD,OLD)==MACHINE_CLEAR);
 puts("Bounded UI roots: cache boundaries, primary/auxiliary chains, packed definitions, retained-before-read and malformed/long refusal passed");
 return 0;
}
