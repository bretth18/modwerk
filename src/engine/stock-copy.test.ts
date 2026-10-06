import { describe, expect, it } from 'vitest'
import type { CfObject } from './coldfire-elf'
import { validateStockCopies, type StockCopy } from './stock-copy'
const recipe: StockCopy = { section: 1, offset: 8, source: 0x400334d8, bytes: 6, sha256: 'a'.repeat(64) }
function object(): CfObject {
  return { flags: 0, symbols: [], relocations: [], sections: [
    { index: 0, name: '', type: 0, flags: 0, size: 0, alignment: 1, entrySize: 0, data: new Uint8Array() },
    { index: 1, name: '.text', type: 1, flags: 6, size: 32, alignment: 2, entrySize: 0, data: new Uint8Array(32) },
  ] }
}
describe('guarded stock replay placeholders', () => {
  it('admits bounded six/eight-byte replay holes and existing descriptor spans', () => {
    for (const bytes of [6, 8, 23]) expect(() => validateStockCopies(object(), [{ ...recipe, bytes }])).not.toThrow()
  })
  it('rejects overlapping holes, including a relocation that starts before the hole', () => {
    expect(() => validateStockCopies(object(), [recipe, { ...recipe, offset: 12 }])).toThrow('overlaps')
    const elf = object(); elf.relocations.push({ section: 1, offset: 6, type: 1, symbol: 0, addend: 0 })
    expect(() => validateStockCopies(elf, [recipe])).toThrow('relocation')
  })
  it('rejects embedded firmware bytes and invalid source/section dimensions', () => {
    const elf = object(); elf.sections[1].data[9] = 1
    expect(() => validateStockCopies(elf, [recipe])).toThrow('zero placeholders')
    for (const patch of [{ bytes: 0 }, { bytes: 257 }, { offset: 30 }, { source: 0 }, { section: 0 }, { sha256: 'invalid' }]) expect(() => validateStockCopies(object(), [{ ...recipe, ...patch }])).toThrow()
    const unallocated = object(); unallocated.sections[1].flags = 0
    expect(() => validateStockCopies(unallocated, [recipe])).toThrow('allocated')
  })
})
