import { describe, expect, it } from 'vitest'
import { checkSelection } from './compatibility'
import { MODULES } from './modules'
describe('declarative compatibility',()=>{
 it('checks every nonempty selection in the verified native profile against its pinned ledger',()=>{const supported=MODULES.filter(module=>['spectrum','modulation','character','miniverb','tapeecho','euclid','repitch'].includes(module.id));expect(supported).toHaveLength(7);for(let mask=1;mask<1<<supported.length;mask++){const ids=supported.filter((_,index)=>mask&(1<<index)).map(m=>m.id);expect(checkSelection(ids).checked).toBe(true);expect(checkSelection(ids).issues).toEqual([])}})
 it('has recorded declaration checks for every requested eight-module subset',()=>{const visible=MODULES.filter(module=>!['spectrum','modulation','character'].includes(module.id));expect(visible).toHaveLength(8);for(let mask=1;mask<1<<visible.length;mask++){const ids=visible.filter((_,index)=>mask&(1<<index)).map(m=>m.id);const result=checkSelection(ids);if(ids.includes('midi-scenes')){expect(result.checked).toBe(false);expect(result.notes.join(' ')).toContain('awaiting Octamod verification')}else expect(result.notes).toEqual([])}})
 it('refuses unknown modules and does not call an empty configuration checked',()=>{expect(()=>checkSelection(['unknown'])).toThrow();expect(checkSelection([]).checked).toBe(false)})
})
