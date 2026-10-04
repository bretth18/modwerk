import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AVAILABLE_MODULES } from '../catalog/availability'
import { selectionConflicts } from '../catalog/selection-conflicts'
import { LibraryTools } from '../components/LibraryTools'
import { AllMachinesLibrary } from './MachinePages'

const noop = () => {}
const props = {
  query: '', octatrackModules: AVAILABLE_MODULES, octatrackSelected: ['miniverb'],
  onToggleOctatrack: noop, digiSelected: { digitakt: [], digitone: [] }, onToggleDigi: noop,
  family: 'all', onFamilyChange: noop, sort: 'collection', onSortChange: noop,
  statistics: [{module_id: 'miniverb', average: 4.5, count: 2, likes: 7, downloads: 12, downloadsStarted: null}],
  octatrackConflicts: [], comparison: ['miniverb'], onCompare: noop, onOpenComparison: noop,
  viewedModuleVersions: {}, moduleBaseline: AVAILABLE_MODULES.map(module=>module.id),
}

describe('All machines library parity', () => {
  it('keeps the Octatrack build, sort, rating, popularity and comparison controls', () => {
    const html = renderToStaticMarkup(createElement(AllMachinesLibrary, props))
    const tools = renderToStaticMarkup(createElement(LibraryTools, {
      family: 'all', families: [], onFamilyChange: noop, sort: 'collection', onSortChange: noop,
      comparisonCount: 1, onCompare: noop,
    }))
    for (const value of ['collection', 'recent', 'name', 'author', 'rated', 'liked', 'downloaded']) {
      const option = `<option value="${value}"`
      expect(html).toContain(option)
      expect(tools).toContain(option)
    }
    expect(html).toContain('href="#configuration"')
    expect(html).toContain('Build firmware')
    expect(html.slice(html.indexOf('id="machine-octatrack"'))).toContain('Build firmware')
    expect(html).toContain('aria-label="Build firmware for Octatrack"')
    expect(html).toContain('4.5 (2)')
    expect(html).toContain('7 likes')
    expect(html).toContain('12 downloads')
    expect(html).toContain('Remove Mini Verb from configuration')
    expect(html).toContain('type="checkbox" checked=""')
  })

  it('shows saved Octatrack and Digitakt collisions even when filters hide their modules', () => {
    const html = renderToStaticMarkup(createElement(AllMachinesLibrary, {...props,
      query: 'no matching modules', octatrackModules: [],
      octatrackConflicts: selectionConflicts(['miniverb', 'analog-bassdrum']),
      digiSelected: {digitakt: ['digislicer', 'digisophie'], digitone: []},
    }))
    expect(html).toContain('Octatrack: your selection needs a change')
    expect(html).toContain('Digitakt: your selection needs a change')
    expect(html).toContain('href="#digitakt/configuration"')
    expect(html).not.toContain('Digitone: your selection needs a change')
    expect(html).toContain('No modules found')
    expect(html).not.toContain('Build firmware')
  })

  it('keeps unavailable counts distinct from zero and does not offer Digi firmware builds', () => {
    const html = renderToStaticMarkup(createElement(AllMachinesLibrary, {...props, statistics: null}))
    expect(html).toContain('— likes')
    expect(html).toContain('— downloads')
    expect(html).not.toContain('0 downloads')
    expect(html).toContain('counts are not available yet')
    expect(html.match(/aria-label="Build firmware for/g)).toHaveLength(1)
    expect(html).toContain('href="#digitakt/configuration"')
    expect(html).toContain('href="#digitone/configuration"')
  })

  it('applies type and alphabetical sorting to the Digi groups', () => {
    const html = renderToStaticMarkup(createElement(AllMachinesLibrary, {...props,
      octatrackModules: [], family: 'Sampling', sort: 'name',
    }))
    expect(html).toContain('DIGISLICER')
    expect(html).toContain('NEIGHBOR')
    expect(html.indexOf('View DIGISLICER')).toBeLessThan(html.indexOf('View NEIGHBOR'))
    expect(html).not.toContain('View SOPHIE')
    expect(html).not.toContain('View digihealth')
  })
})
