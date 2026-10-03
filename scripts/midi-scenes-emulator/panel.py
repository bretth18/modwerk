# SPDX-License-Identifier: GPL-3.0-or-later
from pathlib import Path
import argparse,subprocess,selectors,os,time,json,hashlib,signal
p=argparse.ArgumentParser();p.add_argument('--emulator',required=True);p.add_argument('--name',required=True);p.add_argument('--stress',action='store_true');p.add_argument('--work',type=Path,required=True);p.add_argument('--no-instrumentation',action='store_true');a=p.parse_args();w=a.work
keys={'FUNC':0x2d,'SRC':0x22,'AMP':0x23,'LFO':0x24,'FX1':0x25,'FX2':0x26,'YES':0x31,'NO':0x32,'MIDI':0x35,'PART':0x1d,'PLAY':0x28,'STOP':0x27,'A':0x19,'B':0x1a,'PTN':0x2e,**{f'T{i+1}':0x10+i for i in range(8)},**{f'TRIG{i+1}':i for i in range(16)},**{f'PUSH {c}':0x38+i for i,c in enumerate('ABCDEF')}}
plane=w/(a.name+'-lcd.private.bin');live=w/(a.name+'-live.private.txt');live.write_text('')
argv=[a.emulator,'--image',str(w/'mainos.bin'),'--card',str(w/('stress.img' if a.stress else 'empty.img')),'--dsp','--frame','--ms','3000','--interactive','--lcd',str(plane),'--main-level','64' if a.stress else 'off','--rtc','1000000000','--mkii','--internal-clock']
if a.stress:argv+=['--mount','--set','MIDISC','--project','MEASURE']
env=dict(os.environ);env.pop('MIDISC_MEASURE_OUTPUT',None)
if not a.no_instrumentation:env['MIDISC_MEASURE_OUTPUT']=str(w/(a.name+'-runtime.json'))
port=subprocess.Popen(argv,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=(w/(a.name+'-stderr.private.txt')).open('wb'),cwd=w,env=env)
poll=selectors.DefaultSelector();poll.register(port.stdout,selectors.EVENT_READ);pending=b'';rows=[0]*8;steps=[];tx=hashlib.sha256();txbytes=0;frames=[];peeks=[];screens=[];loaded=False
signal.signal(signal.SIGALRM,lambda *_:(_ for _ in ()).throw(TimeoutError('Session limit')));signal.alarm(900)
def response(prefix,timeout=180):
 global pending,loaded
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  while b'\n' in pending:
   line,pending=pending.split(b'\n',1)
   if b'LOAD PROJECT handled' in line:loaded=True
   if line.startswith(prefix):return line.decode()
   if line.startswith(b'err'):raise RuntimeError(line.decode())
  if port.poll() is not None:raise RuntimeError('emulator exited')
  if poll.select(1):pending+=os.read(port.stdout.fileno(),65536)
 raise TimeoutError('command did not complete')
def send(s):
 port.stdin.write((s+'\n').encode());port.stdin.flush();r=response((b'ok',b'run ',b'peek ',b'tx ',b'status ',b'audio ',b'midi-status '));
 if len(steps)%50==0:print(a.name,'commands',len(steps)+1,flush=True)
 steps.append({'command':s,'reply':r.split(' wall=')[0]})
 if s.startswith('run '):
  if 'stop=time' not in r:raise RuntimeError('run stopped: '+r)
  frames.append(r.split(' wall=')[0])
 return r
def advance(ms):return send('run '+str(ms))
def key(name,down):
 code=keys[name];row=code>>3;bit=1<<(code&7);rows[row]=(rows[row]|bit) if down else (rows[row]&~bit);send(f'key {0x20|row} {rows[row]}');advance(50)
def press(*names):
 for name in names:key(name,True)
 for name in reversed(names):key(name,False)
def encoder(name,delta):send(f'knob {0x30+"ABCDEF".index(name)} {delta&255}');advance(200)
def observe(label):
 global txbytes
 screens.append({'label':label,'lcdSha256':hashlib.sha256(plane.read_bytes()).hexdigest()})
 for address,length in [(0x400d6d60,8),(0x800065b4,12),(0x46c76dc0,544)]:
  val=send(f'peek {hex(address)} {length}');peeks.append({'label':label,'address':address,'sha256':hashlib.sha256(val.encode()).hexdigest()})
 line=send('tx');parts=line.split();data=bytes.fromhex(''.join(part for part in parts[1:] if '=' not in part));tx.update(data);txbytes+=len(data)
try:
 response(b'ready ',timeout=600)
 if a.stress and not loaded:raise RuntimeError('project was not loaded')
 advance(100);press('YES');advance(100);press('NO');press('MIDI')
 tracks=8 if a.stress else 1
 for track in range(tracks):
  press('T'+str(track+1));press('FUNC','SRC');encoder('A',-127);encoder('A',track+1);press('YES');press('SRC')
  press('FUNC','FX1');encoder('C',-127);encoder('C',-127);encoder('C',74);press('YES');press('FX1');press('FUNC','PUSH C')
  key('A',True);press('TRIG1');encoder('C',64);key('A',False)
  key('B',True);press('TRIG2');encoder('C',127);key('B',False)
  observe('track-'+str(track+1))
 if a.stress:
  send('audio start tracks');press('PLAY');advance(2000)
  for pattern in range(4):
   key('PTN',True);press('TRIG'+str(pattern+1));key('PTN',False)
   for xf in [0,1,63,64,126,127,0]:
    send('pot '+str(xf*2))
    send('midi b0 01 00 b0 01 7f b0 4a 40');advance(200)
   send('audio status');send('midi-status');observe('pattern-'+str(pattern+1))
  press('STOP');advance(500)
  import struct
  reply=send('audio read 1000000');_,n,pcm=reply.split();data=bytes.fromhex(pcm);values=struct.unpack('<'+'h'*(len(data)//2),data)
  assert len(values)==int(n)*24
  audio={'frames':int(n),'sha256':hashlib.sha256(data).hexdigest(),'tracks':[{'track':t+1,'peak':max(abs(v) for c in (8+2*t,9+2*t) for v in values[c::24]),'nonzeroSamples':sum(v!=0 for c in (8+2*t,9+2*t) for v in values[c::24])} for t in range(8)]}
  steps[-1]['reply']='audio '+n+' sha256='+audio['sha256']
 observe('complete');send('quit');port.wait(10)
 result={'schemaVersion':1,'name':a.name,'projectLoaded':loaded,'panelUartBytes':txbytes,'panelUartSha256':tx.hexdigest(),'steps':steps,'screens':screens,'peeks':peeks,'frames':frames,'status':'passed','audio':audio if a.stress else None}
 (w/(a.name+'-panel.private.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'name':a.name,'status':'passed','commands':len(steps),'panelUartBytes':txbytes,'lastFrame':frames[-1]}))
finally:
 signal.alarm(0)
 if port.poll() is None:port.terminate();port.wait(10)
 poll.close()
