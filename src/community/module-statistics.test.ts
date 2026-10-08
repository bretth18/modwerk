import { MODULES } from '../catalog/modules'
import { describe, expect, it } from 'vitest'
import { compareModules, DEFAULT_MODULE_SORT, type ModuleStatistics } from './module-statistics'
import { moduleReleasedAt } from '../catalog/module-releases'
import { DIGI_MODS } from '../devices/digi-mods'
import { COMMUNITY_MODULES } from './modules'
import { moduleChangelogs } from './module-changelogs'
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
 it('ranks by Bayesian score using the full statistics even when the catalog is filtered', () => {
  const stats: ModuleStatistics[] = [
   { ...statistics[0], average: 5, count: 1 },
   { ...statistics[1], average: 4.5, count: 20 },
   { ...statistics[2], average: 1, count: 20 },
  ]
  const missing = { id: 'missing', name: 'A missing module', authorName: 'Amy' }
  const unrated = { id: 'unrated', name: 'An unrated module', authorName: 'Amy' }
  stats.push({ ...statistics[0], module_id: unrated.id, average: 5, count: 0 })
  const order = (items: typeof modules) => [...items].sort((a,b) => compareModules(a,b,'rated',stats)).map(module => module.id)
  expect(order([...modules, unrated, missing])).toEqual(['b','a','c','missing','unrated'])
  expect(order(modules.slice(0,2))).toEqual(['b','a'])
  expect(stats[0]).toMatchObject({ average: 5, count: 1 })
  expect(modules.map(module => module.id)).toEqual(['a','b','c'])
  expect([...modules].sort((a,b) => compareModules(a,b,'rated',null)).map(module => module.id)).toEqual(['a','b','c'])
 })
 it('breaks equal Bayesian scores by vote count, then name and ID, without rounding scores', () => {
  const stats = statistics.map((item,index) => ({ ...item, average: 5, count: index === 0 ? 1 : 20 }))
  expect([...modules].sort((a,b) => compareModules(a,b,'rated',stats)).map(module => module.id)).toEqual(['b','c','a'])
  const sameNames = modules.map(module => ({ ...module, name: 'Same' })).reverse()
  expect(sameNames.sort((a,b) => compareModules(a,b,'rated',stats)).map(module => module.id)).toEqual(['b','c','a'])
  const close = [{ ...stats[0], average: 4.99, count: 20 }, { ...stats[1], average: 5, count: 20 }]
  expect(modules.slice(0,2).sort((a,b) => compareModules(a,b,'rated',close)).map(module => module.id)).toEqual(['b','a'])
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

it('gives every catalog module a valid addition date and lists the newest first', () => {
 expect(MODULES.every(module => Number.isFinite(Date.parse(module.addedAt)))).toBe(true)
 const recent = [...MODULES].sort((a,b) => compareModules(a,b,'recent',null))
 for (let i = 1; i < recent.length; i++) expect(Date.parse(recent[i - 1].addedAt)).toBeGreaterThanOrEqual(Date.parse(recent[i].addedAt))
})

it('sorts new modules and new releases together by their latest date', () => {
 const releases = [
  { ...modules[0], addedAt: '2026-10-01T12:00:00Z', updatedAt: '2026-10-07T12:00:00Z' },
  { ...modules[2], addedAt: '2026-10-08T12:00:00Z' },
  { ...modules[1], addedAt: '2026-10-08T12:00:00Z', updatedAt: '2026-10-02T12:00:00Z' },
  { id: 'fallback', name: 'Fallback', authorName: 'Amy', addedAt: '2026-10-06T12:00:00Z', updatedAt: 'invalid' },
  { id: 'release-only', name: 'Release only', authorName: 'Amy', addedAt: 'invalid', updatedAt: '2026-10-05T12:00:00Z' },
  { id: 'missing', name: 'Missing', authorName: 'Amy' },
  { id: 'invalid', name: 'Invalid', authorName: 'Amy', addedAt: 'invalid', updatedAt: 'invalid' },
 ]
 const original = structuredClone(releases)
 for (const totals of [statistics, null]) {
  expect([...releases].sort((a,b) => compareModules(a,b,DEFAULT_MODULE_SORT,totals)).map(module => module.id)).toEqual(['b','c','a','fallback','release-only','invalid','missing'])
 }
 expect([...releases].sort((a,b) => compareModules(a,b,'recent',null)).map(module => module.id)).toEqual(['b','c','fallback','a','invalid','missing','release-only'])
 expect(releases).toEqual(original)
})

it('uses the exact published version’s release-note date on every machine', () => {
 for (const module of COMMUNITY_MODULES) {
  const note = moduleChangelogs[module.id].find(entry => entry.version === module.version)!
  expect(moduleReleasedAt(module.id,module.version)).toBe(note.date + 'T00:00:00Z')
  expect(moduleReleasedAt(module.id,'99.0.0')).toBeUndefined()
 }
 for (const module of [...MODULES,...DIGI_MODS]) expect(Number.isFinite(Date.parse(module.updatedAt!))).toBe(true)
 expect(moduleReleasedAt('unknown','1.0.0')).toBeUndefined()
 const current = MODULES.find(module => module.id === 'euclid')!
 const previous = { ...current, updatedAt: moduleReleasedAt(current.id,'0.1.3-experimental') }
 expect(compareModules(current,previous,DEFAULT_MODULE_SORT,null)).toBeLessThan(0)
})
