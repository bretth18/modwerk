import array,json,subprocess,sys
from pathlib import Path
base=Path(__file__).resolve().parent;root=base/'native';out=base/'tests'
sys.path.insert(0,str(root/'tools/build'));sys.path.insert(0,str(root/'modules/analog-bassdrum'))
import ab_image,dsp909,dsp808
lay,vbase=ab_image.layout();data=out/'multi.data';data.write_text(dsp909.data_lines(lay)+dsp808.data_lines(dsp808.layout(ab_image.TABLES808)))
initial=[[64,127,64,0,64,0,1,40,0,64,64,0],[74,127,80,20,80,100,0,60,64,64,64,0],[50,110,100,10,20,20,1,50,127,64,64,0],[90,60,40,40,30,10,0,70,1,64,64,0]]
streams=[]
for v,k in enumerate(initial):
 blocks=[]
 for b in range(400):
  h=k.copy();h[4]=(b*(v+3))%128;h[5]=(b*(v+5))%128
  blocks.append((h,b%16 if b%47==v else -1, v, int(v==0 and b==211)))
 streams.append(blocks)
def render(tag,c,labels,rows,name):
 script=out/f'multi-{tag}-{name}.script';raw=script.with_suffix('.raw')
 script.write_text(''.join(' '.join(map(str,k))+f' {t} {v} {reset}\n' for k,t,v,reset in rows))
 subprocess.run([str(base/'multi_host'),'-code',str(ab_image.OUT/f'ab_{tag}.bin'),'-org',f'{c["spring"]:x}','-entry',f'{labels["zq01"]:x}','-init',f'{labels["zq02"]:x}','-entry808',f'{labels["zv01"]:x}','-init808',f'{labels["zv02"]:x}','-voices','4','-data',str(data),'-script',str(script),'-out',str(raw)],check=True,capture_output=True)
 return raw.read_bytes()
report=[]
for tag,c in ab_image.PAY.items():
 _,labels=ab_image.assemble(c['spring'],c['cont'],lay,vbase,tag)
 together=render(tag,c,labels,[streams[v][b] for b in range(400) for v in range(4)],'interleaved')
 for v in range(4):
  alone=render(tag,c,labels,streams[v],f'voice{v}')
  interleaved=b''.join(together[(4*b+v)*128:(4*b+v+1)*128] for b in range(400))
  assert interleaved==alone,(tag,v,'voice leaked or reset changed another')
  a=array.array('i');a.frombytes(alone);assert any(a),'silent voice'
 report.append({'core':tag,'simultaneousVoices':4,'engines':['909','808','909','808'],'differentPatches':True,'editingAndResetIsolation':True,'audioBitIdenticalToEachVoiceAlone':True})
 print('PASS four interleaved voices, distinct patches and isolated reset on core',tag,flush=True)
(base/'multi-report.json').write_text(json.dumps(report,indent=2)+'\n')
