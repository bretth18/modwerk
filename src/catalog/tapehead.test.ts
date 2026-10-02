import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import manifest from '../../sdk/octabam/modules/tapehead/octamod.module.json'
import capture from '../../sdk/octabam/modules/tapehead/media/capture.json'
import provenance from '../../sdk/imports/tapehead-c53daa9.json'
import baseline from '../../sdk/module-qualification-baseline.json'
import { moduleNativeSourceSha256, parseQualificationBaseline, requireFolderQualification } from '../../scripts/module-qualification.mjs'
import { parseModuleDocument } from './module-contract'
import { isModuleAvailable } from './availability'
import { moduleBuildPending } from './build-support'
import { selectionConflicts } from './selection-conflicts'
import { defaultChoosers } from '../engine/choosers'

const folder = resolve('sdk/octabam/modules/tapehead')
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

describe('published TapeHead evidence', () => {
  it('requires current qualification outside the frozen eleven and preserves the reported hardware limits', async () => {
    const document = parseModuleDocument(manifest)
    expect(baseline.modules.some(module => module.id === 'tapehead')).toBe(false)
    expect(await requireFolderQualification(folder, document, parseQualificationBaseline(baseline))).toBe('qualified')
    expect(document.tests.qualification?.sourceSha256).toBe(await moduleNativeSourceSha256(folder, document))
    expect(document.tests.hardwareStatus).toBe('reported')
    expect(document.tests.qualification?.hardware).toMatchObject({ kind: 'functional', status: 'reported', model: null, sourceRevision: provenance.revision })
    expect(document.tests.qualification?.hardware).not.toHaveProperty('durationMinutes')
    expect(isModuleAvailable('tapehead')).toBe(true)
    expect(moduleBuildPending('tapehead')).toBe(false)
  })
  it('binds the actual reviewed LCD captures and original-source attribution to their files', () => {
    expect(capture.moduleVersion).toBe(manifest.version)
    expect(capture.sourceRevision).toBe(manifest.tests.evidenceRevision)
    expect(capture.imageSha256).toBe(manifest.tests.qualification.imageSha256)
    expect(capture.manifestSha256).toBe(sha(readFileSync(resolve(folder, 'manifest.py'))))
    for (const screenshot of capture.screenshots) {
      expect(sha(readFileSync(resolve(folder, screenshot.path)))).toBe(screenshot.sha256)
      expect(manifest.access.screenshots).toContain(screenshot.path)
    }
    expect(provenance.authorPins.algorithm.repository).toBe('https://github.com/JClones/JSFXClones')
    expect(sha(readFileSync(resolve(folder, 'JCLONES_NOTICE.md')))).toBe(provenance.authorPins.algorithm.noticeSha256)
    for (const file of provenance.files) expect(sha(readFileSync(resolve('sdk/octabam', file.path)))).toBe(file.vendoredSha256)
    const license = readFileSync(resolve(folder, 'LICENSE'), 'utf8')
    expect(license).toContain('Copyright (c) 2026 JClones')
    expect(license).toContain('Copyright (c) 2026 devilfish707')
  })
  it('offers both effect slots, retains other stock FX2, and explains the native Analog BD refusal', () => {
    const chooser = defaultChoosers(['tapehead'], true)
    expect(chooser.fx1).toContain('TAPEHEAD')
    expect(chooser.fx2).toContain('TAPEHEAD')
    expect(chooser.fx2).not.toContain('SPRING REV')
    expect(chooser.fx2).toContain('DARK REV')
    expect(selectionConflicts(['tapehead'], true)).toEqual([])
    expect(selectionConflicts(['tapehead', 'analog-bassdrum'])).toMatchObject([{ id: 'analog-bd-custom-dsp', moduleIds: ['analog-bassdrum', 'tapehead'] }])
  })
})
