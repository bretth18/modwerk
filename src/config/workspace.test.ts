import { describe, expect, it } from 'vitest'
import { newConfiguration, validateConfiguration, pinModuleVersions } from './workspace'
describe('persistent configuration version pins',()=>{
 it('starts empty with stock FX2 disabled while dynamic loading is unavailable',()=>{
  const configuration=newConfiguration('Empty')
  expect(configuration.moduleIds).toEqual([])
  expect(configuration.moduleVersions).toEqual({})
  expect(configuration.keepStockFx2).toBe(false)
 })
 it('uses current versions for new, restored and duplicated configurations',()=>{
  const current=newConfiguration('Current',['miniverb','tapeecho'],false)
  const old={...current,moduleVersions:{miniverb:'0.1.1-experimental',tapeecho:'0.1.1-experimental'}}
  expect(current.moduleVersions).toEqual(pinModuleVersions(current.moduleIds))
  expect(validateConfiguration(old)).toEqual(current)
  const copy=newConfiguration('Copy',old.moduleIds,old.keepStockFx2,old.moduleVersions)
  expect(copy.moduleIds).toEqual(old.moduleIds)
  expect(copy.keepStockFx2).toBe(false)
  expect(copy.moduleVersions).toEqual(current.moduleVersions)
  expect(old.moduleVersions.miniverb).toBe('0.1.1-experimental')
 })
 it('uses current versions for pre-version configurations without accepting malformed pins',()=>{
  const current=newConfiguration('Legacy',['repitch'])
  expect(validateConfiguration({...current,moduleVersions:undefined}).moduleVersions).toEqual(current.moduleVersions)
  expect(validateConfiguration({...current,moduleVersions:{}}).moduleVersions).toEqual(current.moduleVersions)
  for(const pins of [[],null,{repitch:'latest'},{repitch:123},{repitch:'0.1.0',spectrum:'0.1.0'}])expect(()=>validateConfiguration({...current,moduleVersions:pins})).toThrow()
 })
})
