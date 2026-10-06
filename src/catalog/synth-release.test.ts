import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import source from '../../sdk/octabam/modules/synth/octamod.module.json'
import template from '../../sdk/octabam/modules/synth/qualification.example.json'
import capture from '../../sdk/octabam/modules/synth/media/capture.json'
import baseline from '../../sdk/module-qualification-baseline.json'
import { parseModuleDocument, requireModuleUiForPublication, requireModuleQualificationForPublication } from './module-contract'
import { moduleNativeSourceSha256, parseQualificationBaseline, requireFolderQualification } from '../../scripts/module-qualification.mjs'
import { requireCompleteReadme, requireMonochromePng } from '../../scripts/module-documentation.mjs'
import { MODULES, resolveSelection } from './modules'

const folder = resolve('sdk/octabam/modules/synth')

describe('FM Synth exact experimental release', () => {
  it('publishes only the exact owner-approved experimental release and keeps unknown measurements visible', async () => {
    const document = parseModuleDocument(source)
    expect(document.tests.hardwareStatus).toBe('untested')
    expect(document.resources.processing.value).toBeNull()
    expect(() => requireModuleUiForPublication(document)).not.toThrow()
    expect(() => requireModuleQualificationForPublication(document)).toThrow('worst-case cycles, exact memory and hardware')
    expect(await requireFolderQualification(folder, document, parseQualificationBaseline(baseline))).toBe('owner-approved-experimental')
    expect(resolveSelection([document.id]).map(module => module.id)).toEqual(['synth'])
    expect(MODULES.some(module => module.id === document.id)).toBe(true)
    for (const mutate of [
      (d: typeof document) => { d.version = '0.1.2-experimental' },
      (d: typeof document) => { delete d.tests.releaseWaiver },
      (d: typeof document) => { d.tests.releaseWaiver!.sourceSha256 = 'f'.repeat(64) },
      (d: typeof document) => { d.tests.releaseWaiver!.imageSha256 = 'f'.repeat(64) },
      (d: typeof document) => { d.tests.hardwareStatus = 'verified' },
      (d: typeof document) => { d.controls[0].default++ },
    ]) {
      const changed = structuredClone(document); mutate(changed)
      await expect(requireFolderQualification(folder, changed, parseQualificationBaseline(baseline))).rejects.toThrow()
    }
  })

  it('refuses changed native source and failed common-worker evidence even under the waiver', async () => {
    const copy = mkdtempSync(resolve(tmpdir(), 'modwerk-synth-release-test.'))
    try {
      cpSync(folder, copy, { recursive: true })
      const path = resolve(copy, 'evidence/software.json'), software = JSON.parse(readFileSync(path, 'utf8'))
      software.worker.checks.changedBaseRefused = 'failed'
      writeFileSync(path, JSON.stringify(software))
      await expect(requireFolderQualification(copy, parseModuleDocument(source), parseQualificationBaseline(baseline))).rejects.toThrow('common-worker')
      cpSync(resolve(folder, 'evidence/software.json'), path)
      writeFileSync(resolve(copy, 'manifest.py'), 'raise AssertionError("changed submitted source must never execute")')
      await expect(requireFolderQualification(copy, parseModuleDocument(source), parseQualificationBaseline(baseline))).rejects.toThrow('exact version, source')
    } finally { rmSync(copy, { recursive: true, force: true }) }
  })

  it('binds real monochrome screenshots and the complete tutorial to this version and source', async () => {
    const document = parseModuleDocument(source)
    expect(capture.moduleVersion).toBe(document.version)
    expect(capture.sourceSha256).toBe(await moduleNativeSourceSha256(folder, document))
    expect(template.documentation.screenshots).toEqual(document.access!.screenshots)
    // Validate only the template's documentation; never assert its pending hardware/cycles qualify.
    requireCompleteReadme({ id: document.id, tests: { qualification: { documentation: { ...template.documentation, screenshotStyle: 'black-and-white' as const } } } }, await readFile(resolve(folder, 'README.md'), 'utf8'))
    for (const media of document.media) {
      const bytes = await readFile(resolve(folder, media.path))
      requireMonochromePng(bytes)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(capture.screenshots[media.path.slice('media/'.length) as keyof typeof capture.screenshots])
      expect(media.otUi?.moduleVersion).toBe(document.version)
      expect(media.otUi?.imageSha256).toBe(capture.imageSha256)
    }
  })
})
