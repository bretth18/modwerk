import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import draft from '../../sdk/drafts/cc-map/octamod.module.json'
import baseline from '../../sdk/module-qualification-baseline.json'
import { parseModuleDocument, requireModuleUiForPublication, requireModuleQualificationForPublication } from './module-contract'
import { parseQualificationBaseline, requireFolderQualification } from '../../scripts/module-qualification.mjs'
import { MODULES, resolveSelection } from './modules'

describe('CC Map source draft', () => {
  it('preserves attribution and source pin with actual LCD evidence while refusing publication without measured qualification', async () => {
    const document = parseModuleDocument(draft)
    expect(document.author.github).toBe('sambanks')
    expect(document.source?.revision).toBe('8d0ad6f4f82c2efbc10e1c65eefbce0ad1cec4bf')
    expect(document.tests.hardwareStatus).toBe('historical')
    expect(document.build?.status).toBe('pending')
    expect(() => requireModuleUiForPublication(document)).not.toThrow()
    expect(document.access?.screenshots).toHaveLength(6)
    expect(document.media.every(item => item.otUi?.moduleVersion === document.version)).toBe(true)
    expect(() => requireModuleQualificationForPublication(document)).toThrow('worst-case cycles, exact memory and hardware')
    await expect(requireFolderQualification(resolve('sdk/drafts/cc-map'), document, parseQualificationBaseline(baseline))).rejects.toThrow('worst-case cycles, exact memory and hardware')
    expect(baseline.modules.some(module => module.id === document.id)).toBe(false)
    expect(MODULES.some(module => module.id === document.id)).toBe(false)
    expect(() => resolveSelection([document.id])).toThrow('Unknown module')
  })
})
