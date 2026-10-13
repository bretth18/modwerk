#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Private source/CF collector fixtures; queue under modwerk-check.lock.

No USB/boot. Original MAIN, linked binaries and receipts stay outside Git.
Task-byte completion deliberately cannot establish semantic Part completeness.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
import subprocess
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
import stock_hook_controllers as private_tools

MAIN_SHA='164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e'
RUNTIME_SHA='e2a1b0653cb0e89bcba3be63399c51e0b7427b2d02917c3260e8e5b204057a98'
CONTEXT_SHA='7c811eb9f3bccef7b03a129f2ebe00ba477422f07315e682f6211d761aacf44b'
ARCHIVES=('libot_machine.a','mc68k/lib68kEmu.a','dsp56300/dsp56kEmu/libdsp56kEmu.a',
    'dsp56300/dsp56kBase/libdsp56kBase.a','dsp56300/asmjit/libasmjit.a')
SPANS={
    'partUndoProducer':(0x400292a0,0x8c),
    'partClipboardProducer':(0x4002932c,0x48),
    'partPaste':(0x40029a4c,0xbc),
    'partUndoCallerSourceOnly':(0x40029b08,0x70),
    'partClipboardCaller':(0x40029b78,0x24),
}
sha=lambda data:hashlib.sha256(data).hexdigest()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--main',type=Path,required=True)
    parser.add_argument('--native',type=Path,required=True)
    parser.add_argument('--runtime-source',type=Path,required=True)
    parser.add_argument('--context-source',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args();stock=args.main.read_bytes()
    if sha(stock)!=MAIN_SHA:raise ValueError('Exact reviewed original MAIN is required.')
    runtime=args.runtime_source.read_bytes();context=args.context_source.read_bytes()
    if sha(runtime)!=RUNTIME_SHA or sha(context)!=CONTEXT_SHA:
        raise ValueError('Exact reviewed task/context source checkpoints are required.')
    def task_model(text):
        match=re.search(r'tasks\[\]\s*=\s*\{(.*?)\n\};',text,re.S)
        if not match:raise ValueError('Known task declaration is absent.')
        rows=re.findall(r'\{(0x[0-9a-f]+)u?\s*,\s*(0x[0-9a-f]+)u?\s*,\s*(0x[0-9a-f]+)u?\s*\}',match[1])
        if len(rows)!=11:raise ValueError('Exactly eleven reviewed task records are required.')
        return [tuple(int(v,16) for v in row) for row in rows]
    source=Path(__file__).resolve().parent
    if task_model(runtime.decode())!=task_model((source/'part_roots.c').read_text()):
        raise ValueError('Authored collector task geometry differs from the pinned board source.')
    out=private_tools._private.private_directory(args.out)
    if any(out.iterdir()):raise ValueError('Use an empty private output directory outside Git.')
    native=args.native.resolve()
    archives=[native/'out/emu'/p for p in ARCHIVES]
    if not all(p.is_file() for p in archives):raise ValueError('Fresh built native emulator archives required.')
    subprocess.run(['c++','-O2','-std=c++17','-I'+str(native/'tools/emu/ot_emu'),
        '-I'+str(native/'vendor'),'-I'+str(native/'vendor/dsp56300/source'),
        source/'part_roots_fixture.cpp',*archives,'-lpthread','-o',out/'probe'],check=True)
    results=[]
    def execute(argv,name):
        result=subprocess.run(argv,text=True,capture_output=True)
        private_tools._private.save(out/(name+'.log'),(result.stdout+result.stderr).encode())
        result.check_returncode();lines=[p for p in result.stdout.splitlines() if p.startswith('PASS ')]
        if len(lines)!=1:raise ValueError('Exactly one fixture summary is required.')
        print(lines[0],flush=True);return lines[0]
    results.append(dict(kind='originalStockClipboard',output=execute([out/'probe',args.main],'clipboard')))
    for origin in (0x40c10000,0x40c20000):
        stem=f'{origin:x}';ld=out/(stem+'.ld');elf=out/(stem+'.elf');raw=out/(stem+'.private.raw')
        private_tools._private.save(ld,('SECTIONS { . = '+hex(origin)+'; .text : { *(.text*) *(.rodata*) } '
            '.data : { *(.data*) } .bss : { *(.bss*) } }\n').encode())
        subprocess.run(['m68k-elf-gcc','-mcpu=54455','-msoft-float','-Os','-ffreestanding','-fno-builtin',
            '-Wall','-Wextra','-Werror','-nostdlib',source/'part_roots.c',source/'part_roots_driver.c',
            '-Wl,-T,'+str(ld),'-o',elf],check=True)
        subprocess.run(['m68k-elf-objcopy','-O','binary',elf,raw],check=True)
        symbols={}
        for line in subprocess.check_output(['m68k-elf-nm',elf],text=True).splitlines():
            fields=line.split()
            if len(fields)==3:symbols[fields[2]]=int(fields[0],16)
            if len(fields)==2 and fields[0]=='U':raise ValueError('Unresolved fixture import.')
        text=''.join(f'{key} {value:x}\n' for key,value in symbols.items())
        symbol_path=out/(stem+'.symbols');private_tools._private.save(symbol_path,text.encode())
        output=execute([out/'probe',args.main,raw,hex(origin),symbol_path],stem)
        results.append(dict(kind='authoredRootScan',origin=origin,imageBytes=raw.stat().st_size,
            imageSha256=sha(raw.read_bytes()),symbols=symbols,output=output))
    receipt=dict(schema=1,mainSha256=MAIN_SHA,
        runtimeSourceSha256=sha(runtime),contextSourceSha256=sha(context),taskGeometry=task_model(runtime.decode()),
        stockSpanHashes={key:dict(address=at,length=n,sha256=sha(stock[at-0x40000400:at-0x40000400+n])) for key,(at,n) in SPANS.items()},
        sourceHashes={name:sha((source/name).read_bytes()) for name in
            ('part_roots.c','part_roots.h','part_roots_driver.c','part_roots_fixture.cpp','probe_part_roots.py')},
        archives={str(p.relative_to(native)):sha(p.read_bytes()) for p in archives},results=results,
        limits=['Direct original-stock clipboard calls and authored synthetic task state; no actual backend/board snapshot.',
            'Undo producer/direct paste are executed; the undo dispatcher caller is source-inspected only.',
            'Byte scanning ended, but semantic Part completeness remains unknown. Whole old/new retirement is a separate gate.',
            'Executed instructions are not physical timing, cycles, frame-interrupt delivery or persistence evidence.',
            'No runtime wiring, package/source/generation adoption, DSP/audio qualification, USB writes, boot or public admission.'])
    private_tools._private.save(out/'receipt.json',receipt)

if __name__=='__main__':main()
