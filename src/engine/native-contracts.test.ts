import { describe, expect, it } from 'vitest'
import { validateNativeContracts, type NativeContract } from './native-contracts'
const module = (id:string,address:number,bytes:number):NativeContract=>({moduleId:id,key:id,spans:[{address,bytes,kind:'detour',label:id}],keeps:[],conflicts:[]})
describe('declared native contracts',()=>{
  it('rejects offset and contained overlaps, accepts adjacent spans',()=>{
    const a=module('a',0x40001000,10)
    for(const offset of [1,6,9]) expect(()=>validateNativeContracts([a,module('b',0x40001000+offset,2)])).toThrow('overlapping')
    expect(()=>validateNativeContracts([a,module('b',0x4000100a,2)])).not.toThrow()
  })
  it('checks named conflicts even when no bytes overlap',()=>{
    const a=module('a',0x40001000,6),b=module('b',0x40002000,6)
    a.conflicts=[{key:'b',reason:'shared hardware state'}]
    expect(()=>validateNativeContracts([a,b])).toThrow('shared hardware state')
    expect(()=>validateNativeContracts([a])).not.toThrow()
  })
  it('protects kept spans from own and other writes and bounds every claim',()=>{
    const a=module('a',0x40001000,6)
    a.keeps=[{address:0x40002000,bytes:8,sha256:'a'.repeat(64)}]
    expect(()=>validateNativeContracts([a,module('b',0x40002006,4)])).toThrow('kept bytes')
    a.spans[0].address=0x40002000
    expect(()=>validateNativeContracts([a])).toThrow('kept bytes')
    expect(()=>validateNativeContracts([module('bad',0xffffffff,6)])).toThrow('Invalid')
  })
})
