import { describe, expect, it } from 'vitest'
import { createDigiSelection, parseDigiSelection } from './digi-selection'
import { pinModuleVersions } from './workspace'

describe('Digi configuration backups', () => {
  it.each(['digitakt', 'digitone'] as const)('round-trips %s selection with the current module versions', device => {
    const configuration = { name: 'My configuration', moduleIds: ['digihealth'], moduleVersions: pinModuleVersions(['digihealth'], device) }
    expect(parseDigiSelection(JSON.stringify(createDigiSelection(configuration, device)), device)).toEqual(configuration)
  })
  it('exports only public selection metadata even when the input has private fields', () => {
    const configuration = { name: 'Test', moduleIds: ['digihealth'], moduleVersions: { digihealth: '1.0.0' }, firmware: new Uint8Array([1,2,3]), filename: 'private.syx', email: 'private@example.test' }
    const serialized = JSON.stringify(createDigiSelection(configuration, 'digitakt'))
    expect(serialized).not.toMatch(/firmware|filename|private/)
  })
  it('rejects other machines, unknown modules, altered catalogs and embedded content', () => {
    const backup = createDigiSelection({ name: 'Test', moduleIds: ['digihealth'], moduleVersions: {} }, 'digitakt')
    expect(() => parseDigiSelection(JSON.stringify(backup), 'digitone')).toThrow('different machine')
    expect(() => parseDigiSelection(JSON.stringify({ ...backup, modules: [{ id: 'unknown', version: '1.0.0' }] }), 'digitakt')).toThrow('Unknown')
    expect(() => parseDigiSelection(JSON.stringify({ ...backup, catalog: { revision: 'unknown' } }), 'digitakt')).toThrow('different module catalog')
    expect(() => parseDigiSelection(JSON.stringify({ ...backup, firmware: [1,2,3] }), 'digitakt')).toThrow('configuration backup')
  })
  it('rejects malformed JSON, invalid versions and oversized backups', () => {
    const backup = createDigiSelection({ name: 'Test', moduleIds: ['digihealth'], moduleVersions: {} }, 'digitakt')
    expect(() => parseDigiSelection('not json', 'digitakt')).toThrow('not valid configuration JSON')
    expect(() => parseDigiSelection(JSON.stringify({ ...backup, modules: [{ id: 'digihealth', version: 'latest' }] }), 'digitakt')).toThrow('semantic version')
    expect(() => parseDigiSelection(' '.repeat(32769), 'digitakt')).toThrow('32 KB')
  })
})
