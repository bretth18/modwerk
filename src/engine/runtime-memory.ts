// Declared DRAM regions are uninitialized, linker-owned claims in the arena.
// The module initializes them and .bss before any reader can observe them.
import packages from './assets/coldfire-packages.json' with { type: 'json' }
export type DramRegion = { symbol: string; size: number; align: number }
export type PlacedDramRegion = DramRegion & { address: number }
export type RuntimeMemory = { memoryEnd?: number; regions?: readonly PlacedDramRegion[] }
const LIMIT = 16 * 1024 * 1024
export function placeDramRegions(regions: readonly DramRegion[], base: number, ceiling: number): PlacedDramRegion[] {
  if (!Number.isSafeInteger(base) || !Number.isSafeInteger(ceiling) || base < 0 || ceiling <= base || ceiling > 0xffffffff || ceiling - base > LIMIT || regions.length > 128) throw new Error('Invalid DRAM region arena.')
  const names = new Set<string>(); let top = ceiling
  return regions.map(region => {
    if (['_end','_edata','__bss_start'].includes(region.symbol) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(region.symbol) || names.has(region.symbol) || !Number.isSafeInteger(region.size) || region.size < 1 || region.size > LIMIT || !Number.isSafeInteger(region.align) || region.align < 1 || region.align > LIMIT || (region.align & (region.align - 1))) throw new Error('Invalid or duplicate DRAM region declaration.')
    names.add(region.symbol)
    top = Math.floor((top - region.size) / region.align) * region.align
    if (top < base) throw new Error('The declared DRAM regions exceed reserved sample memory.')
    return { ...region, address: top }
  })
}
export function selectedDramRegions(ids: readonly string[]) {
  const records = (packages as typeof packages & { memoryRegions?: (DramRegion & { moduleId: string })[] }).memoryRegions ?? []
  return records.filter(region => ids.includes(region.moduleId)).map(({ symbol, size, align }) => ({ symbol, size, align }))
}
export function validateRuntimeMemory(base: number, runtimeEnd: number, stageEnd: number, ceiling: number, memory: RuntimeMemory) {
  const memoryEnd = memory.memoryEnd ?? runtimeEnd
  if (!Number.isSafeInteger(memoryEnd) || memoryEnd < runtimeEnd || memoryEnd > ceiling) throw new Error('The runtime .bss exceeds reserved sample memory.')
  const regions = memory.regions ?? []
  const expected = placeDramRegions(regions, base, ceiling)
  if (regions.some((region, i) => region.address !== expected[i].address)) throw new Error('The DRAM region placement differs from its declared arena.')
  if (regions.length && Math.max(memoryEnd, stageEnd) > regions[regions.length - 1].address) throw new Error('The runtime, .bss or packed stage overlaps a declared DRAM region.')
  return { ...(memoryEnd > runtimeEnd ? { bssEnd: memoryEnd } : {}), ...(regions.length ? { regions: Object.fromEntries(regions.map(region => [region.symbol, [region.address, region.size]])) } : {}) }
}
