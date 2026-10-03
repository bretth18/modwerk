// SPDX-License-Identifier: GPL-3.0-or-later
#include <fstream>
#include <iterator>
#include <iostream>
#include <map>
#include <set>
#include <vector>
#include "machine.h"
#include "mc68k/Musashi/m68k.h"
#include "mc68k/cpuState.h"
constexpr uint32_t bank=0x41000000,msc=0x40a955e0,sp=0x47010000,done=0x47300000;
int main(int argc,char**argv){
 if(argc!=2)return 2;std::ifstream f(argv[1],std::ios::binary);std::vector<uint8_t> img{std::istreambuf_iterator<char>(f),{}};
 ot::Machine m(img);std::map<uint32_t,std::set<uint32_t>> writes;bool recording=false;
 m.addWriteWatch(0,0xffffffff,[&](uint32_t a,uint8_t size,uint32_t,uint32_t pc){if(recording){for(unsigned i=0;i<size;i++)writes[a&~uint32_t(4095)].insert(a+i);}});
 int expectedD1=-1;unsigned failures=0;bool first=true;std::cout<<"{\"schemaVersion\":1,\"cases\":[";
 auto reset=[&](){
  m68k_set_reg(m.getCpuState(),M68K_REG_SR,0x2700);m68k_set_reg(m.getCpuState(),M68K_REG_SP,sp);
  for(int i=0;i<15;i++)m68k_set_reg(m.getCpuState(),m68k_register_t(M68K_REG_D0+i),0);
  expectedD1=-1; m.write8(msc-1,0xa5);m.write8(msc+4096,0xa5);for(unsigned i=0;i<256;i++)m.write8(sp-4096+i,0xa5);
  m.write32(sp,done);m.write32(0x46c82456,bank);m.write8(0x100b14cf,0);m.write8(0x100b14cc,0);
  m.write32(0x80000012,1);m.write32(0x800065b8,0);m.write32(0x400d6d60,bank);m.write32(0x400d6d64,0);
  m.write8(0x400d6ce4,0xff);m.write8(0x400d6ce5,0xff);m.write32(0x400d68b8,0);m.write32(0x400d6ea0,0);
  for(unsigned i=0;i<4096;i++)m.write8(msc+i,0xff);
  for(unsigned i=0;i<256;i++){m.write8(bank+0x8f162+i,0);m.write8(0x46c78960+i,0);}
  for(unsigned t=0;t<8;t++){m.write32(0x800064d0+t*4,0x47200000+t*512);m.write16(0x47200000+t*512+0x17e,0);m.write8(0x46c76dc0+t*68,0xff);}
  m.write8(bank+0x8ed90,0);m.write8(bank+0x8ed91,1);
  for(unsigned i=0;i<144;i++){m.write8(bank+0x90522+i,0);m.write8(bank+0x967ec+i,0);}
 };
 auto run=[&](std::string name,uint32_t entry,unsigned cap=200000){
  m.setPC(entry);auto cycles=m.getCycles(),ins=m.instructions();uint32_t lo=sp;unsigned n=0,aline=0,v4before=m.v4eExecuted();recording=true;
  while(m.pc()!=done&&n<cap){lo=std::min(lo,m.getA7());if((m.read16(m.pc())&0xf000)==0xa000)++aline;if(!m.step())break;++n;}
  recording=false;bool ok=m.pc()==done&&m.getA7()==sp+4;bool guards=m.read8(msc-1)==0xa5&&m.read8(msc+4096)==0xa5;for(unsigned i=0;i<256;i++)guards=guards&&m.read8(sp-4096+i)==0xa5;bool expected=expectedD1<0||m.getD(1)==unsigned(expectedD1);failures+=!ok||!guards||!expected;
  if(!first)std::cout<<',';first=false;std::cout<<"{\"name\":\""<<name<<"\",\"entry\":"<<entry<<",\"returned\":"<<(ok?"true":"false")<<",\"instructions\":"<<m.instructions()-ins<<",\"modeledCycles\":"<<m.getCycles()-cycles<<",\"unpricedAline\":"<<aline<<",\"v4eInstructions\":"<<m.v4eExecuted()-v4before<<",\"observedStackBytes\":"<<sp-lo<<",\"returnD0\":"<<m.getD0()<<",\"guardsIntact\":"<<(guards?"true":"false")<<",\"expectedResult\":"<<(expected?"true":"false")<<'}';
 };
 for(int page:{0,1,2,3,4})for(int flat=12;flat<=17;flat++)for(int val:{-1,0,1,6,7,95,127,128,255}){
  reset();m.write32(0x460d1684,page);m68k_set_reg(m.getCpuState(),M68K_REG_D5,flat);m68k_set_reg(m.getCpuState(),M68K_REG_D1,val);
  expectedD1=std::max(0,std::min(val,page==2&&flat>=13&&flat<=16?std::vector<int>{1,6,95,7}[flat-13]:127));
  run("clamp-p"+std::to_string(page)+"-f"+std::to_string(flat)+"-v"+std::to_string(val),0x400d2522);
 }
 for(int mode:{0,1,2,3,4}){
  reset();m.write8(0x400d6ce4,0);if(mode){for(int i=0;i<46;i++)m.write8(msc+(mode==1?i:mode==2?2000+i:4050+i),i%128);}if(mode==4)for(unsigned i=0;i<4096;i++)m.write8(msc+i,i%128);
  run("pack-state-"+std::to_string(mode),0x400d2592);
 }
 for(int count:{0,1,32,46,47,255})for(int part:{0,1,3,15}){
  reset();m.write8(0x400d7c49,part);m.write16(bank+part*0x18b2+0x90522,0x4d53);m.write8(bank+part*0x18b2+0x90524,count);
  for(int i=0;i<46;i++){m.write16(bank+part*0x18b2+0x90526+i*3,(i*89)%4096);m.write8(bank+part*0x18b2+0x90528+i*3,i%128);}
  run("unpack-n"+std::to_string(count)+"-p"+std::to_string(part),0x400d268c);
 }
 for(int count:{0,1,16,32,46})for(int xf:{0,1,63,64,126,127})for(int value:{0,127}){
  reset();m.write32(0x460d16c8,xf);m.write16(bank+0x90522,0x4d53);m.write8(bank+0x90524,count);
  for(int i=0;i<count;i++){unsigned id=(i%8)*32+18+(i/8)%12;m.write16(bank+0x90526+i*3,id+(i%2)*256);m.write8(bank+0x90528+i*3,value);m.write8(msc+id+(i%2)*256,value);}
  run("xf-n"+std::to_string(count)+"-x"+std::to_string(xf)+"-v"+std::to_string(value),0x400d28c8);
 }
 reset();run("pattern-part-commit",0x400c4704);
 std::cout<<"],\"failures\":"<<failures<<",\"writes\":[";first=true;for(auto [a,b]:writes){if(!first)std::cout<<',';first=false;std::cout<<"{\"page\":"<<a<<",\"first\":"<<*b.begin()<<",\"last\":"<<*b.rbegin()<<",\"uniqueBytes\":"<<b.size()<<'}';}std::cout<<"]}\n";
 return failures ? 1 : 0;
}
