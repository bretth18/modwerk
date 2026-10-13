"""Private native 0..127 control walks; use a run.py SDK and a new output."""
import argparse,array,hashlib,json,math,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--sdk',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
a=p.parse_args()
if a.output.exists() or a.output.resolve().is_relative_to(a.sdk.resolve()):
    p.error('Use a new private output outside the SDK')
a.output.mkdir(parents=True)
sys.path.insert(0,str(a.sdk/'modules/analog-bassdrum'))
import dsp909 as m
host=a.sdk/'out/bd909/bd909_host';folder=a.sdk/'out/bd909'
verified_code=a.output/'verified-code.bin'
syms,_=m.assemble(0x2000,m.default_layout(0x1000),verified_code)
assert verified_code.read_bytes()==(folder/'bd909.bin').read_bytes(),'Code changed after native gates'
knobs=[49,100,0,0,64,0,1,72,0,64,64,0]
names={0:'PITCH',1:'DECAY',2:'TUNE',3:'ATK',4:'TDEP',5:'SAT',7:'ACCNT',8:'LPF',9:'LOW',10:'HIGH'}
report=[]
for index,name in names.items():
    blocks=[]
    for value in range(128):
        k=knobs.copy();k[index]=value
        blocks.extend((k,0 if b==0 else None) for b in range(64))
    script=a.output/(name+'.script');raw=a.output/(name+'.raw')
    script.write_text(''.join(' '.join(map(str,k))+f' {-1 if t is None else t}\n' for k,t in blocks))
    subprocess.run([str(host),'-code',str(folder/'bd909.bin'),'-org','2000',
                    '-entry',f'{syms["zq01"]:x}','-init',f'{syms["zq02"]:x}',
                    '-data',str(folder/'bd909.data'),'-script',str(script),'-out',str(raw)],
                   check=True,capture_output=True)
    words=array.array('i');words.frombytes(raw.read_bytes())
    assert words[::2]==words[1::2],name+' stereo mismatch'
    samples=words[::2];v=m.Voice();ref=[z for k,t in blocks for z in v.block(k,t)]
    assert len(samples)==len(ref) and all(math.isfinite(z) for z in ref),name+' invalid output'
    err=sum((x/8388608-y)**2 for x,y in zip(samples,ref));power=sum(y*y for y in ref)
    db=10*math.log10(max(err,1e-30)/max(power,1e-30))
    assert db < -45,(name,db)
    levels=[]
    for value in range(128):
        hit=samples[value*1024:(value+1)*1024]
        levels.append({'value':value,'peak':max(map(abs,hit))/8388608,
                       'limitedSamples':sum(abs(z)>=8388607 for z in hit)})
    report.append({'control':name,'values':levels,'referenceErrorDb':db,
                   'note':'64 native blocks per value, retrigger at each step; stress walk, not isolated full decay.'})
    print('PASS 128 native values',name,round(db,2),'dB; limited',sum(q['limitedSamples'] for q in levels),flush=True)
# All data words and all affine fast-gain intermediates fit their fraction.
t,c,lists,meta=m.tables()
assert all(-1<=z<1 for row in list(t.values())+list(lists.values()) for z in row)
for i in range(128):
    gp=t['T_ATP'][i];gs=c['KGS']+4*gp*c['KFDR']
    assert 0<=gs<1,(i,gs)
monotone=lambda row:all(x<=y for x,y in zip(row,row[1:]))
for table in ('T_INCB','T_AP','T_GT','T_GD','T_ATP','T_VB','T_VA','T_TIN'):
    assert monotone(t[table]),table+' not monotone'
for table in ('T_DKP','T_DKD'):
    assert monotone(list(reversed(t[table]))),table+' not monotone'
sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest()
result={'schema':1,'date':'2026-10-09','candidateVersion':'0.1.4-experimental',
        'sourceFiles':{name:sha(a.sdk/'modules/analog-bassdrum'/name) for name in ('dsp909.py','bd909.asm','fit909.json')},
        'controls':report,'tableFractionsAndMonotonicity':True,'fastGainAll128ValuesPositiveAndBounded':True,
        'physicalControlPositions':'unknown between endpoints; no uniform sweep assumption',
        'limits':['This stress walk is an emulator range check, not a hardware test.',
                  'ACCNT/SAT/LOW/HIGH retain the existing gain and desk laws; combined loud settings can hit the final output limiter.']}
(a.output/'report.json').write_text(json.dumps(result,indent=2)+'\n')
