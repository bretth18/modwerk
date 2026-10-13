/* SPDX-License-Identifier: MIT */
/* Stock-free semantic contract, derived from private 1.40C source analysis:
 * layer root 0x460d165c; 64*24 key + 8*20 encoder cache bytes. Both primary
 * next+0 and key-edge next+12 chains use 28-byte layer records. Key and encoder
 * definition arrays are packed 26/22-byte records with a two-byte terminator.
 * Consumers must pin the reviewed stock routines and keep admission disabled
 * until their other roots (including FM widgets) are independently covered. */
#include "machine_lifetime.h"
#include <stddef.h>
#define CACHE 0x46c7d8deu
#define CACHE_BYTES 1696u
#define LAYER_ROOT 0x460d165cu
#define NODE_BYTES 28u
#define NODE_LIMIT 64u
#define DEFINITION_LIMIT 4096u
#define READ_LO 0x40000400u
#define READ_HI 0x47f00000u
struct node { uint32_t address, next[2]; };
struct scanner {
    machine_memory_read read;
    void *context;
    uint32_t lo, hi, count, definitions;
    struct node nodes[NODE_LIMIT];
};
static uint32_t be32(const uint8_t *p)
{ return (uint32_t)p[0]<<24 | (uint32_t)p[1]<<16 | (uint32_t)p[2]<<8 | p[3]; }
static uint32_t physical(uint32_t p)
{ return p>=READ_LO+0x08000000u && p<READ_HI+0x08000000u?p-0x08000000u:p; }
static int owns(const struct scanner *s, uint32_t p)
{ p=physical(p);return p>=s->lo && p<s->hi; }
static int bytes(struct scanner *s, uint32_t at, uint8_t *out, uint32_t n)
{
    uint32_t p=physical(at);
    if (p<s->hi && (uint64_t)p+n>s->lo) return MACHINE_RETAINED;
    if ((at&1u) || p<READ_LO || p>=READ_HI || n>READ_HI-p) return MACHINE_UNKNOWN;
    return s->read(s->context,at,out,n)?MACHINE_CLEAR:MACHINE_UNKNOWN;
}
static int enqueue(struct scanner *s, uint32_t at)
{
    if (!at) return MACHINE_CLEAR;
    if (owns(s,at)) return MACHINE_RETAINED; /* before every possible dereference */
    uint32_t p=physical(at);
    if ((at&1u) || p<READ_LO || p>READ_HI-NODE_BYTES) return MACHINE_UNKNOWN;
    for (uint32_t i=0;i<s->count;i++) if (physical(s->nodes[i].address)==p) return MACHINE_CLEAR;
    if (s->count==NODE_LIMIT) return MACHINE_UNKNOWN;
    s->nodes[s->count++]=(struct node){at,{0,0}};
    return MACHINE_CLEAR;
}
static int definitions(struct scanner *s, uint32_t at, int keys)
{
    if (!at) return MACHINE_CLEAR;
    uint32_t width=keys?26u:22u;
    for (;;) {
        uint8_t data[26];
        int result=bytes(s,at,data,2);
        if (result) return result;
        if (data[0]==255u) return MACHINE_CLEAR;
        if (++s->definitions>DEFINITION_LIMIT) return MACHINE_UNKNOWN;
        result=bytes(s,at,data,width);
        if (result) return result;
        for (uint32_t k=2;k<=10;k+=4) if (owns(s,be32(data+k))) return MACHINE_RETAINED;
        if (keys) {
            result=enqueue(s,be32(data+14));
            if (result) return result;
        } else if (owns(s,be32(data+18))) return MACHINE_RETAINED;
        at+=width; /* bytes() enforces the domain before the next read */
    }
}
static int cycles(const struct scanner *s, unsigned edge)
{
    /* Each relation is checked independently. Primary and auxiliary chains
     * may share nodes or point back across relations without forming a loop. */
    for (uint32_t i=0;i<s->count;i++) {
        uint32_t at=s->nodes[i].address;
        for (uint32_t steps=0;at;steps++) {
            if (steps>=s->count) return MACHINE_UNKNOWN;
            uint32_t k=0;
            while (k<s->count && physical(s->nodes[k].address)!=physical(at)) k++;
            if (k==s->count) return MACHINE_UNKNOWN;
            at=s->nodes[k].next[edge];
        }
    }
    return MACHINE_CLEAR;
}
int machine_ui_lifetime(machine_memory_read read, void *context, uint32_t old_lo, uint32_t old_hi)
{
    if (!read || old_hi<old_lo) return MACHINE_UNKNOWN;
    if (old_hi==old_lo) return MACHINE_CLEAR;
    uint32_t length=old_hi-old_lo,lo=physical(old_lo);
    if (lo<READ_LO || lo>=READ_HI || length>READ_HI-lo) return MACHINE_UNKNOWN;
    old_lo=lo;old_hi=lo+length;
    struct scanner s;
    s.read=read;s.context=context;s.lo=old_lo;s.hi=old_hi;s.count=0;s.definitions=0;
    uint8_t block[32];
    /* Packed words can be only two-byte aligned. Cache reads are bounded
     * chunks with a two-byte overlap, so no crossing pointer is missed. */
    for (uint32_t offset=0;offset<CACHE_BYTES-3;) {
        uint32_t length=CACHE_BYTES-offset<32u?CACHE_BYTES-offset:32u;
        int result=bytes(&s,CACHE+offset,block,length);
        if (result) return result;
        for (uint32_t at=0;at+4<=length;at+=2) if (owns(&s,be32(block+at))) return MACHINE_RETAINED;
        offset+=length-2u;
    }
    int result=bytes(&s,LAYER_ROOT,block,4);
    if (result) return result;
    result=enqueue(&s,be32(block));
    if (result) return result;
    for (uint32_t key=0;key<64;key++) {
        result=bytes(&s,CACHE+key*24u+12u,block,4);
        if (result) return result;
        result=enqueue(&s,be32(block));
        if (result) return result;
    }
    for (uint32_t i=0;i<s.count;i++) {
        result=bytes(&s,s.nodes[i].address,block,NODE_BYTES);
        if (result) return result;
        for (uint32_t at=0;at+4<=NODE_BYTES;at+=2) if (owns(&s,be32(block+at))) return MACHINE_RETAINED;
        uint32_t keydefs=be32(block+4),encdefs=be32(block+8);
        s.nodes[i].next[0]=be32(block);
        s.nodes[i].next[1]=be32(block+12);
        for (unsigned edge=0;edge<2;edge++) {
            result=enqueue(&s,s.nodes[i].next[edge]);
            if (result) return result;
        }
        result=definitions(&s,keydefs,1);
        if (result) return result;
        result=definitions(&s,encdefs,0);
        if (result) return result;
    }
    result=cycles(&s,0);
    return result?result:cycles(&s,1);
}
