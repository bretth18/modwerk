import { describe, expect, it } from 'vitest'
import { createSelection, parseSelection } from './selection'
import { BASE_FIRMWARE } from '../engine/base'

describe('selection export', () => {
  it('rejects unknown modules instead of dropping them from a build plan', () => {
    expect(() => createSelection(['missing-module'], null)).toThrow('Unknown module')
  })
  it('deduplicates modules and orders them by the pinned catalog', () => {
    const selection = createSelection(['repitch', 'spectrum', 'spectrum'], null)
    expect(selection.modules.map((module) => module.id)).toEqual(['spectrum', 'repitch'])
    expect(selection.validation).toBe('pending')
  })
  it('exports base identity without firmware content or local filenames', () => {
    const selection = createSelection(['repitch'], {
      ...BASE_FIRMWARE, name: 'personal-file-name.bin',
    })
    expect(selection.base).toEqual({
      version: BASE_FIRMWARE.version, sha256: BASE_FIRMWARE.sha256, bytes: BASE_FIRMWARE.bytes,
    })
    expect(JSON.stringify(selection)).not.toContain('personal-file-name')
    expect(selection).not.toHaveProperty('buffer')
  })
})

describe('configuration import and chooser persistence',()=>{
 it('round-trips a compact chooser without importing firmware',()=>{
  const exported={...createSelection(['miniverb','repitch'],null,false),name:'Compact set'}
  expect(parseSelection(JSON.stringify(exported))).toEqual({name:'Compact set',moduleIds:['miniverb','repitch'],moduleVersions:{miniverb:'0.1.2-experimental',repitch:'0.1.2-experimental'},keepStockFx2:false})
 })
 it('defaults old backups to retained stock effects and rejects changed catalog identities',()=>{
  const legacy={...createSelection(['euclid'],null),schemaVersion:1,name:'Legacy'}
  expect(parseSelection(JSON.stringify(legacy)).keepStockFx2).toBe(true)
  expect(()=>parseSelection(JSON.stringify({...legacy,catalog:{revision:'unknown'}}))).toThrow('different module catalog')
 })
 it('rejects unknown modules, malformed settings, non-JSON and oversized backups',()=>{
  const valid={...createSelection(['euclid'],null),name:'Test'}
  expect(()=>parseSelection(JSON.stringify({...valid,modules:[{id:'unknown'}]}))).toThrow('Unknown module')
  expect(()=>parseSelection(JSON.stringify({...valid,options:{keepStockFx2:'false'}}))).toThrow('chooser setting')
  expect(()=>parseSelection('not json')).toThrow('not valid configuration JSON')
  expect(()=>parseSelection(' '.repeat(32769))).toThrow('32 KB')
 })
})


describe('module versions in configuration backups',()=>{
 it('exports exact module versions and preserves older pins for explicit review',()=>{
  const exported={...createSelection(['spectrum'],null,true,{spectrum:'0.0.9'}),name:'Older set'}
  expect(exported.schemaVersion).toBe(3)
  expect(exported.modules[0]).toMatchObject({id:'spectrum',version:'0.0.9'})
  expect(parseSelection(JSON.stringify(exported)).moduleVersions).toEqual({spectrum:'0.0.9'})
  expect(()=>parseSelection(JSON.stringify({...exported,modules:[{id:'spectrum'}]}))).toThrow('missing module versions')
 })
})
