// SPDX-License-Identifier: GPL-3.0-or-later
// Source-only boot probes, deliberately separate from deployable core packages.
import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { LINK_DEVICES, parseElemod } from '../src/engine/elektron/elemod.ts'
import { elfToElemod } from './elemod-elf.mjs'

export async function buildCoreProbes({ root, output, sourceCommit, compiler, cflags, ldScript, run }) {
  const sha = value => createHash('sha256').update(value).digest('hex')
  const shared = resolve(root, 'sdk/elemod/core'), artifacts = [], sourceFiles = {}
  async function scan(folder, prefix = '') {
    for (const entry of (await readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = prefix + entry.name
      if (entry.isSymbolicLink() || !entry.isFile() && !entry.isDirectory()) throw new Error('Core needs regular source files')
      if (entry.isDirectory()) await scan(resolve(folder, entry.name), path + '/')
      else {
        if (!/\.(c|h|s)$/.test(path)) throw new Error('Unexpected core source file: ' + path)
        sourceFiles[path] = sha(await readFile(resolve(folder, entry.name)))
      }
    }
  }
  await scan(shared)
  for (const device of LINK_DEVICES) {
    const specBytes = await readFile(resolve(root, 'sdk', device.machine, 'core/probe.json'))
    const spec = JSON.parse(specBytes.toString('utf8'))
    if (spec.schemaVersion !== 1 || spec.machine !== device.machine || spec.stage !== 'boot-probe' || spec.providesInterface !== false || spec.version !== '0.1.0-dev' || Object.keys(spec.releases).sort().join() !== device.releases.map(r => r.version).sort().join()) throw new Error('Invalid draft core probe')
    const defs = device.machine === 'digitone' ? ['-DMODWERK_DIGITONE'] : []
    const work = resolve('/tmp/modwerk-compile/core', device.machine)
    await mkdir(work, { recursive: true })
    // Host tests execute only inside the network-disabled, unprivileged wrapper.
    const hostTest = resolve('/test', device.machine + '-event-bus-test')
    execFileSync('gcc', ['-std=c11', '-O2', '-Wall', '-Wextra', '-Werror', ...defs, '-I', shared, resolve(shared, 'event-bus.c'), resolve(shared, 'tests/event-bus-test.c'), '-o', hostTest])
    execFileSync(hostTest, [], { timeout: 10_000 })
    const bus = resolve(work, 'event-bus.o')
    run('gcc', [...cflags, '-std=c11', '-Wextra', '-Werror', ...defs, '-I', shared, '-c', resolve(shared, 'event-bus.c'), '-o', bus])
    for (const release of device.releases) {
      const boot = spec.releases[release.version].boot
      if (boot.addr !== '0x40000538' || boot.len !== 6 || !/^0x[0-9a-f]{8}$/.test(boot.target) || !/^[a-f0-9]{64}$/.test(boot.stockSha256) || Number(boot.target) < device.mainLoad || Number(boot.target) >= device.mainLoad + release.mainLength) throw new Error('Invalid guarded boot site')
      const object = resolve(work, release.version + '.o'), bootObject = object + '.boot.o', script = object + '.ld'
      run('as', ['-mcpu=54455', '--defsym', 'mw_stock_boot=' + boot.target, '-o', bootObject, resolve(shared, 'boot.s')])
      await writeFile(script, ldScript)
      run('ld', ['-r', '-d', '-T', script, '-o', object, bootObject, bus])
      const events = ['ev_tick', 'ev_draw', 'ev_key', 'ev_enc', 'ev_settings', 'ev_render_in', 'ev_render_out', ...(device.machine === 'digitone' ? ['ev_voice_on', 'ev_hold'] : [])]
      const build = { weak: [], subscribe: [], contribute: [], collections: Object.fromEntries(events.map(event => [event, 4])), copied: [], regions: [], claims: [], requires: [] }
      const document = { id: 'core', version: spec.version, name: 'Modwerk boot probe', presentation: { summary: 'Development probe; does not provide the full machine core interface.' }, category: 'system', author: { github: 'repeat98' }, license: { spdx: 'GPL-3.0-or-later' }, compatibility: { requires: [], conflicts: [] } }
      const target = { device: device.key, os: release.version, syx_sha256: release.syxSha256, section3_sha256: release.mainSha256 }
      const module = elfToElemod(await readFile(object), document, build, target)
      parseElemod(module)
      const sources = { ...sourceFiles, ['sdk/' + device.machine + '/core/probe.json']: sha(specBytes) }
      const plan = { schemaVersion: 1, machine: device.machine, id: 'core', version: spec.version, release: release.version, stage: spec.stage, providesInterface: false,
        module, sites: [{ addr: boot.addr, len: boot.len, stockSha256: boot.stockSha256, op: 'jsr', target: 'mw_boot' }], derive: null, stockBootTarget: boot.target,
        provenance: { sourceCommit, compiler, sources, sourceTreeSha256: sha(JSON.stringify(sources)), elfSha256: sha(await readFile(object)) } }
      const path = 'cores/' + device.machine + '/' + release.version + '.json', bytes = JSON.stringify(plan, null, 2) + '\n'
      await mkdir(dirname(resolve(output, path)), { recursive: true }); await writeFile(resolve(output, path), bytes)
      artifacts.push({ machine: device.machine, release: release.version, path, sha256: sha(bytes) })
      console.log('Compiled boot-only core probe for ' + device.machine + ' ' + release.version + '; interface/downloads remain unavailable')
    }
  }
  await writeFile(resolve(output, 'core-build.json'), JSON.stringify({ schemaVersion: 1, sourceCommit, stage: 'boot-probe', providesInterface: false, artifacts }, null, 2) + '\n')
}
