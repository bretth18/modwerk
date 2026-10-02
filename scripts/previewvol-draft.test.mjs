import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { parseModuleDocument, requireModuleUiForPublication } from '../src/catalog/module-contract.ts'
import { resolveModuleFile } from '../src/catalog/module-folder.ts'
import { moduleNativeSourceSha256, parseQualificationBaseline, requireFolderQualification } from './module-qualification.mjs'
import { requireModuleDocumentation } from './module-documentation.mjs'
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

  it('checks actual version-bound monochrome UI documentation while rejecting incomplete qualification', async () => {
    const document = parseModuleDocument(draft)
    const capture = await json('sdk/drafts/previewvol/media/capture.json')
    const template = await json('sdk/drafts/previewvol/qualification.example.json')
    expect(document.access?.screenshots).toHaveLength(7)
    expect(document.access?.noUiReason).toBeUndefined()
    expect(document.tests.qualification).toBeUndefined()
    expect(() => requireModuleUiForPublication(document)).not.toThrow()
    await requireModuleDocumentation(folder, { ...document, tests: { ...document.tests, qualification: template } })
    expect(() => parseModuleDocument({ ...draft, tests: { ...draft.tests, qualification: template } })).toThrow()
    expect(capture.moduleVersion).toBe(document.version)
    expect(capture.nativeSourceSha256).toBe(await moduleNativeSourceSha256(folder, document))
    expect(template.sourceSha256).toBe(capture.nativeSourceSha256)
    expect(capture.preflight).toEqual({ loadHandled: true, bankParsed: true, startupDialogsCleared: true })
    for (const item of document.media) {
      expect(item.otUi.moduleVersion).toBe(capture.moduleVersion)
      expect(item.otUi.imageSha256).toBe(capture.imageSha256)
      const bytes = await readFile(await resolveModuleFile(folder, item.path))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(capture.screenshots[item.path.slice('media/'.length)])
    }
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
