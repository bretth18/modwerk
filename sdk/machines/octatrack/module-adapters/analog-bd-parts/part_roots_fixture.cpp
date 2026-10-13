// SPDX-License-Identifier: GPL-3.0-or-later
// Private original-stock clipboard calls and freshly compiled authored scan.
#include <cassert>
#include <cstdio>
#include <fstream>
#include <iterator>
#include <map>
#include <string>
#include <vector>
#include "machine.h"
#include "mc68k/Musashi/m68k.h"
#include "mc68k/cpuState.h"
static const struct{uint32_t tcb,stack,size;} tasks[]={
    {0x46c7fb0c,0x46c7ea20,0x1000},{0x460bcc2c,0x460bc42c,0x800},
    {0x460d4f80,0x460d4780,0x800},{0x460d59d4,0x460d51d4,0x800},
    {0x460fab80,0x460fabd4,0x2000},{0x460ffd44,0x460fdd44,0x2000},
    {0x460e0e38,0x460dee38,0x2000},{0x460ddde4,0x460d9de4,0x4000},
    {0x46105508,0x4610555c,0x2000},{0x46c7bed8,0x460d6de4,0x2000},
    {0x46c7ae84,0x46c7aed8,0xff4},
};
static constexpr uint32_t stop=0x47340000,sp=0x47320000;
static unsigned total=0,calls=0,maxStep=0,maxReads=0,maxStack=0;
static unsigned run(ot::Machine& m,uint32_t entry,const std::vector<uint32_t>& args={})
{
    auto *cpu=m.getCpuState();uint32_t saved[16];
    for(unsigned i=0;i<16;++i)saved[i]=m68k_get_reg(cpu,m68k_register_t(M68K_REG_D0+i));
    m.write32(sp,stop);for(unsigned i=0;i<args.size();++i)m.write32(sp+4+4*i,args[i]);
    m68k_set_reg(cpu,M68K_REG_SP,sp);m68k_set_reg(cpu,M68K_REG_PC,entry);
    unsigned count=0,lowest=sp;
    while(m.pc()!=stop && count<100000){
        assert(m.step());++count;
        uint32_t now=m68k_get_reg(cpu,M68K_REG_SP);
        if(now<lowest)lowest=now;
    }
    if(sp-lowest>maxStack)maxStack=sp-lowest;
    assert(m.pc()==stop && m68k_get_reg(cpu,M68K_REG_SP)==sp+4);
    for(unsigned i=2;i<15;++i)if(i!=8 && i!=9)assert(m68k_get_reg(cpu,m68k_register_t(M68K_REG_D0+i))==saved[i]);
    for(unsigned i=0;i<args.size();++i)assert(m.read32(sp+4+4*i)==args[i]);
    total+=count;++calls;return count;
}
static void expect(ot::Machine& m,uint32_t at,const std::vector<uint8_t>& data)
{for(unsigned i=0;i<data.size();++i)assert(m.read8(at+i)==data[i]);}
static std::vector<uint8_t> part(unsigned seed)
{
    std::vector<uint8_t> data(6322);
    for(unsigned i=0;i<data.size();++i)data[i]=uint8_t(i*13+seed*31);
    for(unsigned t=0;t<8;++t){data[0x22+t]=1;data[60+30*t]='A';data[61+30*t]='B';data[62+30*t]=1;}
    return data;
}
static void write(ot::Machine& m,uint32_t at,const std::vector<uint8_t>& bytes)
{for(unsigned i=0;i<bytes.size();++i)m.write8(at+i,bytes[i]);}
static void clipboard(const std::vector<uint8_t>& stock)
{
    ot::Machine m(stock);auto *cpu=m.getCpuState();m68k_set_reg(cpu,M68K_REG_SR,0x2400);
    unsigned cases=0;
    for(unsigned bank=0;bank<16;++bank)for(unsigned p=0;p<4;++p)for(unsigned alias=0;alias<2;++alias){
        uint32_t b=0x400e21e0+bank*0x9b340+alias*0x08000000;
        uint32_t at=b+0x8ed80+p*6322,sram=0x100a4eceu+p*6322;
        m.write32(0x46c82456,b);m.write8(0x80000003,(p+1)&3);
        auto first=part(bank+p+1),second=part(bank+p+3);
        write(m,at,first);run(m,0x4002932c,{p});expect(m,0x460c8122,first);
        assert(m.read32(0x460d0ffa)==17 && m.read32(0x460c80f0)==0);
        write(m,at,second);run(m,0x400292a0,{0,p});expect(m,0x460bf218,second);
        assert(m.read32(0x460c80f0)==17);
        run(m,0x40029a4c,{0x460c8122,p});expect(m,at,first);expect(m,sram,first);
        run(m,0x40029a4c,{0x460bf218,p});expect(m,at,second);expect(m,sram,second);
        m.write32(0x460d0ffa,16);run(m,0x40029b78,{p});expect(m,at,second);expect(m,sram,second);
        assert(m68k_get_reg(cpu,M68K_REG_D0)==0);
        m.write32(0x460d0ffa,17);run(m,0x40029b78,{p});expect(m,at,first);expect(m,sram,first);
        assert(m68k_get_reg(cpu,M68K_REG_D0)==1);++cases;
    }
    std::printf("PASS actual stock clipboard: %u bank/Part/alias cases, %u calls, %u instructions; both6322B copies exact, kind17 producer/caller proven, undo caller not executed\n",cases,calls,total);
}
static void roots(const std::vector<uint8_t>& stock,const std::vector<uint8_t>& code,uint32_t origin,const std::map<std::string,uint32_t>& symbols)
{
    ot::Machine m(stock);auto *cpu=m.getCpuState();write(m,origin,code);
    const unsigned initialCalls=calls,initialInstructions=total;unsigned cases=0;maxStack=0;
    for(unsigned current=0;current<11;++current)for(unsigned full=0;full<2;++full){
        if(full && current!=7)continue; // one complete worst-case stack population per origin
        for(unsigned i=0;i<8;++i)m.write32(0x800068dc+4*i,0);
        m.write32(0x800068fc,tasks[current].tcb);m.write32(0x800068dc,tasks[current].tcb);
        for(unsigned i=0;i<11;++i){
            m.write32(tasks[i].tcb,i==current?tasks[i].tcb:0);
            for(unsigned r=0;r<16;++r)m.write32(tasks[i].tcb+0x0c+4*r,0);
            m.write32(tasks[i].tcb+0x48,tasks[i].stack+(full?0:tasks[i].size-16));
            for(unsigned at=0;at<tasks[i].size;at+=2)m.write16(tasks[i].stack+at,0);
        }
        for(unsigned r=0;r<16;++r)m.write32(0x47001000+4*r,0);
        m.write32(0x47001000,0x400e21e0+0x8ed80+67);
        m.write32(0x47001004,0x4f080001); // uncached first predecessor metadata byte
        m.write32(0x47001008,0x470827ff); // final candidate allocation byte
        m.write32(0x4700103c,tasks[current].stack+(full?0:tasks[current].size-16));
        m68k_set_reg(cpu,M68K_REG_SR,0x2400);run(m,symbols.at("roots_begin"));
        assert(m68k_get_reg(cpu,M68K_REG_D0)==1);unsigned budget=10000;
        while(budget--){
            unsigned held=run(m,symbols.at("roots_step"));
            assert((m68k_get_reg(cpu,M68K_REG_SR)&0x0700)==0x0400);
            if(held>maxStep)maxStep=held;
            unsigned status=m68k_get_reg(cpu,M68K_REG_D0);
            run(m,symbols.at("roots_report"));assert(m.read32(0x47020004)<=8);
            if(status){assert(status==1);break;}
        }
        assert(budget && m.read32(0x4702000c)==3 && m.read32(0x47020010)==3);
        assert(m.read32(0x47020014)==0xffffffff); // incomplete semantic end, never0
        if(m.read32(0x47020008)>maxReads)maxReads=m.read32(0x47020008);++cases;
    }
    for(unsigned level=0;level<8;++level)if(level!=4){
        m68k_set_reg(cpu,M68K_REG_SR,0x2000|level<<8);run(m,symbols.at("roots_begin"));
        assert(m68k_get_reg(cpu,M68K_REG_D0)==0);run(m,symbols.at("roots_report"));
        assert(m.read32(0x47020000)==2 && m.read32(0x47020008)==0 && m.read32(0x4702000c)==3);++cases;
    }
    std::printf("PASS actual ColdFire bounded roots: origin%08x %u cases, %u calls, %u instructions, max step%u instructions, max reads%u, max stack%uB, step<=8; actualSR4 unchanged, semantic end unknown, no physical timing/snapshot/retirement proof\n",origin,cases,calls-initialCalls,total-initialInstructions,maxStep,maxReads,maxStack);
}
int main(int argc,char **argv)
{
    assert(argc==2 || argc==5);std::ifstream input(argv[1],std::ios::binary);
    assert(input.good());std::vector<uint8_t> stock((std::istreambuf_iterator<char>(input)),{});assert(!stock.empty());
    if(argc==2){clipboard(stock);return 0;}
    std::ifstream raw(argv[2],std::ios::binary),map(argv[4]);assert(raw.good() && map.good());
    std::vector<uint8_t> code((std::istreambuf_iterator<char>(raw)),{});std::map<std::string,uint32_t> symbols;
    std::string name,value;while(map>>name>>value)symbols[name]=std::stoul(value,nullptr,16);
    roots(stock,code,std::stoul(argv[3],nullptr,16),symbols);
}
