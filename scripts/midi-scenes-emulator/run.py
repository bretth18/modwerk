#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Explicit private MIDISC2.0 measurement. macOS only; never part of app checks."""
from pathlib import Path
import argparse, hashlib, importlib.util, json, os, shutil, subprocess, sys, tempfile
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,v): p.write_text(json.dumps(v,indent=2)+'\n')
def invoke(argv,**kw): return subprocess.run(list(map(str,argv)),check=True,**kw)
def worker(args):
    w=args.work; native=args.native; lock=json.loads((HERE/'native-inputs.json').read_text())
    for p,h in lock.items():
        if digest(native/p)!=h: raise ValueError('Review and repin changed native input: '+p)
    module=ROOT/'sdk/drafts/midi-scenes'
    recipe=json.loads((module/'recipe.json').read_text())
    spec=importlib.util.spec_from_file_location('local_patch',module/'patch.py'); patch=importlib.util.module_from_spec(spec);spec.loader.exec_module(patch)
    stock=args.stock.read_bytes(); image=patch.apply(stock);(w/'mainos.bin').write_bytes(image)
    regions=[(0x40000400+r['offset'],r['bytes']) for r in recipe['writes']]
    (w/'measure-ranges.h').write_text('static const std::vector<std::pair<uint32_t,uint32_t>> regions={'+','.join('{'+str(a)+','+str(n)+'}' for a,n in regions)+'};\n'+(HERE/'entries.h').read_text())
    shutil.copyfile(HERE/'measure.h',w/'measure.h')
    machine=(native/'tools/emu/ot_emu/machine.cpp').read_text()
    for name in ['step','stepFast']:
        start=machine.index('bool Machine::'+name+'()');i=machine.index('++m_instructions;',start)+len('++m_instructions;');machine=machine[:i]+'\n\t\tif(m_step) m_step(*this,p);'+machine[i:]
    (w/'machine.cpp').write_text(machine)
    main=(native/'tools/emu/ot_emu/main.cpp').read_text()
    assert main.count('ot::Machine m(img);')==1
    main=main.replace('#include "machine.h"','#include "machine.h"\n#include "measure.h"').replace('ot::Machine m(img);','ot::Machine m(img);\n\tMeasure measurement(m);')
    anchor='\t\t\tif(cmd == "midi")';assert main.count(anchor)==1
    main=main.replace(anchor,'''            if(cmd == "midi-status") {
                reply("midi-status bytes=" + std::to_string(_rtos.serialTx0().size())); continue;
            }
            if(cmd == "pot" && w.size() == 2) {
                uint64_t v=0;
                if(!parseNumber(w[1],v) || v>255) { reply("err pot range"); continue; }
                _rtos.panelIn({0x40, static_cast<uint8_t>(v)});
                reply("ok"); continue;
            }
'''+anchor)
    (w/'main.cpp').write_text(main)
    flags=['/usr/bin/c++','-O3','-DNDEBUG','-flto','-std=c++17', '-I'+str(w),'-I'+str(native/'tools/emu/ot_emu'),'-I'+str(native/'vendor'),'-I'+str(native/'vendor/dsp56300/source')]
    libraries=[native/p for p in lock if p.endswith('.a')]
    invoke(flags+[w/'main.cpp',w/'machine.cpp',*libraries,'-lpthread','-o',w/'ot_emu_measure'])
    invoke(flags+[HERE/'probe.cpp',*libraries,'-lpthread','-o',w/'probe'])
    probe=(HERE/'probe.cpp').read_text().replace('#include "machine.h"','#include "machine.h"\n#include "measure.h"').replace('ot::Machine m(img);','ot::Machine m(img); Measure measurement(m);')
    (w/'probe-instrumented.cpp').write_text(probe)
    invoke(flags+[w/'probe-instrumented.cpp',w/'machine.cpp',*libraries,'-lpthread','-o',w/'probe_instrumented'])
    for name,binary in [('probe',w/'probe'),('probe_instrumented',w/'probe_instrumented')]:
        env=dict(os.environ);env['MIDISC_MEASURE_OUTPUT']=str(w/'probe-instrumentation.json')
        with (w/(name+'.private.json')).open('w') as out: invoke([binary,w/'mainos.bin'],stdout=out,stderr=(w/(name+'-stderr.private.txt')).open('w'),env=env)
    focused=json.loads((w/'probe.private.json').read_text());assert focused['failures']==0
    assert (w/'probe.private.json').read_bytes()==(w/'probe_instrumented.private.json').read_bytes()
    invoke([sys.executable,'-B',HERE/'project.py',w,ROOT/'sdk/octabam',args.project])
    for name,extra in [('panel',[]),('eight-track',['--stress'])]:
        for mode,disabled in [('measured',[]),('reference',['--no-instrumentation'])]:
            invoke([sys.executable,'-B',HERE/'panel.py','--work',w,'--emulator',w/'ot_emu_measure','--name',name+'-'+mode,*extra,*disabled])
    panels={}
    for name in ['panel','eight-track']:
        measured=json.loads((w/(name+'-measured-panel.private.json')).read_text());reference=json.loads((w/(name+'-reference-panel.private.json')).read_text())
        # Exclude only run name. Compare every command reply, LCD/RAM fingerprint,
        # panel UART hash, sample/frame progression and actual generated audio.
        assert {k:v for k,v in measured.items() if k!='name'}=={k:v for k,v in reference.items() if k!='name'}
        stats=[s['reply'] for s in measured['steps'] if s['command'] in ['audio status','midi-status']]
        panels[name]={'status':measured['status'],'commands':len(measured['steps']),'projectLoaded':measured['projectLoaded'],'lastFrame':measured['frames'][-1],'audioAndMidiStatus':stats,'audio':measured['audio'],'instrumentationParity':True,'screens':measured['screens'],'stateFingerprints':measured['peeks'],'panelUartBytes':measured['panelUartBytes'],'panelUartSha256':measured['panelUartSha256'],'runtime':json.loads((w/(name+'-measured-runtime.json')).read_text())}
        if name=='eight-track':
            assert all(t['peak']>0 and t['nonzeroSamples']>0 for t in measured['audio']['tracks']), 'Silent fixture does not establish eight-track load'
            assert all('dropped=0' in x for x in stats if x.startswith('audio status'))
            assert int([x for x in stats if x.startswith('midi-status')][-1].split('=')[1])>0
            panels[name]['audioWorkloadStatus']='passed'
        panels[name]['runtime'].pop('patchPcCoverage');panels[name]['runtime']['executedPatchAddresses']=len(json.loads((w/(name+'-measured-runtime.json')).read_text())['patchPcCoverage'])
    for case in focused['cases']:case.pop('returnD0')
    memory=[]
    for a in [0x4000046c,0x4009700e]:
        offset=a-0x40000400;before=int.from_bytes(stock[offset:offset+4],'big');after=int.from_bytes(image[offset:offset+4],'big');assert before==0x40a955e0 and after==0x40aa75e0
        memory.append({'operandAddress':a,'originalBoundary':before,'newBoundary':after,'additionalReservedBytes':after-before})
    proof={'schemaVersion':1,'testedOn':'2026-10-03','id':'midi-scenes','moduleVersion':recipe['moduleVersion'],'upstreamRevision':recipe['upstream']['revision'],'recipeSha256':digest(module/'recipe.json'),'imageSha256':hashlib.sha256(image).hexdigest(),'nativeInputs':lock,'toolInputs':{p.name:digest(p) for p in sorted(HERE.iterdir()) if p.is_file()},'instrumentedEmulatorSha256':digest(w/'ot_emu_measure'),'focusedInstrumentationParity':True,'projectSeedHashes':{p.name:digest(p) for p in sorted(args.project.iterdir()) if p.is_file() and p.suffix in ['.work','.strd']},'cardSha256':digest(w/'stress.img'),'panels':panels,'scratchBoundaryOperands':memory,'chipWorstCaseCycles':None,'fullMemoryTotalBytes':None,'hardwareMeasured':False}
    save(w/'focused.json',focused);save(w/'emulator.json',proof)
    print(json.dumps({'status':'passed','focusedCases':len(focused['cases']),'instrumentationParity':True,'eightTrackAudio':panels['eight-track']['audio'],'scratchReservedBytes':memory[0]['additionalReservedBytes']}))
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--native',required=True,type=Path);p.add_argument('--stock',required=True,type=Path);p.add_argument('--project',required=True,type=Path);p.add_argument('--output',required=True,type=Path);p.add_argument('--worker',action='store_true',help=argparse.SUPPRESS);p.add_argument('--work',type=Path,help=argparse.SUPPRESS);a=p.parse_args()
    for key in ['native','stock','project','output']:setattr(a,key,getattr(a,key).resolve())
    if a.worker:return worker(a)
    if sys.platform!='darwin':p.error('This reviewed runner requires macOS sandbox-exec.')
    with tempfile.TemporaryDirectory(prefix='midisc-measure-',dir='/private/tmp') as tmp:
        w=Path(tmp)
        # Restrict reads to reviewed tooling and explicit local inputs; all writes
        # stay disposable. The child inherits no tokens and has no network.
        reads=[w,ROOT,a.native/'tools',a.native/'vendor',a.native/'out/emu',a.native/'.venv',a.stock,a.project]
        policy='(version 1)\n(allow default)\n(deny network*)\n(deny file-read* (subpath "/Users") (subpath "/private/tmp") (subpath "/private/var/folders"))\n'
        policy+='(allow file-read* '+ ' '.join('(subpath '+json.dumps(str(x))+')' for x in reads)+')\n(deny file-write*)\n(allow file-write* (subpath '+json.dumps(tmp)+') (literal "/dev/null"))\n(allow file-read-metadata)\n'
        (w/'private.sb').write_text(policy)
        env={'PATH':'/usr/bin:/bin:/opt/homebrew/bin','TMPDIR':tmp,'PYTHONDONTWRITEBYTECODE':'1','PYTHONUNBUFFERED':'1'}
        invoke(['/usr/bin/sandbox-exec','-f',w/'private.sb',a.native/'.venv/bin/python3','-B',HERE/'run.py', '--worker','--work',w,'--native',a.native,'--stock',a.stock,'--project',a.project,'--output',a.output],env=env)
        # These two files contain reviewed aggregate counters, addresses and hashes.
        # No firmware, RAM/LCD dumps, raw UART/PCM, cards or projects leave tmp.
        a.output.mkdir(parents=True,exist_ok=True)
        for name in ['focused.json','emulator.json']:shutil.copyfile(w/name,a.output/name)
if __name__=='__main__':main()
