/* SPDX-License-Identifier: GPL-3.0-or-later
 * Authored AB machine.s: FLEX1 at Part+0x22+t, AB/1 at Part+60+30*t.
 * Actual shared 1.40C bank model:16banks,4working+4saved Parts,6322B each;
 * CS1 retains current working/saved copies. Imported sources remain exact.
 */
#include "analog_bd_part_fence.h"
#define BANK0 0x400e21e0u
#define BANK_STRIDE 0x9b340u
#define PART_BYTES 6322u
#define UNCACHED 0x08000000u
#define RAM_END 0x47f00000u
static int part(const struct mw_ab_part_reader *reader,uint32_t at)
{
    uint32_t physical=at>=0x48000000u && at<RAM_END+UNCACHED?at-UNCACHED:at;
    if ((at&1u) || physical<0x40000000u || physical>RAM_END-PART_BYTES) {
        /* Only the two fixed CS1 ranges below bypass canonical DRAM bounds. */
        if (!((at>=0x100a4eceu && at<0x100a4eceu+4u*PART_BYTES && (at-0x100a4eceu)%PART_BYTES==0) ||
              (at>=0x100ab196u && at<0x100ab196u+4u*PART_BYTES && (at-0x100ab196u)%PART_BYTES==0)))
            return MW_AB_PART_UNKNOWN;
    }
    for (unsigned track=0;track<8u;++track) {
        uint8_t type,signature[3];
        if (reader->read(reader->context,at+0x22u+track,&type,1)!=1 ||
            reader->read(reader->context,at+60u+30u*track,signature,3)!=1)
            return MW_AB_PART_UNKNOWN;
        if (signature[0]=='A' && signature[1]=='B') {
            if (type==1u && signature[2]==1u) return MW_AB_PART_RETAINED;
            return MW_AB_PART_UNKNOWN;
        }
        if (type>4u) return MW_AB_PART_UNKNOWN;
    }
    return MW_AB_PART_CLEAR;
}
int mw_ab_part_fence(const struct mw_ab_part_reader *reader)
{
    uint8_t bytes[4];
    if (!reader || !reader->read || !reader->extra_part ||
        reader->read(reader->context,0x46c82456u,bytes,4)!=1) return MW_AB_PART_UNKNOWN;
    uint32_t current=(uint32_t)bytes[0]<<24|(uint32_t)bytes[1]<<16|(uint32_t)bytes[2]<<8|bytes[3];
    uint32_t alias=current>=0x48000000u && current<RAM_END+UNCACHED?UNCACHED:0;
    uint32_t physical=current-alias;
    if (physical<BANK0 || physical>BANK0+15u*BANK_STRIDE || (physical-BANK0)%BANK_STRIDE)
        return MW_AB_PART_UNKNOWN;
    for (unsigned bank=0;bank<16u;++bank)
        for (unsigned region=0;region<2u;++region)
            for (unsigned index=0;index<4u;++index) {
                uint32_t at=BANK0+alias+bank*BANK_STRIDE+(region?0x9504au:0x8ed80u)+index*PART_BYTES;
                int result=part(reader,at);if(result!=MW_AB_PART_CLEAR)return result;
            }
    for (unsigned region=0;region<2u;++region)
        for (unsigned index=0;index<4u;++index) {
            int result=part(reader,(region?0x100ab196u:0x100a4eceu)+index*PART_BYTES);
            if(result!=MW_AB_PART_CLEAR)return result;
        }
    for (unsigned index=0;index<=MW_AB_EXTRA_PARTS_MAX;++index) {
        uint32_t at=0;int known=reader->extra_part(reader->context,index,&at);
        if (known==0) return MW_AB_PART_CLEAR;
        if (known!=1 || index==MW_AB_EXTRA_PARTS_MAX) return MW_AB_PART_UNKNOWN;
        int result=part(reader,at);if(result!=MW_AB_PART_CLEAR)return result;
    }
    return MW_AB_PART_UNKNOWN;
}
