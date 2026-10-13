import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BetaUi, useBetaUi } from '../community/beta-ui'
import { MODULES } from '../catalog/modules'
import { CompatibilityPanel } from '../components/CompatibilityPanel'
import { MachineLibrary } from '../devices/MachinePages'
import { DEVICES_BY_ID } from '../devices/registry'
import { prepareModuleSet, ModuleSetError } from '../engine/elekloader/module-set'
import { libraryCompatibility } from './library-compatibility'

const noop = () => {}
const everb = MODULES.find(module => module.id === 'everb')!
function Library({ selected, all = false }: { selected: string[]; all?: boolean }) {
  const { conflicts, blocks } = libraryCompatibility(useBetaUi(), selected, false, ['everb'])
  return createElement(MachineLibrary, {
    device: all ? undefined : DEVICES_BY_ID.octatrack, query: '', octatrackModules: [everb], octatrackSelected: selected,
    onToggleOctatrack: noop, digiSelected: { digitakt: all ? ['digislicer', 'digisophie'] : [], 'digitakt-ii': [], digitone: [] }, onToggleDigi: noop,
    family: 'all', onFamilyChange: noop, sort: 'collection', onSortChange: noop, statistics: [],
    octatrackConflicts: conflicts, octatrackBlocks: blocks, comparison: [], onCompare: noop, onOpenComparison: noop,
    viewedModuleVersions: {}, moduleBaseline: [],
  })
}
const library = (beta: boolean, selected: string[], all = false) => renderToStaticMarkup(createElement(BetaUi, { value: beta }, createElement(Library, { selected, all })))

describe('USB library feedback and card admission stay separate', () => {
  it('offers E-Verb without a baked Analog BD swap warning only in the beta USB library', () => {
    const classic = library(false, ['analog-bassdrum'])
    expect(classic).toContain('Conflicts with Analog BD')
    expect(classic).toContain('is-conflict')
    const beta = library(true, ['analog-bassdrum'])
    expect(beta).not.toContain('Conflicts with Analog BD')
    expect(beta).not.toContain('is-conflict')
    expect(beta).toContain('Add E-Verb to module set')
  })
  it('removes the baked Octatrack warning while retaining the separate Digi combination warning', () => {
    const classic = library(false, ['analog-bassdrum', 'everb'], true)
    expect(classic).toContain('Octatrack: your selection needs a change')
    const beta = library(true, ['analog-bassdrum', 'everb'], true)
    expect(beta).not.toContain('Octatrack: your selection needs a change')
    expect(beta).toContain('Digitakt: your selection needs a change')
  })
  it('keeps the exact card placement refusal even under the beta interface', () => {
    const html = renderToStaticMarkup(createElement(BetaUi, { value: true }, createElement(CompatibilityPanel, {
      ids: ['analog-bassdrum', 'everb'], keepStockFx2: false, onFix: noop,
    })))
    expect(html).toContain('Choose effects that fit with Analog BD')
    expect(html).toContain('E-Verb')
    expect(html).toContain('compatibility-conflict')
  })
  it('does not make a missing Analog BD USB package loadable by removing the card warning', async () => {
    const load = vi.fn()
    await expect(prepareModuleSet({ name: 'USB', moduleIds: ['analog-bassdrum', 'everb'] }, { moduleIds: [], removedStockFx: [] }, load)).rejects.toThrow(ModuleSetError)
    expect(load).not.toHaveBeenCalled()
  })
})
