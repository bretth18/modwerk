import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compiledModuleVersions, moduleSourcePaths } from './module-source.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const catalog = JSON.parse(await readFile(resolve(root, 'sdk/catalog.json'), 'utf8'))
const requested = ['analog-bassdrum', 'midi-scenes', 'usb-audio-out-tracks-main-cue', 'quantizer']
const verifiedRequested = requested.filter(id => id !== 'midi-scenes')
describe('release package scope and reviewed source inventory', () => {
  it('compiles verified modules, keeps pending MIDI Scenes in source inventory, and includes USB infrastructure', async () => {
    const versions = await compiledModuleVersions(root, catalog), paths = await moduleSourcePaths(root)
    expect(Object.keys(versions)).toEqual(['spectrum', 'modulation', 'character', 'miniverb', 'tapeecho', 'euclid', 'repitch', ...verifiedRequested])
    expect(versions).not.toHaveProperty('midi-scenes')
    expect(versions.miniverb).toBe('0.1.2-experimental')
    for (const id of verifiedRequested) {
      expect(versions[id]).toBe('0.1.2-experimental')
      expect(paths).toContain('modules/' + id + '/manifest.py')
    }
    expect(paths).toContain('modules/midi-scenes/manifest.py')
    expect(paths).toContain('platform/usb-midi/manifest.py')
  })
  it('retains pending objects only when their native source fingerprints match, without evaluating source', () => {
    const result = execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-B', '-c', `
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('compiler', Path('scripts/build-module-packages.py'))
compiler = importlib.util.module_from_spec(spec); spec.loader.exec_module(compiler)
source = 'modules/midi-scenes/manifest.py'
# A hash map is the only input: no module declaration is imported or executed.
old = {'moduleId': 'midi-scenes', 'version': '0.1.1-experimental', 'sources': {source: 'approved-hash'}, 'code': 'authored-object'}
baseline = {'objects': [old], 'groups': [{'moduleId': 'midi-scenes'}]}
ids = ['analog-bassdrum', 'usb-audio-out-tracks-main-cue', 'quantizer']
objects, groups = compiler.retained_pending(baseline, ids, {source: 'approved-hash'})
assert objects == [old] and groups == baseline['groups']
assert objects[0]['version'] == '0.1.1-experimental'
for fingerprints in [{}, {source: 'changed-hash'}]:
    try: compiler.retained_pending(baseline, ids, fingerprints)
    except ValueError as error: assert 'pending native source differs' in str(error)
    else: raise AssertionError('Changed or missing pending source was accepted')
try: compiler.retained_pending({'objects': [], 'groups': []}, ids, {source: 'approved-hash'})
except ValueError as error: assert 'missing retained pending package' in str(error)
else: raise AssertionError('Missing pending baseline was accepted')
print('pending source stays unevaluated')
`], { cwd: root, encoding: 'utf8' })
    expect(result.trim()).toBe('pending source stays unevaluated')
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
