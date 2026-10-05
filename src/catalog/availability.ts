import { MODULES, resolveSelection } from './modules.ts'

// Temporary frontend suspension. Keep the full source catalog and saved pins intact.
export const PAUSED_MODULE_IDS: readonly string[] = ['spectrum', 'modulation', 'character']
// Explicitly requested catalog scope. Pending imports are discoverable; build-support gates firmware.
const AVAILABLE_MODULE_IDS: readonly string[] = ['miniverb', 'tapeecho', 'euclid', 'repitch', 'tapehead', 'analog-bassdrum', 'midi-scenes', 'usb-audio-out-tracks-main-cue', 'quantizer', 'previewvol', 'cc-map', 'sidechain-compressor']
export function isModulePaused(id: string) { return PAUSED_MODULE_IDS.includes(id) }
export const AVAILABLE_MODULES = MODULES.filter(module => AVAILABLE_MODULE_IDS.includes(module.id) && !isModulePaused(module.id))
export function isModuleAvailable(id: string) { return AVAILABLE_MODULES.some(module => module.id === id) }
export function moduleAvailabilityError(ids: readonly string[]): string {
  const paused = resolveSelection(ids).filter(module => isModulePaused(module.id))
  return paused.length ? 'Temporarily unavailable due to reported audio crackling: ' + paused.map(module => module.name).join(', ') + '. Remove these modules from this configuration to continue.' : ''
}
