import { readCoreLogger, loggerExternals, LOGGER_RESERVE_BYTES } from './core-logger.ts'
import { readRequestedObject, requestedFacts, selectedRequestedGroups } from './requested-modules.ts'
import { resolveSelection } from '../catalog/modules.ts'
import { readColdFirePackage, PLATFORM_UNITS } from './coldfire-package.ts'
import { linkColdFireRuntime, runtimeCatalogObject } from './coldfire-link.ts'
import { createDynamicRuntimeCatalog } from './runtime-catalog.ts'
import type { StockDspCore } from './stock-dsp.ts'
// Native arena.BASE. All accepted selections reserve the platform at its bottom.
export const PLATFORM_RUNTIME_BASE = 0x40a955e0
/** Loader-free runtime with the core logger in every configuration. */
export async function createStaticColdFireRuntime(ids: readonly string[], original?: Uint8Array, base = PLATFORM_RUNTIME_BASE) {
  const units = []
  const selected = selectedRequestedGroups(ids)
  for (const module of resolveSelection(ids)) {
    if (module.id === 'tapeecho' || module.id === 'euclid') units.push(await readColdFirePackage(module.id))
    for (const pkg of requestedFacts.objects.filter(pkg => pkg.moduleId === module.id && pkg.dram && selected.some(g => g.moduleId === pkg.moduleId))) units.push(await readRequestedObject(pkg.label, original))
  }
  if (selected.some(g => g.moduleId === 'usb-midi')) for (const pkg of requestedFacts.objects.filter(pkg => pkg.moduleId === 'usb-midi')) units.push(await readRequestedObject(pkg.label, original))
  const reserveBytes = (units.length ? 1707 * 6144 : 0) + LOGGER_RESERVE_BYTES
  units.push(await readCoreLogger())
  const link = linkColdFireRuntime(units, base, loggerExternals(reserveBytes, base))
  for (const unit of units) if (requestedFacts.objects.some(p => p.label === unit.label)) {
    for (const symbol of unit.object.symbols) {
      if (!symbol.name || !symbol.section || symbol.section >= unit.object.sections.length) continue
      const placement = link.placements.get(unit.label)!.get(symbol.section)
      if (!placement) continue
      if (placement.mergedOffsets) {
        const span = placement.mergedOffsets.find(r => r.source <= symbol.value && symbol.value < r.source + r.count)
        if (span) link.symbols.set(unit.label + '::' + symbol.name, span.destination + symbol.value - span.source)
      } else link.symbols.set(unit.label + '::' + symbol.name, placement.address + symbol.value)
    }
  }
  return { ...link, base, reserveBytes, units: units.map(unit => unit.label) }
}
export async function createColdFireRuntime(cores: readonly StockDspCore[], ids: readonly string[]) {
  const selection = resolveSelection(ids), catalog = await createDynamicRuntimeCatalog(cores, ids, 0)
  const units = []
  // with_platform appends the loader after the remix's declared modules.
  for (const module of selection) if (module.id === 'tapeecho' || module.id === 'euclid') units.push(await readColdFirePackage(module.id))
  for (const label of PLATFORM_UNITS) units.push(await readColdFirePackage(label))
  units.push({ label: 'dlcatalog', object: runtimeCatalogObject(catalog, units[0].object.flags) })
  const reserveBytes = 1707 * 6144 + LOGGER_RESERVE_BYTES
  units.push(await readCoreLogger())
  const link = linkColdFireRuntime(units, PLATFORM_RUNTIME_BASE, loggerExternals(reserveBytes))
  const catalogBase = link.symbols.get('dl_stub_at_boot')!
  return { ...link, reserveBytes, catalogBase, units: units.map(unit => unit.label), pendingResidentDsp: selection.filter(module => module.id === 'character').map(module => module.id), pendingRomUnits: selection.filter(module => module.id === 'repitch').map(module => module.id) }
}
