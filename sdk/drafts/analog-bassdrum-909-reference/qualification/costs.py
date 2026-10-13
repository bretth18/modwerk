"""Matched old/new combined-image instruction counts, both DSP cores."""
import argparse,hashlib,importlib.util,json,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--sdk',type=Path,required=True)
p.add_argument('--baseline',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
a=p.parse_args()
if a.output.exists() or a.output.resolve().is_relative_to(a.sdk.resolve()):
    p.error('Use a new private output outside the SDK')
a.output.mkdir(parents=True)
sys.path[:0]=[str(a.sdk/'tools/build'),str(a.sdk/'modules/analog-bassdrum')]
import ab_image,dsp909,dsp808

def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
old909=module('approved909',a.baseline/'dsp909.py');old808=module('approved808',a.baseline/'dsp808.py');old808.dsp909=old909
old909.DSP_ASM=dsp909.DSP_ASM;old909.DISASM=dsp909.DISASM
host=a.sdk/'out/bd909/bd909_host';report=[]
for label,voice909,voice808,glue in [('approved013',old909,old808,a.baseline/'ab_glue.asm'),('candidate014',dsp909,dsp808,a.sdk/'modules/analog-bassdrum/ab_glue.asm')]:
    ab_image.dsp909=voice909;ab_image.dsp808=voice808;ab_image.GLUE=glue;ab_image.OUT=a.output/label
    lay,vbase=ab_image.layout();data=a.output/(label+'.data');data.write_text(voice909.data_lines(lay)+voice808.data_lines(voice808.layout(ab_image.TABLES808)))
    for tag,c in ab_image.PAY.items():
        words,syms=ab_image.assemble(c['spring'],c['cont'],lay,vbase,tag)
        for engine in ('909','808'):
            prefix='zq' if engine=='909' else 'zv';script=a.output/(tag+'-'+engine+'.script')
            # Identical controls, SAT/TDEP endpoints and all 16 trigger splits.
            blocks=[]
            for b in range(2048):
                k=[49,127,(b//128*13)%128,(b//64*19)%128,(b//16*7)%128,(b//32*11)%128,1 if engine=='909' else 0,100,64,64,64,0]
                if b%128<32:k[2]=k[3]=k[4]=k[5]=0
                if b%128>=96:k[2]=k[3]=k[4]=k[5]=127
                if b<128:k=[0]*12;k[6]=1 if engine=='909' else 0
                if b>=1920:k=[127]*12;k[6]=1 if engine=='909' else 0
                blocks.append((k,b%16 if b%17==0 else None))
            script.write_text(''.join(' '.join(map(str,k))+f' {-1 if t is None else t}\n' for k,t in blocks))
            meter=a.output/(label+'-'+tag+'-'+engine+'.meter')
            subprocess.run([str(host),'-code',str(ab_image.OUT/f'ab_{tag}.bin'),'-org',f'{c["spring"]:x}',
                            '-entry',f'{syms[prefix+"01"]:x}','-init',f'{syms[prefix+"02"]:x}',
                            '-data',str(data),'-script',str(script),'-out',str(a.output/(label+'-'+tag+'-'+engine+'.raw')),
                            '-meter',str(meter)],check=True,capture_output=True)
            counts=list(map(int,meter.read_text().split()));assert len(counts)==len(blocks)
            report.append({'revision':label,'core':tag,'engine':engine,'codeWords':len(words),
                           'meanInstructionsPerBlock':sum(counts)/len(counts),'maxInstructionsPerBlock':max(counts)})
changes=[]
for core in ('A','B'):
    for engine in ('909','808'):
        rows=[r for r in report if r['core']==core and r['engine']==engine];old,new=rows
        base=list(map(int,(a.output/f'approved013-{core}-{engine}.meter').read_text().split()))
        current=list(map(int,(a.output/f'candidate014-{core}-{engine}.meter').read_text().split()))
        ratio=max(n/o for n,o in zip(current,base));mean=new['meanInstructionsPerBlock']/old['meanInstructionsPerBlock']
        if engine=='808':assert current==base,'808 instruction cost changed'
        assert ratio<1.10,(core,engine,ratio,'Review increase above the 10% investigation threshold')
        changes.append({'core':core,'engine':engine,'maximumMatchedBlockIncreasePercent':100*(ratio-1),
                        'meanIncreasePercent':100*(mean-1)})
        print('PASS matched cost',core,engine,'max increase',round(100*(ratio-1),2),'%; 808 unchanged' if engine=='808' else '',flush=True)
sha=lambda q:hashlib.sha256(q.read_bytes()).hexdigest()
result={'schema':1,'date':'2026-10-09','candidateVersion':'0.1.4-experimental',
        'sourceFiles':{n:sha(a.sdk/'modules/analog-bassdrum'/n) for n in ('dsp909.py','bd909.asm','fit909.json')},
        'baselineFiles':{n:sha(a.baseline/n) for n in ('dsp909.py','bd909.asm','fit909.json')},
        'matchedConditions':'2048 16-sample blocks per engine/core; identical moving controls, all-controls-minimum/maximum patches and all 16 trigger splits.',
        'measure':'Executed DSP instructions; neither modeled chip cycles nor hardware timing',
        'results':report,'changes':changes,'investigationThresholdPercent':10,
        'thresholdNote':'A regression investigation threshold for this revision, not a hardware headroom guarantee.',
        'xAllocationChanged':False,'maximumFxLoad':'untested','physicalHardwareTiming':'unmeasured'}
(a.output/'report.json').write_text(json.dumps(result,indent=2)+'\n')
