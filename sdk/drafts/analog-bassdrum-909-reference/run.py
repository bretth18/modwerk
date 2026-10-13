"""Run inside the read-only, network-disabled native toolchain container.

Compiled code, raw audio/state and WAV previews stay in --output. Only the
sanitized evidence.json is suitable for source control. No firmware is read.
"""
import argparse
import array
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import apply


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sdk', type=Path, default=HERE.parent.parent / 'octabam')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--toolchain', type=Path, default=Path('/opt/toolchain'))
    args = parser.parse_args()
    work = args.output.resolve()
    if work.exists():
        raise ValueError('Use a new output directory')
    work.mkdir(parents=True)
    root = work / 'native'
    record = apply.verify(args.sdk)
    apply.stage(args.sdk, root)
    (root / 'vendor').symlink_to(args.toolchain / 'vendor')
    base = work / 'baseline'
    shutil.copytree(args.sdk / 'modules/analog-bassdrum', base)
    sys.path[:0] = [str(root / 'tools/harness'), str(root / 'tools/build'), str(root / 'modules/analog-bassdrum')]
    import bd909, bd808, dsp909, dsp808, ab_image
    baseline909 = module('baseline909', base / 'dsp909.py')
    baseline808 = module('baseline808', base / 'dsp808.py')
    baseline808.dsp909 = baseline909
    tools = args.toolchain / 'vendor/dsp56300'
    libs = tools / 'build/source'
    assembler = tools / 'build/source/dsp_host/dsp_asm'
    disassembler = tools / 'build/source/disassemble/dsp56kDisassemble'
    for m in (dsp909, baseline909):
        m.DSP_ASM, m.DISASM = assembler, disassembler
    host = root / 'out/bd909/bd909_host'
    host.parent.mkdir(parents=True)
    flags = ['c++', '-O3', '-DNDEBUG', '-std=gnu++17', '-DASMJIT_STATIC', '-DDSP56300_DEBUGGER=0',
             '-DDSP56K_USE_PERF_JIT_PROFILING', '-DDSP56K_USE_VTUNE_JIT_PROFILING_API',
             '-I'+str(tools/'source'), '-I'+str(tools/'source/asmjit/src')]
    link = [str(libs / p) for p in ('dsp56kEmu/libdsp56kEmu.a', 'dsp56kBase/libdsp56kBase.a',
                                  'asmjit/libasmjit.a', 'vtuneSdk/libvtuneSdk.a')] + ['-lpthread', '-ldl']
    subprocess.run(flags + [str(root/'tools/harness/bd909_host/bd909_host.cpp')] + link + ['-o', str(host)], check=True)
    bd909.HOST = bd808.HOST = host
    labels = {'909': bd909.build(), '808': bd808.build()}
    baseline = {}
    for name, m in (('909', baseline909), ('808', baseline808)):
        layout = m.default_layout(0x1000) if name == '909' else m.layout(0x1000)
        code = base / (name+'.bin')
        syms, _ = baseline909.assemble(0x2000, layout, code, m.source(layout) if name == '909' else m.source(layout, baseline909.default_layout(0x3000)))
        data = base / (name+'.data')
        if name == '909':
            data.write_text(m.data_lines(layout))
        else:
            data.write_text(m.data_lines(layout)+baseline909.data_lines(baseline909.default_layout(0x3000)))
        baseline[name] = (code, syms, data)
    tests = work / 'tests'
    tests.mkdir()

    def render(name, blocks, tag, old=False, code=None, syms=None, data=None, org=0x2000):
        script, raw, meter = [tests/(tag+ext) for ext in ('.script', '.raw', '.meter')]
        script.write_text(''.join(' '.join(map(str,k))+f' {-1 if t is None else t}\n' for k,t in blocks))
        folder = root / ('out/bd'+name)
        if old:
            code, syms, data = baseline[name]
        prefix = 'zq' if name == '909' else 'zv'
        syms = syms or labels[name]
        subprocess.run([str(host), '-code', str(code or folder/('bd'+name+'.bin')), '-org', f'{org:x}',
                        '-entry', f'{syms[prefix+"01"]:x}', '-init', f'{syms[prefix+"02"]:x}',
                        '-data', str(data or folder/('bd'+name+'.data')), '-script', str(script),
                        '-out', str(raw), '-meter', str(meter)], check=True, capture_output=True)
        samples = array.array('i'); samples.frombytes(raw.read_bytes())
        assert samples[::2] == samples[1::2]
        return list(samples[::2]), list(map(int, meter.read_text().split()))

    report = {'reference': [], 'unchanged808': [], 'combined': [], 'previews': [], 'triggerOffsets': []}
    for name, initial in (('909', bd909.INIT), ('808', bd808.INIT)):
        cases = []
        for sat in (0,64,127):
            k=initial.copy();k[5]=sat;cases.append(('sat'+str(sat),k))
        for value in (0,127):
            k=[value]*12;k[6]=initial[6];cases.append(('endpoint'+str(value),k))
        for label,k in cases:
            blocks=bd909.hits(k,seconds=.5,at=tuple(32+32*i+i for i in range(16))+(1200,4000,))
            audio,counts=render(name,blocks,name+'-'+label)
            voice=dsp909.Voice() if name=='909' else dsp808.Voice()
            reference=[v for knobs,trig in blocks for v in voice.block(knobs,trig)]
            error=bd909.err_db([v/8388608 for v in audio],reference)
            absolute = (sum((a/8388608-b)**2 for a,b in zip(audio,reference))/len(audio))**.5
            peak_error=max(abs(a/8388608-b) for a,b in zip(audio,reference))
            quiet=label=='endpoint0' and absolute<5e-6 and peak_error<2e-5
            assert error < -45 or quiet,(name,label,error,absolute,peak_error)
            before,old_counts=render(name,blocks,name+'-'+label+'-base',old=True)
            if name=='808':
                assert audio==before,('808 changed',label)
                report['unchanged808'].append({'patch':label,'samples':len(audio),'bitIdentical':True})
            report['reference'].append({'engine':name,'patch':label,'errorDb':error,'rmsAbsoluteError':absolute,'peakAbsoluteError':peak_error,'quietQuantizationCase':quiet,'maxInstructionsPerBlock':max(counts),'baselineMaxInstructionsPerBlock':max(old_counts)})
            print('PASS native reference',name,label,round(error,2),'dB; peak',max(counts),'instructions/block',flush=True)
        blocks=[]
        for b in range(1800):
            k=initial.copy();k[1]=127;k[4]=(b//4*7)%128;k[5]=(b//4*11)%128
            blocks.append((k,b%16 if b%173==0 else None))
        audio,counts=render(name,blocks,name+'-moving')
        voice=dsp909.Voice() if name=='909' else dsp808.Voice()
        ref=[v for k,t in blocks for v in voice.block(k,t)]
        error=bd909.err_db([v/8388608 for v in audio],ref)
        assert error < -45,(name,error)
        if name=='808':
            before,_=render(name,blocks,name+'-moving-base',old=True)
            assert audio==before,'808 moving controls changed'
        report['reference'].append({'engine':name,'patch':'moving-depth-sat-retriggers','errorDb':error,'maxInstructionsPerBlock':max(counts)})
        print('PASS native moving controls',name,round(error,2),'dB',flush=True)
        # Exercise the real split at every frame, each from a fresh native init.
        # Untriggered voices must stay silent, and no hit may leak before its
        # requested sample. Free-running noise changes pulse strength only.
        idle,_=render(name,[(initial,None)]*128,name+'-idle')
        assert not any(idle),(name,'idle output')
        first=[]
        for offset in range(16):
            at=64+offset
            blocks=bd909.hits(initial,seconds=.04,at=(at,))
            audio,_=render(name,blocks,name+'-offset'+str(offset))
            assert not any(audio[:at]),(name,offset,'early trigger')
            first.append(next(i-at for i in range(at,len(audio)) if audio[i]))
            assert first[-1] < 16,(name,offset,'trigger delayed past block')
            voice=dsp909.Voice() if name=='909' else dsp808.Voice()
            ref=[v for k,t in blocks for v in voice.block(k,t)]
            assert bd909.err_db([v/8388608 for v in audio],ref)<-45,(name,offset)
        report['triggerOffsets'].append({'engine':name,'offsets':list(range(16)),
                                        'untriggeredSilence':True,'noEarlyOutput':True,
                                        'firstNonzeroAfterRequestedSample':first})
        print('PASS idle and all 16 native trigger offsets',name,flush=True)
    lay,vbase=ab_image.layout()
    data=tests/'combined.data'
    data.write_text(dsp909.data_lines(lay)+dsp808.data_lines(dsp808.layout(ab_image.TABLES808)))
    for tag,c in ab_image.PAY.items():
        words,syms=ab_image.assemble(c['spring'],c['cont'],lay,vbase,tag)
        for name,initial in (('909',bd909.INIT),('808',bd808.INIT)):
            blocks=[]
            for b in range(600):
                k=initial.copy();k[4]=(b*13)%128;k[5]=(b*7)%128
                blocks.append((k,b%16 if b%43==0 else None))
            together,counts=render(name,blocks,tag+'-'+name,code=ab_image.OUT/f'ab_{tag}.bin',syms=syms,data=data,org=c['spring'])
            alone,_=render(name,blocks,tag+'-'+name+'-standalone')
            assert together==alone,(tag,name,'combined audio differs')
            report['combined'].append({'core':tag,'engine':name,'codeWords':len(words),'maxInstructionsPerBlock':max(counts),'audioBitIdenticalToStandalone':True})
            print('PASS combined',tag,name,len(words),'P words',flush=True)
    # Use the existing, source-pinned multiple-instance host/gate.
    helpers=HERE/'qualification'
    subprocess.run(flags+[str(helpers/'multi_host.cpp')]+link+['-o',str(work/'multi_host')],check=True)
    shutil.copy2(helpers/'multi-test.py',work/'multi-test.py')
    subprocess.run([sys.executable,str(work/'multi-test.py')],cwd=work,check=True)
    report['instanceIsolation']=json.loads((work/'multi-report.json').read_text())

    def wav(path, values):
        with wave.open(str(path),'wb') as w:
            w.setnchannels(1);w.setsampwidth(3);w.setframerate(44100)
            w.writeframes(b''.join((v&0xffffff).to_bytes(3,'little') for v in values))
    k=[49,100,0,0,64,0,1,72,0,64,64,0]
    # Five rising Attack levels, eight equal high-Attack hits, then Tune.
    hit_knobs=[(0,a) for a in (0,32,64,96,127)]+[(0,127)]*8+[(t,64) for t in (0,32,64,96,127)]
    # Construct the audition script directly to avoid dropping the offset-8
    # hit at a knob boundary.
    blocks=[]
    for b in range((len(hit_knobs)*37800)//16):
        sample=b*16;hit=min(len(hit_knobs)-1,sample//37800);tune,atk=hit_knobs[hit]
        next_hit=(sample+15)//37800
        trig=None
        if next_hit>hit or sample%37800==0:
            event=next_hit if next_hit>hit else hit
            tune,atk=hit_knobs[event];trig=event*37800-sample
        knobs=k.copy();knobs[2]=tune;knobs[3]=atk;blocks.append((knobs,trig))
    for old,label in ((True,'current-013'),(False,'candidate-014')):
        audio,_=render('909',blocks,'audition-'+label,old=old)
        wav(work/(label+'.wav'),audio)
        report['previews'].append({'name':label,'peak':max(map(abs,audio))/8388608,'limitedSamples':sum(abs(v)>=8388607 for v in audio),'sha256':hashlib.sha256((work/(label+'.wav')).read_bytes()).hexdigest(),'controls':k,'bpm':70,'hitControls':hit_knobs})
        if not old:
            peaks=[max(map(abs,audio[i*37800:i*37800+441]))/8388608 for i in range(5,13)]
            mean=sum(peaks)/len(peaks)
            spread=(sum((v-mean)**2 for v in peaks)/len(peaks))**.5/mean
            assert .005<spread<.05,('repeat attack variation',spread)
            replay,_=render('909',blocks,'audition-deterministic-replay')
            assert audio==replay,'Noise init/replay changed'
            report['neighborVariation']={'equalControlHits':8,'peakValues':peaks,
                                         'peakCoefficientOfVariation':spread,
                                         'deterministicReplayBitIdentical':True,
                                         'pulseSeedRange':[dsp909.PU['jitter_base']-dsp909.PU['jitter_depth'], dsp909.PU['jitter_base']+dsp909.PU['jitter_depth']],
                                         'randomTriggerDelay':False,'randomPitch':False}
    evidence={'schema':1,'moduleId':'analog-bassdrum','candidateVersion':record['version'],'date':'2026-10-09',
              'baseFiles':record['baseFiles'],'candidateFiles':record['candidateFiles'],
              'toolchainFiles':{str(p.relative_to(tools)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (assembler,disassembler)},
              'native':report,'physicalHardware':'untested','firmwarePersistence':'untested for candidate',
              'worstCaseChipCycles':'unmeasured','fullChainAndMaximumFxLoad':'untested',
              'publication':'Private candidate; approved public 0.1.3 remains unchanged'}
    (work/'evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
    print('PASS native candidate gates; firmware/hardware qualification pending',flush=True)


if __name__=='__main__':
    main()
