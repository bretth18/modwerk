import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compiledModuleVersions, moduleSourcePaths, moduleSourceFingerprint } from './module-source.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const catalog = JSON.parse(await readFile(resolve(root, 'sdk/catalog.json'), 'utf8'))
const requested = ['analog-bassdrum', 'midi-scenes', 'usb-audio-out-tracks-main-cue', 'quantizer']
const verifiedRequested = requested.filter(id => id !== 'midi-scenes')
describe('release package scope and reviewed source inventory', () => {
  it('keeps the committed release identity bound to the complete SDK source and compiler', async () => {
    const record = JSON.parse(await readFile(resolve(root, 'src/engine/assets/module-build.json'), 'utf8'))
    expect(record.sourceTreeSha256).toBe(await moduleSourceFingerprint(root))
    expect(record.compilerSha256).toBe(createHash('sha256').update(await readFile(resolve(root, 'scripts/build-module-packages.py'))).digest('hex'))
    expect(record.moduleVersions).toEqual(await compiledModuleVersions(root, catalog))
  })
  it('binds approved standalone MIDI Scenes without compiling its archived 8.2 port', async () => {
    const versions = await compiledModuleVersions(root, catalog), paths = await moduleSourcePaths(root)
    expect(Object.keys(versions)).toEqual(['spectrum', 'modulation', 'character', 'miniverb', 'tapeecho', 'euclid', 'repitch', 'tapehead', ...requested,'previewvol','cc-map','sidechain-compressor'])
    expect(versions['midi-scenes']).toBe('0.2.4-experimental')
    expect(versions.miniverb).toBe('0.1.2-experimental')
    for (const id of verifiedRequested) {
      expect(versions[id]).toBe('0.1.2-experimental')
      expect(paths).toContain('modules/' + id + '/manifest.py')
    }
    expect(paths).toContain('modules/midi-scenes/recipe.json')
    expect(paths.some(path=>path.startsWith('modules/midi-scenes/upstream/'))).toBe(false)
    expect(paths).toContain('platform/usb-midi/manifest.py')
  })
  it('refuses stale and duplicate catalog pins for requested imports', async () => {
    const temporary = await mkdtemp(resolve(tmpdir(), 'octamod-scope-test.'))
    try {
      const id = requested[0], folder = resolve(temporary, 'sdk/octabam/modules', id)
      await mkdir(folder, { recursive: true })
      await writeFile(resolve(folder, 'octamod.module.json'), await readFile(resolve(root, 'sdk/octabam/modules', id, 'octamod.module.json')))
      const entry = catalog.modules.find(module => module.id === id)
      await expect(compiledModuleVersions(temporary, { modules: [{ ...entry, version: '0.1.0-experimental' }] })).rejects.toThrow('Stale catalog module version')
      await expect(compiledModuleVersions(temporary, { modules: [entry, entry] })).rejects.toThrow('Invalid catalog module id')
    } finally { await rm(temporary, { recursive: true, force: true }) }
  })
})
