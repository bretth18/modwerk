import { describe, expect, it } from 'vitest'
import { placeDramRegions, validateRuntimeMemory } from './runtime-memory'
import { PLATFORM_RUNTIME_BASE } from './coldfire-runtime'
import { runtimeStageLayout } from './bootstrap'
describe('runtime memory claims', () => {
  it('allocates down from the ceiling and honors every alignment', () => {
    const regions = placeDramRegions([{symbol:'ring',size:513,align:256},{symbol:'stack',size:128,align:16}],0x1000,0x10000)
    expect(regions.map(r=>[r.symbol,r.address,r.size])).toEqual([['ring',0xfd00,513],['stack',0xfc80,128]])
    expect(validateRuntimeMemory(0x1000,0x1800,0x2500,0x10000,{memoryEnd:0x3000,regions})).toEqual({bssEnd:0x3000,regions:{ring:[0xfd00,513],stack:[0xfc80,128]}})
  })
  it('rejects invalid, duplicate and oversized declarations', () => {
    for (const region of [{symbol:'_end',size:1,align:1},{symbol:'bad-name',size:1,align:1},{symbol:'x',size:0,align:1},{symbol:'x',size:1,align:3},{symbol:'x',size:0x10000,align:1}]) expect(()=>placeDramRegions([region],0x1000,0x10000)).toThrow()
    expect(()=>placeDramRegions([{symbol:'x',size:1,align:1},{symbol:'x',size:1,align:1}],0x1000,0x10000)).toThrow('duplicate')
  })
  it('bounds BSS, stage and regions independently and permits temporary stage inside BSS', () => {
    const regions=placeDramRegions([{symbol:'ring',size:0x2000,align:4096}],0x1000,0x10000)
    expect(()=>validateRuntimeMemory(0x1000,0x2000,0x4000,0x10000,{memoryEnd:0x5000,regions})).not.toThrow()
    for(const memoryEnd of [0x1000,0xe001,0x10001]) expect(()=>validateRuntimeMemory(0x1000,0x2000,0x4000,0x10000,{memoryEnd,regions})).toThrow()
    expect(()=>validateRuntimeMemory(0x1000,0x2000,0xe001,0x10000,{regions})).toThrow('overlaps')
    expect(()=>validateRuntimeMemory(0x1000,0x2000,0x4000,0x10000,{regions:[{...regions[0],address:0xd000}]})).toThrow('placement')
    expect(()=>runtimeStageLayout(0x1000,0x1000,0x4000,PLATFORM_RUNTIME_BASE,{memoryEnd:PLATFORM_RUNTIME_BASE+0x4001})).toThrow('bss')
  })
})
