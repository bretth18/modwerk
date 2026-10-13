// SPDX-License-Identifier: MIT
// Private native consumer instrument: local stock image/package required.
#include <cassert>
#include <cstdio>
#include <fstream>
#include <iterator>
#include <map>
#include <set>
#include <string>
#include <vector>
#include "machine.h"
#include "mc68k/Musashi/m68k.h"
#include "mc68k/cpuState.h"
static constexpr uint32_t sp=0x46c7f920,stop=0x47300000,window=0x47060000,bank=0x400e21e0;
static std::vector<uint8_t> load(const char *p) {
    std::ifstream f(p,std::ios::binary);assert(f.good());return {(std::istreambuf_iterator<char>(f)),{}};
}
struct Probe {
    ot::Machine m;
    std::map<std::string,uint32_t> symbols;
    uint32_t lo,hi;
    bool active=false;
    unsigned escapes=0,calls=0,writes=0,private_reads=0,pixelwrites=0,widgets=0,max_pixels=0,raster_collisions=0;
    uint32_t stock_pixels=0;
    bool expected_escape=false;
    unsigned reset_stages=0,random_stages=0;
    std::set<uint32_t> private_consumers;
    std::string current;
    Probe(const std::vector<uint8_t>& stock,const std::vector<uint8_t>& group,const char *map,uint32_t origin):m(stock),lo(origin),hi(origin+group.size()) {
        std::ifstream f(map);std::string name;uint32_t offset;
        while(f>>name>>offset) symbols[name]=origin+offset;
        for(unsigned i=0;i<group.size();i++)m.write8(lo+i,group[i]);
        // Map only the remaining documented battery-RAM windows, beside the
        // emulator's boot-only settings page. Reset mirrors Parts here.
        m.mapRegion(0x10000000,0x000b0000);m.mapRegion(0x100c0000,0x00040000);
        m.write32(0x46c82456,bank);
        m.write8(0x100b14cc,0);m.write8(0x100b14cf,0);m.write8(0x80000000,0);m.write8(0x80000034,0);
        uint32_t part=bank+0x8ed80;
        for(unsigned i=0;i<8;i++) {m.write8(part+0x22+i,1);m.write8(part+0x3c+30*i,'F');m.write8(part+0x3d+30*i,'M');m.write8(part+0x3e +30*i,1);}
        m.write32(window,128);m.write32(window+4,64);m.write32(window+8,2);m.write32(window+12,window+0x100);
        assert(m.read32(0x400bf10a)==128&&m.read32(0x400bf10e)==64&&m.read32(0x400bf112)==2);
        stock_pixels=m.read32(0x400bf116);assert(m.mapped(stock_pixels,1024));
        auto watch=[this](uint32_t addr,uint8_t size,uint32_t value,uint32_t pc) {
            if(!active)return;writes++;
            if(addr>=window+0x100&&addr<window+0x500)pixelwrites++;
            uint32_t physical=addr>=0x48000000&&addr<0x50000000?addr-0x08000000:addr;
            // The watch runs before the store. Reconstruct every crossing
            // four-byte window, including split byte/word stores, from the
            // old memory with this store overlaid. Canonicalize target values.
            for(uint32_t start=physical-3;start<physical+size;start++) {
                if((start>=lo&&start+4<=hi)||(start>=0x46c7ea20&&start+4<=0x46c7fa20)||!m.mapped(start,4))continue;
                uint32_t stored=0;
                for(unsigned i=0;i<4;i++) {
                    uint32_t a=start+i;
                    uint8_t byte=a>=physical&&a<physical+size?uint8_t(value>>(8*(size-1-(a-physical)))):m.read8(a);
                    stored=(stored<<8)|byte;
                }
                uint32_t target=stored>=0x48000000&&stored<0x50000000?stored-0x08000000:stored;
                if(target<lo||target>=hi)continue;
                // Bitmap words are numeric pixels, not callback/pointer
                // roots. Exclude only bounded pixel storage reached through
                // the checked 128x64 window and actual graphics routines.
                // Window descriptors and all other memory remain watched.
                if(pc>=0x40011830&&pc<0x40012a00&&
                   ((start>=window+0x100&&start+4<=window+0x500)||(start>=stock_pixels&&start+4<=stock_pixels+1024))) {raster_collisions++;continue;}
                if(escapes++<8)std::fprintf(stderr,"escape %s pc=%x destination=%x target=%x\n",current.c_str(),pc,start,stored);
            }
        };
        m.addWriteWatch(0x40000400,0x48000000,watch);m.addWriteWatch(0x48000400,0x50000000,watch);
        m.addWriteWatch(0x10000000,0x10100000,watch);m.addWriteWatch(0x80000000,0x80010000,watch);
        auto read=[this](uint32_t,uint8_t,uint32_t,uint32_t pc){if(active){private_reads++;private_consumers.insert(pc);}};
        m.addReadWatch(lo,hi,read);m.addReadWatch(lo+0x08000000,hi+0x08000000,read);
    }
    uint32_t call(const std::string& name,uint32_t entry,const std::vector<uint32_t>& args={}) {
        active=false;current=name;auto *cpu=m.getCpuState();
        for(unsigned r=0;r<15;r++)m68k_set_reg(cpu,m68k_register_t(M68K_REG_D0+r),0);
        m68k_set_reg(cpu,M68K_REG_SP,sp);m.write32(sp,stop);
        for(unsigned i=0;i<args.size();i++)m.write32(sp+4+4*i,args[i]);
        auto before=m.unmappedCount();active=true;m68k_set_reg(cpu,M68K_REG_PC,entry);
        unsigned budget=1000000;
        while(m.pc()!=stop&&budget--){if(!m.step())break;}
        active=false;calls++;
        if(m.pc()!=stop)std::fprintf(stderr,"%s failed to return pc=%x reason=%s\n",name.c_str(),m.pc(),m.why().c_str());
        if(m.unmappedCount()!=before)std::fprintf(stderr,"%s used unmapped memory (%llu new)\n",name.c_str(),static_cast<unsigned long long>(m.unmappedCount()-before));
        assert(m.pc()==stop);
        assert(m.unmappedCount()==before);assert(expected_escape||!escapes);
        unsigned pixels=0;for(unsigned i=0;i<1024;i++)pixels+=m.read8(window+0x100+i)!=0;
        if(pixels>max_pixels)max_pixels=pixels;
        return m68k_get_reg(cpu,M68K_REG_D0);
    }
    uint32_t call(const std::string& name,const std::vector<uint32_t>& args={}){return call(name,symbols.at(name),args);}
};
int main(int argc,char **argv) {
    assert(argc==7);uint32_t origin=std::stoul(argv[4],nullptr,16);
    Probe p(load(argv[1]),load(argv[2]),argv[3],origin);
    auto pb=p.call("fm_descriptor");assert(pb==p.symbols.at("po_pgdesc_buf"));
    p.call("mr_ui_tick");
    auto resolved=p.call("stock PB resolver",0x40031da4,{0,0});if(resolved!=pb)std::fprintf(stderr,"PB=%x expected=%x table=%x\n",resolved,pb,p.m.read32(p.symbols.at("mr_pb_table")+20));assert(resolved==pb);
    auto lfo=p.call("stock LFO resolver",0x40031da4,{0,1});assert(lfo==p.symbols.at("po_lfodesc"));
    auto amp=p.call("po_amp_desc");assert(amp==p.symbols.at("po_ampdesc_buf"));
    for(uint32_t page:{0u,1u,2u,3u,4u}) {
        p.m.write32(0x460d1684,page);
        p.call("stock generic parameter drawer",0x4004d948,{page});
    }
    for(uint32_t track=0;track<8;track++) {
        p.m.write8(0x100b14cc,track);p.m.write8(0x80000000,track);p.call("mr_ui_tick");
        for(uint32_t page:{0u,1u,2u})for(uint32_t slot=0;slot<6;slot++)for(uint32_t modifier:{0u,1u,2u,3u}) {
            p.m.write32(0x460d1684,page);p.m.write32(0x46c7dd26,modifier&1);
            p.m.write32(0x46c7d8ee +24*(0x38+slot),modifier&2);
            for(uint32_t delta:{1u,0xffffffffu,7u,0xfffffff9u})p.call("stock knob dispatch",0x40055008,{slot,delta});
        }
    }
    p.m.write8(0x100b14cc,0);p.m.write8(0x80000000,0);p.m.write32(0x46c7dd26,0);
    // Execute complete reset/randomize calls, including their notification
    // tails. Stock toast removal requires an initialized permanent input
    // layer even when the timed toast did not register its own modal map.
    // Register an authored empty baseline through the actual stock function;
    // preserve its list across calls and close through the stock callback.
    // This initialized UI fixture is not a full boot or heap qualification.
    assert(!p.m.read32(0x460d1e70));p.m.write32(0x460d165c,0);
    constexpr uint32_t permanent=0x47070400,empty_keys=permanent+32,empty_enc=permanent+64;
    for(unsigned i=0;i<28;i++)p.m.write8(permanent+i,0);
    p.m.write32(permanent+4,empty_keys);p.m.write32(permanent+8,empty_enc);
    p.m.write16(empty_keys,0xff00);p.m.write16(empty_enc,0xff00);
    p.call("stock base layer register",0x40031494,{permanent});
    assert(p.m.read32(0x460d165c)==permanent);
    for(uint32_t track=0;track<8;track++)for(uint32_t page=0;page<5;page++) {
        p.m.write8(0x100b14cc,track);p.m.write8(0x80000000,track);p.call("mr_ui_tick");
        p.m.write32(0x460d1684,page);p.m.write8(0x46c7d8d8,page);
        p.call("stock complete reset",0x4005cbd8);p.reset_stages++;
        p.call("stock complete randomize",0x4005b9c0);p.random_stages++;
        assert(p.m.read32(0x460d165c)==permanent);
    }
    p.m.write8(0x100b14cc,0);p.m.write8(0x80000000,0);
    p.call("stock notification close",0x40056bec);
    assert(!p.m.read32(0x460d1e70)&&p.m.read32(0x460d165c)==permanent);
    constexpr uint32_t layer=0x47070000,definitions=layer+0x100;
    p.m.write32(0x460d165c,layer);p.m.write32(layer,0);p.m.write32(layer+4,0);p.m.write32(layer+8,definitions);p.m.write32(layer+12,0);
    for(unsigned slot=0;slot<6;slot++) {
        uint32_t at=definitions+22*slot;
        p.m.write8(at,slot);p.m.write8(at+1,0);p.m.write32(at+2,0x40055008);
    }
    p.m.write16(definitions+6*22,0xff00);
    for(auto descriptor:{pb,lfo,amp})for(uint32_t second:{0u,1u}) {
        p.call("stock scalar parameter staging and UI cache rebuild",0x400326d4,{descriptor,second,definitions});
        for(unsigned slot=0;slot<6;slot++) {
            assert(p.m.read32(definitions+22*slot+2)==0x40055008);
            assert(p.m.read32(definitions+22*slot+14)==p.m.read32(descriptor+0x6a+4*(slot+6*second)));
            assert(p.m.read32(definitions+22*slot+18)==p.m.read32(descriptor+0x9a+4*(slot+6*second)));
        }
    }
    for(auto descriptor:{pb,lfo,amp})for(unsigned slot=0;slot<12;slot++) {
        auto fmt=p.m.read32(descriptor+0xca+slot*4),widget=p.m.read32(descriptor+0xfa+slot*4);
        if(!widget)continue;
        p.widgets++;
        for(uint32_t value:{0u,64u,127u})for(uint32_t flags:{0u,1u,2u,8u,128u})
            p.call("descriptor widget",widget,{10,20,slot,value,flags,fmt,window});
    }
    assert(p.max_pixels&&p.pixelwrites&&p.widgets>=4);
    auto scanner=load(argv[5]);uint32_t scan=std::stoul(argv[6],nullptr,16);
    for(unsigned i=0;i<scanner.size();i++)p.m.write8(0x47400000+i,scanner[i]);
    auto retained=[&](){return p.call("actual known UI-root collector",scan,{p.lo,p.hi});};
    assert(retained()==0);
    constexpr uint32_t packed=0x46c7d8e0;auto saved=p.m.read32(packed);
    for(uint32_t alias:{0u,0x08000000u}) {p.m.write32(packed,p.lo+8+alias);assert(retained()==1);}p.m.write32(packed,saved);
    saved=p.m.read32(definitions+2);p.m.write32(definitions+2,p.symbols.at("po_knob"));assert(retained()==1);p.m.write32(definitions+2,saved);
    saved=p.m.read32(layer+8);p.m.write32(layer+8,pb);assert(retained()==1);p.m.write32(layer+8,saved);
    p.m.write32(layer,layer);assert(retained()==2);p.m.write32(layer,0);
    p.m.write32(0x460d165c,layer+1);assert(retained()==2);p.m.write32(0x460d165c,layer);
    assert(retained()==0);
    std::printf("{\"origin\":%u,\"calls\":%u,\"widgets\":%u,\"writes\":%u,\"privateReads\":%u,\"consumerPCs\":%zu,\"escapedPointers\":%u,\"maxNonzeroPixelBytes\":%u,\"numericRasterCollisions\":%u,\"resetDescriptorStages\":%u,\"randomizeDescriptorStages\":%u,\"initializedInputLayer\":true,\"stockNotificationTailExecuted\":true}",origin,p.calls,p.widgets,p.writes,p.private_reads,p.private_consumers.size(),p.escapes,p.max_pixels,p.raster_collisions,p.reset_stages,p.random_stages);
    // Authored negative: MOVE.L #privatePointer,global followed by RTS.
    // It executes on the CPU, rather than invoking the watch from the host.
    constexpr uint32_t negative=0x47310000,sink=0x460d1800;
    p.m.write16(negative,0x23fc);p.m.write32(negative+2,p.lo+20);p.m.write32(negative+6,sink);p.m.write16(negative+10,0x4e75);
    p.expected_escape=true;p.call("injected escape",negative);assert(p.escapes==1&&p.m.read32(sink)==p.lo+20);
    p.escapes=0;p.m.write32(sink,0);
    p.m.write16(negative,0x33fc);p.m.write16(negative+2,(p.lo+20)>>16);p.m.write32(negative+4,sink);
    p.m.write16(negative+8,0x33fc);p.m.write16(negative+10,(p.lo+20)&0xffff);p.m.write32(negative+12,sink+2);p.m.write16(negative+16,0x4e75);
    p.call("injected split-word escape",negative);assert(p.escapes>=1&&p.m.read32(sink)==p.lo+20);
    for(uint32_t destination:{window+12,window+0x180}) {
        p.escapes=0;p.m.write16(negative,0x23fc);p.m.write32(negative+2,p.lo+20);
        p.m.write32(negative+6,destination);p.m.write16(negative+10,0x4e75);
        p.call("injected window escape",negative);assert(p.escapes>=1&&p.m.read32(destination)==p.lo+20);
    }
    std::puts("\n{\"injectedEscapeDetected\":true,\"splitWordEscapeDetected\":true,\"actualUIRootCollectorPassed\":true,\"rasterExclusionIsBounded\":true}");
}
