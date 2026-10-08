import json,sys
from pathlib import Path
base=Path(__file__).resolve().parent
sys.path.insert(0,str(base/'baseline'))
import dsp909,dsp808
dsp909.DSP_ASM=Path('/opt/toolchain/vendor/dsp56300/build/source/dsp_host/dsp_asm')
dsp909.DISASM=Path('/opt/toolchain/vendor/dsp56300/build/source/disassemble/dsp56kDisassemble')
lay=dsp909.default_layout(0x1000)
for name,prefix,source,data in [('909','zq',dsp909.source(lay),dsp909.data_lines(lay)),('808','zv',dsp808.source(dsp808.layout(0x3200),lay),dsp909.data_lines(lay)+dsp808.data_lines(dsp808.layout(0x3200)))]:
 syms,_=dsp909.assemble(0x2000,{},base/'baseline'/f'{name}.bin',source)
 (base/'baseline'/f'{name}.json').write_text(json.dumps(syms))
 (base/'baseline'/f'{name}.data').write_text(data)
