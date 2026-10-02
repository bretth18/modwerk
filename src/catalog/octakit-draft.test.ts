import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import draft from '../../sdk/drafts/octakit/octamod.module.json'
import baseline from '../../sdk/module-qualification-baseline.json'
import { parseModuleDocument, requireModuleUiForPublication, requireModuleQualificationForPublication } from './module-contract'
import { parseQualificationBaseline, requireFolderQualification } from '../../scripts/module-qualification.mjs'
import { MODULES, resolveSelection } from './modules'

describe('OctaKit source draft', () => {
  it('retains its author and source pin while both publication gates reject missing evidence', async () => {
    const document = parseModuleDocument(draft)
    expect(document.author.github).toBe('emuyia')
    expect(document.source?.revision).toBe('8d0ad6f4f82c2efbc10e1c65eefbce0ad1cec4bf')
    expect(document.tests.hardwareStatus).toBe('historical')
    expect(() => requireModuleUiForPublication(document)).toThrow('actual screenshots')
    expect(() => requireModuleQualificationForPublication(document)).toThrow('worst-case cycles, exact memory and hardware')
    await expect(requireFolderQualification(resolve('sdk/drafts/octakit'), document, parseQualificationBaseline(baseline))).rejects.toThrow('worst-case cycles, exact memory and hardware')
    expect(MODULES.some(module => module.id === document.id)).toBe(false)
    expect(() => resolveSelection([document.id])).toThrow('Unknown module')
  })
})
