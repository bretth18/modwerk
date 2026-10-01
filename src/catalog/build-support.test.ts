import { describe, expect, it } from 'vitest'
import { MODULE_DOCUMENTS_BY_ID } from './documents'
import { moduleBuildError, moduleBuildPending } from './build-support'
import { checkSelection } from './compatibility'
import { getModuleSource, resolveSelection } from './modules'
import { createSelection, parseSelection } from '../config/selection'
import { composeOs } from '../engine/compose-os'
import { validateCompiledPackage } from '../engine/module-build'
import { configurationVersionError, newConfiguration, validateConfiguration } from '../config/workspace'

const imported = ['analog-bassdrum', 'midi-scenes', 'usb-audio-out-tracks-main-cue', 'quantizer']
const verified = imported.filter(id => id !== 'midi-scenes')

describe('reviewed imports with verified loader-free composition', () => {
  it('unlocks verified versions while rejecting changed base firmware', async () => {
    for (const id of verified) {
      expect(moduleBuildPending(id)).toBe(false)
      expect(checkSelection(['repitch', id])).toMatchObject({ checked: true })
      expect(moduleBuildError([id])).toBe('')
      expect(() => validateCompiledPackage(id, MODULE_DOCUMENTS_BY_ID[id].version)).not.toThrow()
      const original = new Uint8Array(64)
      await expect(composeOs(original, ['repitch', id])).rejects.toThrow('unmodified')
      expect(original.every(byte => byte === 0)).toBe(true)
    }
    expect(moduleBuildError(['repitch'])).toBe('')
    expect(() => moduleBuildError(['unknown'])).toThrow('Unknown module')
  })

  it('exports and imports MIDI Scenes at 0.2.0-experimental', () => {
    expect(MODULE_DOCUMENTS_BY_ID['midi-scenes'].version).toBe('0.2.0-experimental')
    expect(newConfiguration('MIDI Scenes', ['midi-scenes']).moduleVersions).toEqual({ 'midi-scenes': '0.2.0-experimental' })
    const selection = { ...createSelection(['midi-scenes'], null), name: 'MIDI Scenes 2.0' }
    expect(selection.modules).toEqual([{ id: 'midi-scenes', key: 'MIDI SCENES', version: '0.2.0-experimental' }])
    expect(parseSelection(JSON.stringify(selection))).toEqual({
      name: 'MIDI Scenes 2.0',
      moduleIds: ['midi-scenes'],
      moduleVersions: { 'midi-scenes': '0.2.0-experimental' },
      keepStockFx2: false,
    })
  })

  it.each(['0.1.0-experimental', '0.1.1-experimental'])('preserves the explicit %s MIDI Scenes pin with an update-review message', version => {
    const selection = { ...createSelection(['midi-scenes'], null), name: 'Older MIDI Scenes' }
    selection.modules[0].version = version
    const imported = parseSelection(JSON.stringify(selection))
    const old = validateConfiguration(newConfiguration('Older MIDI Scenes', imported.moduleIds, imported.keepStockFx2, imported.moduleVersions))
    expect(old.moduleVersions['midi-scenes']).toBe(version)
    expect(configurationVersionError(old)).toContain('MIDI Scenes ' + version + ' → 0.2.0-experimental')
    expect(configurationVersionError(old)).toContain('Use current module versions')
  })

  it('rejects pending MIDI Scenes in single and mixed build selections', async () => {
    expect(moduleBuildPending('midi-scenes')).toBe(true)
    expect(moduleBuildError(['midi-scenes'])).toContain('awaiting Octamod verification')
    expect(checkSelection(['midi-scenes']).checked).toBe(false)
    expect(checkSelection(['repitch', 'midi-scenes']).checked).toBe(false)
    expect(checkSelection(['repitch', 'midi-scenes']).notes.join(' ')).toContain('MIDI Scenes')
    expect(() => validateCompiledPackage('midi-scenes', '0.2.0-experimental')).toThrow('awaiting')
    const original = new Uint8Array(64)
    await expect(composeOs(original, ['midi-scenes'])).rejects.toThrow('awaiting Octamod verification')
    await expect(composeOs(original, ['repitch', 'midi-scenes'])).rejects.toThrow('awaiting Octamod verification')
    expect(original.every(byte => byte === 0)).toBe(true)
  })

  it('saves exact imported module versions without claiming firmware validation', () => {
    const selection = { ...createSelection(imported, null), name: 'New modules' }
    expect(selection.validation).toBe('pending')
    expect(parseSelection(JSON.stringify(selection)).moduleIds).toEqual(imported)
    expect(selection.modules.find(module => module.id === 'midi-scenes')?.version).toBe('0.2.0-experimental')
    for (const id of verified) {
      expect(selection.modules.find(module => module.id === id)?.version).toBe('0.1.1-experimental')
    }
  })

  it('links each import to its pinned upstream source and retains historical qualification limits', () => {
    for (const module of resolveSelection(imported)) {
      expect(getModuleSource(module)).toBe(
        'https://github.com/sambanks/octabam/tree/363861e31ee963c478fab2b190a0fabe1d7ce37b/modules/' + module.id,
      )
      expect(MODULE_DOCUMENTS_BY_ID[module.id].tests.hardwareStatus).toBe('historical')
    }
    expect(MODULE_DOCUMENTS_BY_ID['usb-audio-out-tracks-main-cue'].compatibility.limitations.join(' ')).toContain('output only')
    expect(MODULE_DOCUMENTS_BY_ID['analog-bassdrum'].compatibility.conflicts).toContain('synth')
  })
})
