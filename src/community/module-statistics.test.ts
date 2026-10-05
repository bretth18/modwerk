import { MODULES } from '../catalog/modules'
import { MODULE_ADDED_AT } from '../catalog/module-additions'
import { describe, expect, it } from 'vitest'
import { compareModules, type ModuleStatistics } from './module-statistics'
const modules=[{id:'a',name:'Alpha',authorName:'Zed'},{id:'b',name:'Beta',authorName:'Amy'},{id:'c',name:'Gamma',authorName:'Amy'}]
const statistics:ModuleStatistics[]=[{module_id:'a',average:5,count:1,likes:2,downloads:7,downloadsStarted:null},{module_id:'b',average:0,count:0,likes:8,downloads:1,downloadsStarted:null},{module_id:'c',average:4,count:1,likes:8,downloads:15,downloadsStarted:null}]
describe('module discovery ordering',()=>{
 it.each([['downloaded',['c','a','b']],['liked',['b','c','a']],['rated',['a','c','b']],['author',['b','c','a']],['name',['a','b','c']],['collection',['a','b','c']]])('orders modules by %s with stable alphabetical ties',(sort,expected)=>{
  expect([...modules].sort((a,b)=>compareModules(a,b,sort as string,statistics)).map(module=>module.id)).toEqual(expected)
 })
 it('handles missing statistics and unrated modules without changing the selection or input catalog',()=>{
  const filtered=[modules[2],modules[0]]
  expect([...filtered].sort((a,b)=>compareModules(a,b,'downloaded',statistics)).map(module=>module.id)).toEqual(['c','a'])
  expect([...filtered].sort((a,b)=>compareModules(a,b,'liked',null)).map(module=>module.id)).toEqual(['a','c'])
  expect(filtered.map(module=>module.id)).toEqual(['c','a'])
 })
})


it('sorts by the first addition date, with alphabetical ties and unknown dates last', () => {
 const additions = [
  { ...modules[0], addedAt: '2026-10-01T12:00:00Z', version: '9.0.0' },
  { ...modules[2], addedAt: '2026-10-02T12:00:00Z', version: '0.1.0' },
  { ...modules[1], addedAt: '2026-10-02T12:00:00Z', version: '0.2.0' },
  { id: 'missing', name: 'Missing', authorName: 'Amy' },
  { id: 'invalid', name: 'Invalid', authorName: 'Amy', addedAt: 'bad date' },
 ]
 expect([...additions].sort((a,b) => compareModules(a,b,'recent',null)).map(module => module.id)).toEqual(['b','c','a','invalid','missing'])
 expect(additions.map(module => module.id)).toEqual(['a','c','b','missing','invalid'])
 expect(additions.slice(0,2).sort((a,b) => compareModules(a,b,'recent',statistics)).map(module => module.id)).toEqual(['c','a'])
})

it('requires a valid addition date for every catalog entry and puts TapeHead followed by the four earlier additions', () => {
 expect(Object.keys(MODULE_ADDED_AT).sort()).toEqual(MODULES.map(module => module.id).sort())
 expect(MODULES.every(module => Number.isFinite(Date.parse(module.addedAt)))).toBe(true)
 expect([...MODULES].sort((a,b) => compareModules(a,b,'recent',null)).slice(0,8).map(module => module.id)).toEqual(['sidechain-compressor','tapehead','cc-map','previewvol','analog-bassdrum','midi-scenes','quantizer','usb-audio-out-tracks-main-cue'])
})
