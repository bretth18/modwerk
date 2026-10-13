// SPDX-License-Identifier: MIT
// Actual authored AB engine browser + stock window/layer/close/callback calls.
// Private source-only images, synthetic helper identity; no boot/DSP admission.
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
static constexpr uint32_t stack=0x46c7f920,stop=0x47300000,bank=0x400e21e0;
static std::vector<uint8_t> load(const char *path) {
    std::ifstream f(path,std::ios::binary);assert(f.good());return {(std::istreambuf_iterator<char>(f)),{}};
}
int main(int argc,char **argv) {
    assert(argc==8);uint32_t origin=std::stoul(argv[4],nullptr,0),helper=0x47400000;
    auto image=load(argv[2]);ot::Machine m(load(argv[1]));
    auto put=[&](uint32_t at,const std::vector<uint8_t> &b){for(unsigned n=0;n<b.size();n++)m.write8(at+n,b[n]);};
    auto read=[&](uint32_t at,unsigned n){std::vector<uint8_t>b(n);for(unsigned i=0;i<n;i++)b[i]=m.read8(at+i);return b;};
    put(origin,image);put(helper,load(argv[5]));
    auto map=[&](const char *path,uint32_t base){std::map<std::string,uint32_t> s;std::ifstream f(path);std::string name;uint32_t offset;while(f>>name>>offset)s[name]=base+offset;return s;};
    auto sy=map(argv[3],origin),hs=map(argv[6],helper);
    m.mapRegion(0x10000000,0x000b0000);m.mapRegion(0x100c0000,0x00040000);
    m.write32(0x46c82456,bank);m.write8(0x80000015,0);
    const uint32_t part=bank+0x8ed80;
    m.write8(0x100b14cf,0);m.write8(0x100b14cc,0);
    m.write8(part+0x22,1);m.write8(part+60,'A');m.write8(part+61,'B');m.write8(part+62,1);
    unsigned calls=0,opens=0,callbacks=0,retained=0,rootStores=0;bool watching=false;
    auto physical=[](uint32_t at){return at>=0x48000400&&at<0x4ff00000?at-0x08000000:at;};
    std::set<uint32_t> consumers;
    auto watcher=[&](uint32_t at,uint8_t width,uint32_t value,uint32_t pc) {
        if(!watching)return;
        uint32_t address=physical(at);
        for(uint32_t start=address-3;start<address+width;start++) {
            if(!m.mapped(start,4)||(start>=origin&&start+4<=origin+image.size())||
               (start>=stack-0x1000&&start+4<=stack+0x100)||
               (pc>=helper&&pc<helper+0x10000&&start>=helper&&start+4<=helper+0x10000))continue;
            uint32_t v=0;for(unsigned i=0;i<4;i++){uint32_t p=start+i;
                uint8_t byte=p>=address&&p<address+width?uint8_t(value>>(8*(width-1-(p-address)))):m.read8(p);
                v=(v<<8)|byte;}
            uint32_t target=physical(v);if(target<origin||target>=origin+image.size())continue;
            // Only the authored engine opener may export its two exact arrays.
            if((start==0x460e5e28&&target==sy.at("handlers.0"))||
               (start==0x460e5e2c&&target==sy.at("engine_labels"))) {rootStores++;continue;}
            std::fprintf(stderr,"unexpected AB export pc=%x destination=%x target=%x\n",pc,start,v);assert(false);
        }
    };
    m.addWriteWatch(0x40000400,0x48000000,watcher);m.addWriteWatch(0x48000400,0x50000000,watcher);
    auto watchedRead=[&](uint32_t,uint8_t,uint32_t,uint32_t pc){if(watching)consumers.insert(pc);};
    m.addReadWatch(origin,origin+image.size(),watchedRead);
    auto enter=[&](uint32_t entry,const std::vector<uint32_t> &args){watching=false;auto *cpu=m.getCpuState();
        for(unsigned r=0;r<15;r++)m68k_set_reg(cpu,m68k_register_t(M68K_REG_D0+r),0);
        m68k_set_reg(cpu,M68K_REG_SP,stack);m.write32(stack,stop);
        for(unsigned i=0;i<args.size();i++)m.write32(stack+4+4*i,args[i]);m68k_set_reg(cpu,M68K_REG_PC,entry);watching=true;};
    auto call=[&](uint32_t entry,const std::vector<uint32_t> &args=std::vector<uint32_t>{}){
        auto before=m.unmappedCount();enter(entry,args);unsigned budget=1000000;
        while(m.pc()!=stop&&budget--)assert(m.step());watching=false;
        if(m.pc()!=stop)std::fprintf(stderr,"failed entry=%x pc=%x reason=%s\n",entry,m.pc(),m.why().c_str());
        assert(m.pc()==stop&&m.unmappedCount()==before);calls++;return m68k_get_reg(m.getCpuState(),M68K_REG_D0);};
    // Initialize a real permanent input layer through stock registration.
    constexpr uint32_t permanent=0x47070400;for(unsigned n=0;n<96;n++)m.write8(permanent+n,0);
    m.write32(permanent+4,permanent+32);m.write32(permanent+8,permanent+64);
    m.write16(permanent+32,0xff00);m.write16(permanent+64,0xff00);m.write32(0x460d165c,0);
    call(0x40031494,{permanent});assert(m.read32(0x460d165c)==permanent);
    const auto beforeRoots=read(0x460e5e28,36);
    assert(call(hs.at("native_capture"),{origin,uint32_t(image.size()),sy.at("handlers.0")-origin,sy.at("engine_labels")-origin})==0);
    for(unsigned model=0;model<2;model++) {
        m.write8(part+0x1da+6,model);call(sy.at("ab_engine_open"));opens++;
        assert(m.read32(0x460e5e30)&&m.read32(0x460e5e28)==sy.at("handlers.0")&&m.read32(0x460e5e2c)==sy.at("engine_labels"));
        assert(call(hs.at("native_retirement"),{0})!=0);retained++;
        // Stock YES closes the window, then loads and dispatches the callback.
        // Pause at the actual authored handler boundary without replacing it.
        auto unmapped=m.unmappedCount();enter(0x4006d8f4,{});unsigned budget=1000000;
        uint32_t target=sy.at(model?"engine_909":"engine_808");
        while(m.pc()!=target&&budget--)assert(m.step());watching=false;
        assert(m.pc()==target&&m.unmappedCount()==unmapped);callbacks++;
        assert(!m.read32(0x460e5e30)&&m.read32(0x460e5e28)==sy.at("handlers.0")&&m.read32(0x460e5e2c)==sy.at("engine_labels"));
        // The actual paused CPU and callback stack retain the owned target.
        for(unsigned r=0;r<16;r++)m.write32(hs.at("native_paused")+4*r,m68k_get_reg(m.getCpuState(),m68k_register_t(M68K_REG_D0+r)));
        m.write32(hs.at("native_paused")+64,m.pc());
        uint32_t paused_sp=m68k_get_reg(m.getCpuState(),M68K_REG_SP);
        for(unsigned n=0;n<128;n++)m.write8(hs.at("native_paused")+68+n,m.read8(paused_sp+n));
        assert(call(hs.at("native_retirement"),{1})!=0);retained++;
        for(unsigned n=0;n<256;n++)m.write8(hs.at("native_paused")+n,0);
        assert(call(hs.at("native_retirement"),{0})==0);
        uint32_t plan=hs.at("native_plan");assert(read(plan+36,36)==beforeRoots&&m.read32(plan+76)==1);
        put(0x460e5e28,read(plan+36,36)); // Explicit local emulator restoration only.
        assert(read(0x460e5e28,36)==beforeRoots&&call(hs.at("native_retirement"),{0})==0);
        assert(m.read32(0x460d165c)==permanent);
    }
    std::printf("{\"origin\":%u,\"calls\":%u,\"engineOpens\":%u,\"stockCloseCallbackBoundaries\":%u,\"retainedRefusals\":%u,\"rootStores\":%u,\"consumerPCs\":%zu,\"exactPreinstallRootRestore\":true,\"unknownExports\":false,\"syntheticHelperIdentity\":true,\"productionLease\":false,\"encodedPackage\":false,\"hardware\":false,\"admission\":false}\n",origin,calls,opens,callbacks,retained,rootStores,consumers.size());
}
