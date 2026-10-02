import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { parseModuleDocument, requireModuleUiForPublication } from '../src/catalog/module-contract.ts'
import { resolveModuleFile } from '../src/catalog/module-folder.ts'
import { parseQualificationBaseline, requireFolderQualification } from './module-qualification.mjs'
import { compiledModuleVersions, moduleSourcePaths } from './module-source.mjs'

const json = async path => JSON.parse(await readFile(resolve(path), 'utf8'))
const draft = await json('sdk/drafts/previewvol/octamod.module.json')
const provenance = await json('sdk/imports/previewvol-906fc354.json')
const baseline = await json('sdk/module-qualification-baseline.json')
const catalog = await json('sdk/catalog.json')
const generated = await json('src/catalog/module-documents.json')

const folder = resolve('sdk/drafts/previewvol')

describe('Preview Vol source draft', () => {
  it('keeps the pinned document parseable with local documentation and honest unknown costs', async () => {
    const document = parseModuleDocument(draft)
    expect(document.id).toBe('previewvol')
    expect(document.version).toBe(provenance.moduleVersion)
    expect(document.source).toEqual({ repository: provenance.repository, revision: provenance.revision, path: provenance.sourcePath })
    expect(document.build?.status).toBe('pending')
    expect(document.tests.hardwareStatus).toBe('untested')
    expect(document.tests.evidenceRevision).toBe(provenance.revision)
    expect(document.resources.storage.value).toBeNull()
    expect(document.resources.processing.value).toBeNull()
    expect(document.controls).toEqual([])
    expect(document.compatibility.effectId).toBeNull()
    for (const path of [document.nativeManifest, 'README.md', document.tests.report, document.license.file, document.resources.storage.source, document.resources.processing.source]) {
      expect((await readFile(await resolveModuleFile(folder, path), 'utf8')).trim()).not.toBe('')
    }
  })

  it('fails publication without current qualification and actual preview UI captures', async () => {
    const document = parseModuleDocument(draft)
    expect(document.access?.screenshots).toEqual([])
    expect(document.access?.noUiReason).toBeUndefined()
    expect(document.tests.qualification).toBeUndefined()
    expect(() => requireModuleUiForPublication(document)).toThrow('actual screenshots')
    await expect(requireFolderQualification(folder, document, parseQualificationBaseline(baseline))).rejects.toThrow('worst-case cycles, exact memory and hardware')
  })

  it('stays outside the public catalog, native discovery, compiled packages and baseline', async () => {
    for (const collection of [catalog.modules, generated.modules, baseline.modules]) {
      expect(collection.some(module => module.id === draft.id)).toBe(false)
    }
    expect(baseline.modules).toHaveLength(11)
    expect(await compiledModuleVersions(resolve('.'), catalog)).not.toHaveProperty(draft.id)
    expect((await moduleSourcePaths(resolve('.'))).some(path => path.includes('previewvol'))).toBe(false)
    await expect(resolveModuleFile(resolve('sdk/octabam/modules/previewvol'), 'manifest.py')).rejects.toThrow()
  })
})
