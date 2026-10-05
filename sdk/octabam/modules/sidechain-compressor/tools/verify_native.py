# Run only inside a network/credential-isolated pinned native proof workspace.
import sys,pathlib,hashlib,json,subprocess
sys.path.insert(0,str(pathlib.Path('tools').resolve()))
sys.path.insert(0,str(pathlib.Path('modules/sidechain-compressor/upstream/tools').resolve()))
import toolpath,sc_tables,dsp_asm_util
from dsp_modmap import modules,PAYLOADS,BASE
from remix import registry
ROOT=pathlib.Path('oracle').resolve()
SC_SRC=pathlib.Path('modules/sidechain-compressor/upstream/tools/patch_sc_dsp3.asm').resolve()
(ROOT/'out').mkdir(parents=True,exist_ok=True)
DSP_ASM=pathlib.Path('vendor/dsp56300/build/source/dsp_host/dsp_asm').resolve()
DIS=pathlib.Path('vendor/dsp56300/build/source/disassemble/dsp56kDisassemble').resolve()
DONOR_WORDS=1063
exec(compile(pathlib.Path('modules/sidechain-compressor/upstream/tools/sc_assemble_oracle.py').read_text(),'sc_assemble_oracle.py','exec'))
image=pathlib.Path('out/mainos_bus.bin').read_bytes()
stock=pathlib.Path('out/raw/section_3_MAIN_OS.bin').read_bytes()
assert hashlib.sha256(stock).hexdigest()=='164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e', 'Original 1.40C base required'
def read_word(tag,space,address,blob=image):
    va,length=next((va,ln) for t,va,ln in PAYLOADS if t==tag)
    records,data=modules(blob,va,length)
    r=next(r for r in records if r[0]==space and r[1]<=address<r[1]+r[2])
    off=r[3]+(address-r[1])*3
    return int.from_bytes(data[off:off+3],'little')
m=registry.by_key('SIDECHAIN_COMPRESSOR')
proofs=[]
for tag,org,table in [('A',0x1282,0x1252),('B',0x1042,0x1012)]:
    tok={x:m.dsp.subst[tag]['@'+y+'@'] for x,y in [('corebase','COREBASE'),('fcorebase','FCOREBASE'),('sbase','SBASE'),('fsbase','FSBASE'),('gcnt','GCNT'),('gseed','GSEED'),('foreign_br','FOREIGN_BR')]}
    author,tap,det,mon=sc_assemble(tok,org)
    code=author[:-48]
    actual=[read_word(tag,0,org+i) for i in range(len(code))]
    diff=[i for i,(a,b) in enumerate(zip(code,actual)) if a!=b]
    assert len(code)==340 and len(diff)==3, (tag,len(code),diff)
    assert code[diff[0]]==org+340 and actual[diff[0]]==table
    assert diff[2]==diff[1]+1 and code[diff[2]]==org+340+16 and actual[diff[2]]==0
    source=SC_SRC.read_text()
    transformed=source
    for marker,value in m.dsp.subst[tag].items(): transformed=transformed.replace(marker,value)
    transformed=transformed.replace('$fab1e0','$'+format(table,'x'))
    a=ROOT/'out/native-template.asm';a.write_text(transformed)
    b=ROOT/'out/native-template.bin'
    subprocess.run([str(DSP_ASM),'-in',str(a),'-org',f'{org:x}','-out',str(b)],check=True,stdout=subprocess.DEVNULL)
    raw=b.read_bytes()
    expected=[int.from_bytes(raw[i:i+3],'little') for i in range(0,len(raw),3)]
    assert expected==actual
    assert [read_word(tag,0,table+i) for i in range(48)]==author[-48:]
    for addr in [0x215+0x18,0x235+0x18]:
        assert read_word(tag,1,addr)==read_word(tag,1,addr,stock)
    proofs.append(dict(payload=tag,codeWords=len(code),tableWords=48,normalizedDifferences=diff,codeSha256=hashlib.sha256(b''.join(w.to_bytes(3,'big') for w in actual)).hexdigest(),tableSha256=hashlib.sha256(b''.join(w.to_bytes(3,'big') for w in author[-48:])).hexdigest(),stockCompressorDispatchPreserved=True))
report=dict(schemaVersion=1,moduleId='sidechain-compressor',moduleVersion='0.1.0-experimental',imageSha256=hashlib.sha256(image).hexdigest(),baseSha256=hashlib.sha256(stock).hexdigest(),standaloneInstructionParity=proofs,coldfireReference=dict(bytes=134,sha256='24853ca8ce0095ff9e4c4f4184416f0f439b34cc4deded006396eccc2befcc9e',status='builder-verified'),hardware='upstream author report only',worstCaseCycles=None,browserParity=None)
pathlib.Path('native-evidence.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
