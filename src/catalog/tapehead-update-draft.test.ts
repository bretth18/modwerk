import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import draft from '../../sdk/drafts/tapehead/octamod.module.json'
import released from '../../sdk/octabam/modules/tapehead/octamod.module.json'
import capture from '../../sdk/drafts/tapehead/media/capture.json'
import { parseModuleDocument, requireModuleUiForPublication, requireModuleQualificationForPublication } from './module-contract'
import { moduleNativeSourceSha256 } from '../../scripts/module-qualification.mjs'
import { requireCompleteReadme, requireMonochromePng } from '../../scripts/module-documentation.mjs'
import { MODULES } from './modules'

const folder = resolve('sdk/drafts/tapehead')
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

describe('TapeHead 0.1.2 pending update draft', () => {
  it('stays a draft beside the released 0.1.1, with a greater version', () => {
    const update = parseModuleDocument(draft), current = parseModuleDocument(released)
    expect(update.id).toBe(current.id)
    expect(update.version).toBe('0.1.2-experimental')
    expect(current.version).toBe('0.1.1-experimental')
    expect(MODULES.find(module => module.id === 'tapehead')?.version).toBe(current.version)
  })

  it('changes only the DSP, its reference and its gate, not the native manifest', async () => {
    const read = (root: string, path: string) => readFile(resolve(root, path))
    const releasedFolder = resolve('sdk/octabam/modules/tapehead')
    for (const path of ['manifest.py', 'gen_constants.py', 'hardware-test-remix.py', 'benchmark.py', 'presentation/thumbnail.svg'])
      expect(sha(await read(folder, path))).toBe(sha(await read(releasedFolder, path)))
    for (const path of ['tapehead.asm', 'reference.py', 'verify.py'])
      expect(sha(await read(folder, path))).not.toBe(sha(await read(releasedFolder, path)))
    expect(await readFile(resolve(folder, 'reference.py'), 'utf8')).toContain('INPUT_GAIN = 4.0')
  })

  it('binds qualification, captures and screenshots to this version, source and image', async () => {
    const document = parseModuleDocument(draft)
    const q = document.tests.qualification!
    expect(q.moduleVersion).toBe(document.version)
    expect(q.sourceSha256).toBe(await moduleNativeSourceSha256(folder, document))
    expect(capture.moduleVersion).toBe(document.version)
    expect(capture.imageSha256).toBe(q.imageSha256)
    expect(() => requireModuleUiForPublication(document)).not.toThrow()
    for (const media of document.media) {
      const bytes = await readFile(resolve(folder, media.path))
      requireMonochromePng(bytes)
      expect(sha(bytes)).toBe(capture.screenshots.find(shot => shot.path === media.path)?.sha256)
      expect(media.otUi?.moduleVersion).toBe(document.version)
      expect(media.otUi?.imageSha256).toBe(q.imageSha256)
    }
    requireCompleteReadme(document, await readFile(resolve(folder, 'README.md'), 'utf8'))
  })

  it('keeps the maximum configuration inside the declared budget', () => {
    const cycles = parseModuleDocument(draft).tests.qualification!.cycles[0]
    expect(cycles.worstCase).toBe(16 * 295 + 3 * 422 + 144)
    expect(cycles.maxConfiguration).toBe(8 * cycles.worstCase)
    expect(cycles.maxConfiguration).toBeLessThanOrEqual(cycles.budget)
  })

  it('carries the attributed hardware report for the exact image this source builds', () => {
    const document = parseModuleDocument(draft)
    expect(document.tests.qualification!.hardware).toMatchObject({ kind: 'functional', status: 'reported', imageSha256: document.tests.qualification!.imageSha256 })
    expect(() => requireModuleQualificationForPublication(document)).not.toThrow()
  })
})
