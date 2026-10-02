import { describe, expect, it } from 'vitest'
import facts from './assets/utility-packages.json'
import compositions from './assets/utility-composition-proofs.json'
import packing from './assets/utility-packaging-proofs.json'
import { composeUtilityRom, readUtilityObject } from './utility-modules'
import { linkRomText } from './rom-package'
import { bytesHash } from './requested-modules'

describe('authored utility ROM packages',()=>{
  it('retains complete native selection and representative packaging evidence without firmware',()=>{
    expect(compositions.proofs).toHaveLength(1024)
    expect(compositions.proofs.filter(p=>'sha256' in p)).toHaveLength(522)
    expect(compositions.proofs.filter(p=>'error' in p)).toHaveLength(502)
    const identity=(p:{ids:string[];keepStockFx2:boolean})=>[...p.ids].sort().join('+')+':'+p.keepStockFx2
    expect(new Set(compositions.proofs.map(identity)).size).toBe(1024)
    expect(packing.proofs).toHaveLength(8)
    for(const proof of packing.proofs){
      const native=compositions.proofs.find(p=>identity(p)===identity(proof))
      expect(native&&'sha256' in native?native.sha256:null).toBe(proof.mainSha256)
      expect(proof.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.containerSha256).toMatch(/^[a-f0-9]{64}$/)
    }
  })
  for(const id of ['cc-map','previewvol'])it(id+' reproduces three independently native-linked byte identities',async()=>{
    const {pkg,object}=await readUtilityObject(id)
    for(const proof of pkg.proofs){
      const linked=linkRomText(object,proof.base,new Map(Object.entries(pkg.external).map(([k,v])=>[k,v as number])))
      expect(linked.bytes.length).toBe(proof.bytes)
      expect(await bytesHash(linked.bytes)).toBe(proof.sha256)
    }
  })
  it('uses native overflow for CC Map and refuses Preview Vol overflow',async()=>{
    const regions:{address:number;bytes:number}[]=[]
    const cave=async(address:number,bytes:Uint8Array)=>{regions.push({address,bytes:bytes.length})}
    const cc=await composeUtilityRom(['cc-map'],0x400d7c00,0x400d24d1,0x400d7c3c,cave,'caves')
    expect(regions).toEqual([{address:0x400d24d4,bytes:724}])
    expect(cc.writes[0].bytes).toEqual(Uint8Array.from([0x40,0x0d,0x24,0xd4]))
    await expect(composeUtilityRom(['previewvol'],0x400d7c01,0x400d24d0,0x400d7c3c,cave,'linked')).rejects.toThrow('past the stock zero run')
    await expect(readUtilityObject('octakit')).rejects.toThrow('Invalid utility')
  })
  it('applies only selected utility hooks and leaves ordinary effect choices unchanged',async()=>{
    const cave=async()=>{}
    expect((await composeUtilityRom([],0x400d6b20,0x400d24d0,0x400d7c3c,cave,'linked')).writes).toEqual([])
    const pv=await composeUtilityRom(['previewvol'],0x400d6b20,0x400d24d0,0x400d7c3c,cave,'linked')
    expect(pv.writes.map(w=>w.address)).toEqual(facts.packages.find(p=>p.id==='previewvol')!.guards.map(g=>g.address))
    expect(pv.writes.every(w=>w.bytes.length===6&&w.bytes[0]===0x4e&&w.bytes[1]===0xf9)).toBe(true)
  })
})
