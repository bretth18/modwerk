import { DSP_EFFECT_IDS, resolveSelection } from './modules.ts'

export type ConflictFix = { label: string; removeIds?: string[]; keepStockFx2?: boolean }
export type SelectionConflict = { id: string; title: string; description: string; moduleIds: string[]; fixes: ConflictFix[] }
// Only these custom effects have reviewed placements beside Analog BD.
const analogBdCompanions = ['miniverb', 'tapeecho', 'euclid', 'tapehead', 'sidechain-compressor']
// These build beside the stock FX2 effects: TapeHead fits in the space they leave, and Sidechain
// Compressor hooks stock COMPRESSOR instead of taking a slot. Every other DSP effect needs their space.
const FITS_BESIDE_STOCK_FX2 = ['tapehead', 'sidechain-compressor']
const crowdedMenuIds = ['miniverb', 'tapeecho', 'euclid', 'repitch', 'quantizer']

export function selectionConflicts(ids: readonly string[], keepStockFx2 = false): SelectionConflict[] {
  const modules = resolveSelection(ids), selected = new Set(modules.map(module => module.id))
  const dsp = modules.filter(module => DSP_EFFECT_IDS.includes(module.id))
  const analogBdBlockers = dsp.filter(module => !analogBdCompanions.includes(module.id))
  const conflicts: SelectionConflict[] = []
  if (selected.has('midi-scenes') && modules.length > 1) {
    const companions = modules.filter(module => module.id !== 'midi-scenes')
    conflicts.push({ id: 'midi-scenes-standalone', title: 'Build MIDI Scenes on its own',
      description: 'MIDI Scenes currently supports standalone firmware. Remove the other modules to build this configuration.',
      moduleIds: modules.map(module => module.id),
      fixes: [{ label: 'Keep MIDI Scenes', removeIds: companions.map(module => module.id) }, { label: 'Remove MIDI Scenes', removeIds: ['midi-scenes'] }] })
  }
  if (selected.has('vector') && selected.has('analog-bassdrum')) conflicts.push({
    id: 'vector-analog-bd', title: 'Choose VECTOR or Analog BD',
    description: 'VECTOR and Analog BD use the same native machine chooser hooks. Build them separately.',
    moduleIds: ['vector', 'analog-bassdrum'],
    fixes: [{ label: 'Keep VECTOR', removeIds: ['analog-bassdrum'] }, { label: 'Keep Analog BD', removeIds: ['vector'] }],
  })
  if (selected.has('synth')) {
    const companions = modules.filter(module => ['analog-bassdrum', 'quantizer', 'vector'].includes(module.id))
    if (companions.length) conflicts.push({ id: 'synth-machine-conflict', title: 'Choose FM Synth or overlapping machine modules',
      description: 'FM Synth bundles Scale Quantizer and uses the machine chooser hooks. It cannot run alongside ' + companions.map(module => module.name).join(', ') + '.',
      moduleIds: ['synth', ...companions.map(module => module.id)],
      fixes: [{ label: 'Keep FM Synth', removeIds: companions.map(module => module.id) }, { label: 'Remove FM Synth', removeIds: ['synth'] }] })
  }
  if (selected.has('analog-bassdrum') && analogBdBlockers.length) conflicts.push({
    id: 'analog-bd-custom-dsp', title: 'Choose effects that fit with Analog BD',
    description: 'Analog BD can share effect memory with Mini Verb, Tape Echo, Euclid, TapeHead and Sidechain Compressor, subject to space. It cannot run alongside ' + analogBdBlockers.map(module => module.name).join(', ') + '.',
    moduleIds: ['analog-bassdrum', ...analogBdBlockers.map(module => module.id)],
    fixes: [{ label: 'Remove Analog BD', removeIds: ['analog-bassdrum'] }, { label: 'Keep Analog BD · remove incompatible effects', removeIds: analogBdBlockers.map(module => module.id) }],
  })
  const stockFx2Dsp = dsp.filter(module => !FITS_BESIDE_STOCK_FX2.includes(module.id))
  if (keepStockFx2 && (stockFx2Dsp.length || selected.has('analog-bassdrum'))) conflicts.push({
    id: 'stock-fx2-space', title: 'Make room for your modules',
    description: 'These modules need space used by the original FX2 effects. Turn off “Keep stock FX2 effects” to continue. Original FX1 effects stay available.',
    moduleIds: [...stockFx2Dsp.map(module => module.id), ...(selected.has('analog-bassdrum') ? ['analog-bassdrum'] : [])],
    fixes: [{ label: 'Turn off stock FX2', keepStockFx2: false }],
  })
  // Native matrix: this five-module subset exhausts menu space, regardless
  // of additional MIDI Scenes or USB Audio units in DRAM.
  if (!keepStockFx2 && crowdedMenuIds.every(id => selected.has(id))) conflicts.push({
    id: 'module-menu-space', title: 'This selection needs more menu space',
    description: 'Mini Verb, Tape Echo, Euclid, Repitch and Scale Quantizer need more menu space than the Octatrack has available together. Removing Euclid keeps every other selected module.',
    moduleIds: crowdedMenuIds,
    fixes: [{ label: 'Remove Euclid', removeIds: ['euclid'] }],
  })
  return conflicts
}
export function selectionConflictError(ids: readonly string[], keepStockFx2 = false) {
  return selectionConflicts(ids, keepStockFx2).map(conflict => conflict.title + '. ' + conflict.description).join(' ')
}
