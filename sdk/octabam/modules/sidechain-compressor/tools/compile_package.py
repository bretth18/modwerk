"""Compile only authored Sidechain code/tables. No firmware or native manifest execution."""
from pathlib import Path
import hashlib, importlib.util, json, subprocess, tempfile
SHA=lambda b:hashlib.sha256(b).hexdigest()
def compile_package(folder, vendor, provenance, revision):
    folder=Path(folder); vendor=Path(vendor)
    spec=importlib.util.spec_from_file_location("sidechain_tables",folder/"upstream/tools/sc_tables.py")
    tables=importlib.util.module_from_spec(spec);spec.loader.exec_module(tables)
    layout=json.loads((folder/"release-layout.json").read_text())
    with tempfile.TemporaryDirectory(prefix="sidechain-source.") as temporary:
        out=Path(temporary)
        def run(*args): subprocess.run([str(a) for a in args],check=True,stdout=subprocess.DEVNULL)
        run("m68k-elf-as","-mcpu=5475","-o",out/"cf.o",folder/"upstream/tools/patch_sidechain.s")
        run("m68k-elf-ld","-Ttext=0x400d6d00","-o",out/"cf.elf",out/"cf.o")
        run("m68k-elf-objcopy","-O","binary","-j",".text",out/"cf.elf",out/"cf.bin")
        blobs={"coldfire":(out/"cf.bin").read_bytes()}
        for tag,table,org,core,foreign,sbase,fsbase,gcnt,gseed,branch in [
            ("A",0x1252,0x1282,4,0,"$33e00","$3be00","$33dff","$33dfe","beq zz24"),
            ("B",0x1012,0x1042,0,4,"$3be00","$33e00","$3bdff","$3bdfe","bne zz24")]:
            source=(folder/"upstream/tools/patch_sc_dsp3.asm").read_text()
            values={"COREBASE":str(core),"FCOREBASE":str(foreign),"SBASE":sbase,"FSBASE":fsbase,"GCNT":gcnt,"GSEED":gseed,"FOREIGN_BR":branch,"LPEDGE":f"$"+format(tables.lp_edge(),"x"),"HPEDGE":f"$"+format(tables.hp_edge(),"x"),"KGNA":f"$"+format(tables.kgn_smooth_a(),"x"),"FTAB_R1":"lua     (r1+$10),r1\n        nop"}
            for marker,value in values.items():source=source.replace("@"+marker+"@",value)
            source=source.replace("$fab1e0","$"+format(table,"x"))
            (out/"dsp.asm").write_text(source)
            run(vendor/"dsp56300/build/source/dsp_host/dsp_asm","-in",out/"dsp.asm","-org",format(org,"x"),"-out",out/"dsp.bin")
            code=(out/"dsp.bin").read_bytes()
            assert len(code)==340*3
            blobs["dsp"+tag]=b"".join(w.to_bytes(3,"little") for w in tables.gain_table()+tables.flt_table())+code
    expected={"coldfire":"04b35af8f6dc9a101f8ba3a8688d613fbd648d7fb2f2952b87b7831098a57bdb","dspA":"8ac78317f609e0ae70f4e09157d83b9ab3c37d8d362579bb8ce7476f5cafdd7c","dspB":"5427beae4607ea6b6a382748a0b55304d493fde81457bc8c0d285d9b6e9f9ddb"}
    if {k:SHA(v) for k,v in blobs.items()}!=expected:raise ValueError("Sidechain source differs from locally native-verified bytes")
    return {"schema":1,"revision":revision,**provenance,"kind":"standalone-sidechain","stockRead":False,"compilerSha256":SHA(Path(__file__).read_bytes()),"layout":layout,"blobs":{k:v.hex() for k,v in blobs.items()},"blobSha256":expected}
