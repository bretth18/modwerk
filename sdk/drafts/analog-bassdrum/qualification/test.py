import array,json,math,subprocess,sys
from pathlib import Path
base=Path(__file__).resolve().parent;root=base/'native'
sys.path.insert(0,str(root/'tools/harness'))
import bd909,bd808,dsp909,dsp808
out=base/'tests';out.mkdir(exist_ok=True)
syms={name:module.build() for name,module in [('909',bd909),('808',bd808)]}
def run(name,blocks,tag,baseline=False,frames=16,input_samples=None,code=None,labels=None,data=None,org=0x2000):
 p=out/tag;p.with_suffix('.script').write_text(''.join(' '.join(map(str,k))+f' {-1 if t is None else t}\n' for k,t in blocks))
 prefix='zq' if name=='909' else 'zv'
 labels=labels or (json.loads((base/'baseline'/f'{name}.json').read_text()) if baseline else syms[name])
 folder=base/'baseline' if baseline else root/f'out/bd{name}'
 args=[str(bd909.HOST),'-code',str(code or folder/(f'{name}.bin' if baseline else f'bd{name}.bin')),'-org',f'{org:x}','-entry',f'{labels[prefix+"01"]:x}','-init',f'{labels[prefix+"02"]:x}','-data',str(data or folder/(f'{name}.data' if baseline else f'bd{name}.data')),'-script',str(p.with_suffix('.script')),'-out',str(p.with_suffix('.raw')),'-state',str(p.with_suffix('.state')),'-meter',str(p.with_suffix('.meter')),'-frames',str(frames)]
 if input_samples is not None:
  p.with_suffix('.in').write_bytes(array.array('i',input_samples).tobytes());args += ['-input',str(p.with_suffix('.in'))]
 subprocess.run(args,check=True,capture_output=True)
 a=array.array('i');a.frombytes(p.with_suffix('.raw').read_bytes());assert a[::2]==a[1::2]
 return a[::2],[[int(v,16) for v in line.split()] for line in p.with_suffix('.state').read_text().splitlines()],list(map(int,p.with_suffix('.meter').read_text().split()))
report={'static':[],'automation':[],'coefficientSteps':[],'combined':[]}
for name,initial in [('909',bd909.INIT),('808',bd808.INIT)]:
 patches=[]
 for sat in (0,64,127):
  k=initial.copy();k[5]=sat;patches.append((f'sat{sat}',k))
 for label,value in (('minimum',0),('maximum',127)):
  k=[value]*12;k[6]=initial[6];patches.append((label,k))
 for label,k in patches:
  blocks=bd909.hits(k,seconds=.3,at=tuple(32+32*i+i for i in range(16))+(1200,4000,))
  a,_,counts=run(name,blocks,f'{name}-constant-{label}')
  b,_,_=run(name,blocks,f'{name}-baseline-{label}',baseline=True)
  assert a==b,(name,label,'constant audio changed')
  report['static'].append({'engine':name,'patch':label,'samples':len(a),'maxInstructionsPerBlock':max(counts)})
  print('PASS static exact',name,label,flush=True)
 # Stepped 127-position sweeps while the voice is sounding, plus rapid retriggers.
 for controls in ((4,),(5,),(4,5)) if name=='909' else ((5,),):
  blocks=[]
  for b in range(1800):
   k=initial.copy();k[1]=127
   for slot in controls:k[slot]=(b//4*7)%128
   blocks.append((k,b%16 if b%173==0 else None))
  a,_,counts=run(name,blocks,f'{name}-moving-'+''.join(map(str,controls)))
  voice=dsp909.Voice() if name=='909' else dsp808.Voice()
  ref=[v for k,t in blocks for v in voice.block(k,t)]
  error=bd909.err_db([v/8388608 for v in a],ref)
  assert error < -45,(name,controls,error)
  assert any(a) and max(map(abs,a))<=8388608
  report['automation'].append({'engine':name,'controls':controls,'referenceErrorDb':error,'maxInstructionsPerBlock':max(counts)})
  print('PASS automation',name,controls,round(error,2),'dB',max(counts),'instructions/block',flush=True)
 # One sample on either side of a full-range jump proves actual DSP slew,
 # including the coarse TDEP thump coefficient; no trigger resets history.
 k=initial.copy();k[4]=k[5]=0
 h=k.copy();h[4]=h[5]=127
 a,states,_=run(name,[(k,None),(h,0),(k,0)],f'{name}-single-step',frames=1)
 assert states[0][61] == 0
 assert states[1][61] == (127 << 16) >> 6
 assert states[2][61] == states[1][61] + ((-states[1][61]) >> 6)
 pairs=([(21,25),(22,29)] if name=='909' else [])
 for current,target in pairs:
  old=states[0][current];dest=states[1][target]
  signed=lambda v:(v^0x800000)-0x800000
  expected=signed(old)+((signed(dest)-signed(old))>>6)
  assert signed(states[1][current])==expected,(name,current,expected,signed(states[1][current]))
  down=signed(states[1][current])+((signed(states[2][target])-signed(states[1][current]))>>6)
  assert signed(states[2][current])==down
 report['coefficientSteps'].append({'engine':name,'coefficients':pairs,'pass':True})
 print('PASS native up/down coefficient slew with retrigger',name,flush=True)
# Compact combined routines must render exactly like standalone on both origins.
sys.path.insert(0,str(root/'tools/build'))
import ab_image
lay,vbase=ab_image.layout();data=out/'combined.data';data.write_text(dsp909.data_lines(lay)+dsp808.data_lines(dsp808.layout(ab_image.TABLES808)))
for tag,c in ab_image.PAY.items():
 words,labels=ab_image.assemble(c['spring'],c['cont'],lay,vbase,tag)
 for name,initial in [('909',bd909.INIT),('808',bd808.INIT)]:
  blocks=[]
  for b in range(600):
   k=initial.copy();k[4]=(b*13)%128;k[5]=(b*7)%128
   blocks.append((k,b%16 if b%43==0 else None))
  a,_,counts=run(name,blocks,f'{tag}-{name}-shared',code=ab_image.OUT/f'ab_{tag}.bin',labels=labels,data=data,org=c['spring'])
  b,_,_=run(name,blocks,f'{tag}-{name}-inline')
  assert a==b,(tag,name,'shared desk changed audio')
  report['combined'].append({'core':tag,'engine':name,'codeWords':len(words),'maxInstructionsPerBlock':max(counts),'audioIdenticalToStandalone':True})
  print('PASS combined',tag,name,len(words),'words',max(counts),'instructions/block',flush=True)
(base/'report.json').write_text(json.dumps(report,indent=2)+'\n')
