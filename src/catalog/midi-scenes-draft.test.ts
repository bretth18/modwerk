import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseModuleDocument, requireModuleQualificationForPublication, requireModuleUiForPublication, type ModuleQualification } from './module-contract'
import { compareModuleVersions } from './versions'
import { requireCompleteReadme, requireMonochromePng } from '../../scripts/module-documentation.mjs'
import { moduleNativeSourceSha256 } from '../../scripts/module-qualification.mjs'
import raw from '../../sdk/drafts/midi-scenes/octamod.module.json'
import template from '../../sdk/drafts/midi-scenes/qualification.example.json'
import provenance from '../../sdk/imports/midi-scenes-4f9a894.json'
import capture from '../../sdk/drafts/midi-scenes/media/capture.json'
import catalog from '../../sdk/catalog.json'
import emulator from '../../sdk/drafts/midi-scenes/evidence/emulator.json'
import focused from '../../sdk/drafts/midi-scenes/evidence/focused.json'

const folder = resolve('sdk/drafts/midi-scenes'), document = parseModuleDocument(raw)
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
async function files(prefix = ''): Promise<string[]> {
  const result: string[] = []
  for (const entry of await readdir(resolve(folder, prefix), { withFileTypes: true })) {
    const path = prefix + entry.name
    if (entry.isDirectory()) result.push(...await files(path + '/'))
    else { expect(entry.isFile()).toBe(true); result.push(path) }
  }
  return result.sort()
}

describe('MIDISC2.0 draft release boundary', () => {
  it('has a strictly newer source pin but cannot qualify or replace the public catalog', () => {
    expect(document.source?.revision).toBe('4f9a89453fdcdd39a3cd57f010ffa489cac721cd')
    const publicVersion = catalog.modules.find(row => row.id === document.id)!.version
    expect(compareModuleVersions(document.version, publicVersion)).toBeGreaterThan(0)
    expect(document.build?.status).toBe('pending')
    expect(() => requireModuleQualificationForPublication(document)).toThrow('qualification')
    expect(document.tests.qualification).toBeUndefined()
    expect(document.compatibility.conflicts).toHaveLength(13)
  })
  it('binds every candidate file and native inventory to recorded source identities', async () => {
    expect(Object.keys(provenance.files).sort()).toEqual(await files())
    for (const [path, fingerprint] of Object.entries(provenance.files)) expect(digest(await readFile(resolve(folder, path))), path).toBe(fingerprint)
    expect(await moduleNativeSourceSha256(folder, document)).toBe(template.sourceSha256)
  })
  it('retains bound emulator observations without promoting them to chip or memory qualification', async () => {
    expect(emulator.moduleVersion).toBe(document.version)
    expect(emulator.upstreamRevision).toBe(document.source?.revision)
    expect(emulator.imageSha256).toBe(capture.imageSha256)
    expect(emulator.recipeSha256).toBe(digest(await readFile(resolve(folder, 'recipe.json'))))
    expect(emulator.focusedInstrumentationParity).toBe(true)
    expect(emulator.chipWorstCaseCycles).toBeNull()
    expect(emulator.fullMemoryTotalBytes).toBeNull()
    expect(emulator.hardwareMeasured).toBe(false)
    expect(focused.failures).toBe(0)
    expect(focused.cases).toHaveLength(360)
    expect(focused.cases.filter(row => row.name.startsWith('clamp-'))).toHaveLength(270)
    for (const row of focused.cases) {
      expect(row.returned, row.name).toBe(true)
      expect(row.guardsIntact, row.name).toBe(true)
      expect(row.expectedResult, row.name).toBe(true)
    }
    const run = emulator.panels['eight-track']
    expect(run.instrumentationParity).toBe(true)
    expect(run.projectLoaded).toBe(true)
    expect(run.audioWorkloadStatus).toBe('passed')
    expect(run.audio!.tracks).toHaveLength(8)
    for (const track of run.audio!.tracks) {
      expect(track.peak).toBeGreaterThan(0)
      expect(track.nonzeroSamples).toBeGreaterThan(0)
    }
    expect(run.runtime.unfinishedCalls).toBe(0)
    for (const boundary of emulator.scratchBoundaryOperands) {
      expect(boundary.newBoundary - boundary.originalBoundary).toBe(73728)
      expect(boundary.additionalReservedBytes).toBe(73728)
    }
    for (const [path, fingerprint] of Object.entries(emulator.toolInputs)) {
      expect(digest(await readFile(resolve('scripts/midi-scenes-emulator', path))), path).toBe(fingerprint)
    }
  })
  it('retains eight monochrome actual UI captures with the exact new build and matching tutorial', async () => {
    expect(() => requireModuleUiForPublication(document)).not.toThrow()
    expect(document.media).toHaveLength(8)
    expect(Object.keys(capture.screenshots).sort()).toEqual(document.media.map(row => row.path.replace('media/', '')).sort())
    const hashes = capture.screenshots as Record<string, string>
    for (const media of document.media) {
      const bytes = await readFile(resolve(folder, media.path))
      expect(digest(bytes)).toBe(hashes[media.path.replace('media/', '')])
      expect(() => requireMonochromePng(bytes)).not.toThrow()
      expect(media.otUi?.moduleVersion).toBe(document.version)
      expect(media.otUi?.imageSha256).toBe(capture.imageSha256)
    }
    // Validate draft documentation alone; incomplete measurements remain unqualified.
    const documentationOnly = { ...document, tests: { ...document.tests, qualification: template as unknown as ModuleQualification } }
    expect(() => requireCompleteReadme(documentationOnly, '')).toThrow('Overview')
    const readme = await readFile(resolve(folder, 'README.md'), 'utf8')
    expect(() => requireCompleteReadme(documentationOnly, readme)).not.toThrow()
    expect(template.hardware.imageSha256).toBeNull()
    expect(template.cycles[0].worstCase).toBeNull()
    expect(template.memory.totalBytes).toBeNull()
  })
})
