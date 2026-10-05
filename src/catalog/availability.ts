import { MODULES, resolveSelection } from './modules.ts'

// Temporary frontend suspension. Keep the full source catalog and saved pins intact.
export const PAUSED_MODULE_IDS: readonly string[] = ['spectrum', 'modulation', 'character']
export function isModulePaused(id: string) { return PAUSED_MODULE_IDS.includes(id) }
// Every module in sdk/catalog.json is offered unless it is paused; build support separately gates firmware.
export const AVAILABLE_MODULES = MODULES.filter(module => !isModulePaused(module.id))
export function isModuleAvailable(id: string) { return AVAILABLE_MODULES.some(module => module.id === id) }
export function moduleAvailabilityError(ids: readonly string[]): string {
  const paused = resolveSelection(ids).filter(module => isModulePaused(module.id))
  return paused.length ? 'Temporarily unavailable due to reported audio crackling: ' + paused.map(module => module.name).join(', ') + '. Remove these modules from this configuration to continue.' : ''
}
