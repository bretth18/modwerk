// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <map>
#include <set>
#include <cstdlib>
#include <fstream>
#include <iomanip>
#include "measure-ranges.h"
// Aggregates only: never serialize opcodes, register contents, LCD/RAM or firmware.
struct Measure {
 struct Call {uint32_t entry,ret,sp,lo;uint64_t instructions,cycles,aline;};
 struct Cost {uint64_t n=0,imax=0,cmax=0,amax=0;uint32_t stack=0;};
 ot::Machine& m; std::string path; std::vector<uint8_t> sites=std::vector<uint8_t>(1112560);
 std::map<uint32_t,Cost> costs;
 std::map<uint32_t,uint64_t> pcs,cycles,alines;
 std::map<uint32_t,std::set<uint32_t>> writes;
 std::vector<Call> active;
 uint32_t prev=0;uint64_t prevCycle=0,totalA=0,unfinished=0;
 bool authored(uint32_t p)const {return p>=0x40000400&&p-0x40000400<sites.size()&&sites[p-0x40000400];}
 explicit Measure(ot::Machine& cpu):m(cpu) {
  const char* out=std::getenv("MIDISC_MEASURE_OUTPUT");if(!out)return;path=out;
  for(auto r:regions)for(uint32_t i=0;i<r.second;++i)sites[r.first-0x40000400+i]=1;
  m.setStepHook([this](ot::Machine& cpu,uint32_t p){
   const bool own=authored(p);if(!own&&active.empty()&&!prev)return;
   auto now=cpu.getCycles();if(prev)cycles[prev]+=now-prevCycle;
   prev=own?p:0;prevCycle=now;
   auto sp=cpu.getA7();
   for(auto it=active.begin();it!=active.end();) {
    if(p==it->ret&&sp==it->sp+4){auto& c=costs[it->entry];++c.n;c.imax=std::max(c.imax,cpu.instructions()-it->instructions);c.cmax=std::max(c.cmax,now-it->cycles);c.amax=std::max(c.amax,totalA-it->aline);c.stack=std::max(c.stack,it->sp-it->lo);it=active.erase(it);}
    else {if(sp<=it->sp&&it->sp-sp<4096)it->lo=std::min(it->lo,sp);++it;}
   }
   if(own){
    ++pcs[p];if((cpu.read16(p)&0xf000)==0xa000){++alines[p];++totalA;}
    if(entries.count(p)&&active.size()<256)active.push_back({p,cpu.read32(sp),sp,sp,cpu.instructions(),now,totalA});
   }
  });
  m.addWriteWatch(0,0xffffffff,[this](uint32_t a,uint8_t n,uint32_t,uint32_t pc){
    if(!authored(pc))return;
    auto page=a&~uint32_t(4095);for(unsigned i=0;i<n;i++)writes[page].insert(a+i);
  });
 }
 ~Measure(){
  if(path.empty())return;
  std::ofstream f(path);f<<"{\"schemaVersion\":1,\"timingModel\":\"MCF5206E instruction timings; V4e A-line instructions not priced; no chip/cache/DMA timing\",\"instructions\":"<<m.instructions()<<",\"modeledCycles\":"<<m.getCycles()<<",\"unfinishedCalls\":"<<active.size()<<",\"functions\":[";
  bool first=true;for(auto [a,c]:costs){if(!first)f<<',';first=false;f<<"{\"address\":"<<a<<",\"completedCalls\":"<<c.n<<",\"maxInstructions\":"<<c.imax<<",\"maxModeledCycles\":"<<c.cmax<<",\"maxUnpricedAlineInstructions\":"<<c.amax<<",\"observedStackBytes\":"<<c.stack<<'}';}
  f<<"],\"patchPcCoverage\":[";first=true;for(auto [p,n]:pcs){if(!first)f<<',';first=false;f<<"{\"address\":"<<p<<",\"hits\":"<<n<<",\"modeledCycles\":"<<cycles[p]<<",\"unpricedAline\":"<<alines[p]<<'}';}
  f<<"],\"directPatchWrites\":[";first=true;for(auto [a,bytes]:writes){if(!first)f<<',';first=false;f<<"{\"page\":"<<a<<",\"first\":"<<*bytes.begin()<<",\"last\":"<<*bytes.rbegin()<<",\"uniqueBytes\":"<<bytes.size()<<'}';}f<<"]}\n";
 }
};
