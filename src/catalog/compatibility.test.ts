import { describe, expect, it } from 'vitest'
import { checkSelection } from './compatibility'
import { MODULES } from './modules'
import { availableModules } from './availability'
describe('declarative compatibility',()=>{
 it('checks every nonempty selection in the verified native profile against its pinned ledger',()=>{const supported=MODULES.filter(module=>['spectrum','modulation','character','miniverb','tapeecho','euclid','repitch'].includes(module.id));expect(supported).toHaveLength(7);for(let mask=1;mask<1<<supported.length;mask++){const ids=supported.filter((_,index)=>mask&(1<<index)).map(m=>m.id);expect(checkSelection(ids).checked).toBe(true);expect(checkSelection(ids).issues).toEqual([])}})
 // Disjoint mask groups retain every nonempty subset without a long single test. MIDI Scenes
 // builds only on its own, so its supersets are covered below instead of doubling this loop.
 const groups = 32
 for (let shard = 0; shard < groups; shard++) {
  it(`has recorded declaration checks for every public or beta subset (group ${shard + 1}/${groups})`, () => {
   const visible = availableModules(true).filter(m => m.id !== 'midi-scenes'), unchecked: string[] = []
   for (let mask = shard + 1; mask < 1 << visible.length; mask += groups) {
    const ids = visible.filter((_, index) => mask & (1 << index)).map(m => m.id)
    // Collect failures: an expect() per subset doubles this loop's cost.
    if (checkSelection(ids).notes.length) unchecked.push(ids.join('+'))
   }
   expect(unchecked).toEqual([])
  })
 }
 it('checks MIDI Scenes only on its own', () => {
  const others = availableModules(true).map(m => m.id).filter(id => id !== 'midi-scenes')
  expect(checkSelection(['midi-scenes']).checked).toBe(true)
  for (const ids of [...others.map(id => ['midi-scenes', id]), ['midi-scenes', ...others]]) {
   const result = checkSelection(ids)
   expect(result.checked).toBe(false)
   expect(result.issues.join(' ')).toContain('standalone')
  }
 })
 it('refuses unknown modules and does not call an empty configuration checked',()=>{expect(()=>checkSelection(['unknown'])).toThrow();expect(checkSelection([]).checked).toBe(false)})
})
