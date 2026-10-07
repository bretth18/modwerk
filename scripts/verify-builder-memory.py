"""Stock-free native memory integration checks. Run only in the SDK container."""
import json,pathlib,sys,tempfile
from unittest.mock import patch
if not pathlib.Path('/.dockerenv').exists():
    raise SystemExit('Run this verification in the isolated SDK toolchain container.')
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'sdk/octabam/tools'))
import toolpath
from remix import platform_build
from remix.schema import Linked
BASE=0x40a955e0
with tempfile.TemporaryDirectory(prefix='modwerk-memory.') as temporary:
    root=pathlib.Path(temporary)
    def build(name,bss,reserve,regions,own_ring=False):
        source=root/(name+'.s')
        source.write_text('.text\n.globl entry\nentry: .long ring\n.data\n.long 0x12345678\n.bss\n.balign 64\n.globl scratch\nscratch: .space '+str(bss)+('\n.globl ring\nring: .space 4\n' if own_ring else '\n'))
        unit=Linked('fixture',str(source),dram=True)
        with patch.object(platform_build,'stock_guard',return_value=b'\0'*6):
            result=platform_build.build([('FIXTURE',unit)],[],root/name,reserve=(BASE,reserve),regions=regions)
        return result,json.loads((root/name/'layout.json').read_text())
    (append,symbols,boot,names),layout=build('fits',8192,0x20000,[('ring',4096,256),('task_stack',1024,16)])
    assert append and names==['octabam'] and len(boot[2])==6
    assert layout['runtime_end']==BASE+len((root/'fits/runtime.raw').read_bytes())
    assert layout['bss_end']==symbols['_end'] and layout['bss_end']>layout['runtime_end']
    assert layout['regions']['ring']==[symbols['ring'],4096]
    assert symbols['ring']%256==0 and symbols['task_stack']%16==0
    assert max(layout['bss_end'],layout['stage_end'])<=symbols['task_stack']
    for name,bss,reserve,regions,own,expected in [
        ('too_much_bss',150000,0x20000,[('ring',4096,256)],False,'.bss'),
        ('region_overlap',16,32768,[('ring',24576,256)],False,'above DRAM region'),
        ('duplicate_region',16,0x20000,[('ring',64,16),('ring',64,16)],False,'duplicate DRAM'),
        ('source_redefinition',16,0x20000,[('ring',64,16)],True,'defines a declared'),
    ]:
        try:build(name,bss,reserve,regions,own)
        except SystemExit as error:assert expected in str(error),(name,str(error))
        else:raise AssertionError(name+' was accepted')
print('Native memory integration: BSS plus aligned DRAM regions fit; oversized BSS, region collision, duplicate symbols and source redefinition are refused. No firmware input or native code execution.')
