// Inherited spans are recipes; packages contain only authored code and zero holes.
import type { CfObject } from './coldfire-elf.ts'
export type StockCopy = { section: number; offset: number; source: number; bytes: number; sha256: string }
export function validateStockCopies(object: CfObject, copies: readonly StockCopy[]) {
  const widths = [0, 4, 2, 1, 4, 2, 1]
  if (!Array.isArray(copies)) throw new Error('Invalid inherited stock span inventory.')
  for (const [index, copy] of copies.entries()) {
    const section = object.sections[copy.section]
    if (![copy.section, copy.offset, copy.source, copy.bytes].every(Number.isSafeInteger) || !section || section.type !== 1 || !(section.flags & 2) || copy.bytes < 1 || copy.bytes > 256 || copy.offset < 0 || copy.offset + copy.bytes > section.data.length || copy.source < 0x40000400 || copy.source + copy.bytes > 0x40100000 || !/^[a-f0-9]{64}$/.test(copy.sha256) || section.data.subarray(copy.offset, copy.offset + copy.bytes).some(byte => byte !== 0)) throw new Error('Inherited stock spans require bounded, allocated zero placeholders.')
    if (copies.slice(0, index).some(other => other.section === copy.section && other.offset < copy.offset + copy.bytes && copy.offset < other.offset + other.bytes) || object.relocations.some(relocation => relocation.section === copy.section && widths[relocation.type] && relocation.offset < copy.offset + copy.bytes && copy.offset < relocation.offset + widths[relocation.type])) throw new Error('Inherited stock span overlaps another span or an authored relocation.')
  }
}
