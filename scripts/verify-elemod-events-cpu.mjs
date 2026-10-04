// SPDX-License-Identifier: GPL-3.0-or-later
// Original common event/API code on synthetic memory; no firmware is read.
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { LINK_DEVICES, parseElemod, linkMods } from '../src/engine/elektron/elemod.ts'
import { materializeModuleObject } from '../src/engine/elektron/module-object.ts'

const args = process.argv.slice(2), one = name => args[args.indexOf(name) + 1]
if (!args.includes('--packages') || !args.includes('--python')) throw new Error('Usage: verify-elemod-events-cpu.mjs --packages DIR --python PATCHED_UNICORN_PYTHON')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), packages = resolve(one('--packages')), cases = []
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const inventory = JSON.parse(await readFile(resolve(packages, 'core-event-build.json'), 'utf8'))
if (inventory.stage !== 'event-hook-probe' || inventory.providesInterface !== false || inventory.artifacts.length !== 4 || inventory.syntheticFixtures?.path !== 'core-event-fixtures.json') throw new Error('Expected four common event development probes')
const fixtureBytes = await readFile(resolve(packages, inventory.syntheticFixtures.path)), fixtures = JSON.parse(fixtureBytes.toString('utf8'))
if (sha(fixtureBytes) !== inventory.syntheticFixtures.sha256 || fixtures.synthetic !== true || fixtures.sourceCommit !== inventory.sourceCommit) throw new Error('Synthetic fixture inventory mismatch')
for (const entry of inventory.artifacts) {
  const device = LINK_DEVICES.find(item => item.machine === entry.machine), release = device?.releases.find(item => item.version === entry.release)
  if (!release || entry.path !== 'event-cores/' + entry.machine + '/' + entry.release + '.json') throw new Error('Invalid probe path')
  const bytes = await readFile(resolve(packages, entry.path)), original = JSON.parse(bytes.toString('utf8'))
  if (sha(bytes) !== entry.sha256 || original.stage !== inventory.stage || original.provenance.sourceCommit !== inventory.sourceCommit || original.providesInterface !== false) throw new Error('Probe inventory mismatch')
  for (const event of ['settings', 'render_in', 'render_out', 'api']) for (const mode of event === 'api' ? ['complete', 'missing-callback', 'no-memory', 'null-menu', 'null-row'] : ['empty', 'observe']) {
    const plan = structuredClone(original), image = Uint8Array.from({ length: 512 }, (_, i) => i % 2 ? 0x71 : 0x4e), view = new DataView(image.buffer)
    view.setUint16(0x138, 0x4eb9); view.setUint32(0x13a, Number(plan.stockBootTarget))
    const source = Buffer.from(plan.module.sections['.run'].parts[0][1], 'hex')
    plan.sites = [{ addr: '0x40000538', len: 6, stockSha256: sha(image.subarray(0x138, 0x13e)), op: 'jsr', target: 'mw_boot' }]
    plan.stockResumes = plan.stockResumes.map((resume, index) => {
      const name = resume.symbol.replace('mw_resume_', ''), offset = 0x20 + index * 0x20, addr = device.mainLoad + offset
      image.set(Buffer.from(fixtures.instructions[name], 'hex'), offset)
      const definition = plan.module.symbols[resume.symbol], continuation = plan.module.symbols['mw_continue_' + name]
      // Rebind only our authored absolute jump for this synthetic environment.
      if (source.readUInt16BE(definition[1] + 6) !== 0x4ef9 || source.readUInt32BE(definition[1] + 8) !== continuation[1]) throw new Error('Authored continuation jump changed')
      source.writeUInt32BE(addr + 6, definition[1] + 8)
      plan.module.symbols['mw_continue_' + name] = ['abs', addr + 6]
      const site = { addr: '0x' + addr.toString(16), len: 6, stockSha256: sha(image.subarray(offset, offset + 6)), op: 'jsr', target: 'mw_hook_' + name }
      plan.sites.push(site)
      return { symbol: resume.symbol, addr: site.addr, len: 6, stockSha256: site.stockSha256 }
    })
    plan.module.sections['.run'].parts[0][1] = source.toString('hex')
    // Stock helper calls are synthetic callbacks below, not firmware routines.
    delete plan.stockRoutineBindings
    const syxSha256 = 'a'.repeat(64), synthetic = { ...device, releases: [{ ...release, mainLength: image.length, mainSha256: sha(image), syxSha256 }] }
    plan.module.target = { device: device.key, os: release.version, syx_sha256: syxSha256 }
    const handlers = mode === 'observe' ? [0x41001000, 0x41001100] : []
    plan.module.contribute = handlers.map((handler, index) => ({ to: 'ev_' + event, order: index, data: '00000000', relocs: [[0, 'abs32', 'abs', handler]] }))
    const linked = await linkMods([parseElemod(await materializeModuleObject(plan, image, [synthetic]), 'synthetic event core', [synthetic])], image)
    cases.push({ machine: entry.machine, release: entry.release, event, mode, image: Buffer.from(linked.image).toString('hex'), imageBase: device.mainLoad,
      entry: linked.map['core:' + (event === 'api' ? 'core_additem' : 'mw_hook_' + event)],
      continuation: event === 'api' ? null : Number(plan.module.symbols['mw_continue_' + event][1]), handlers, layout: linked.layout,
      helperCalls: Object.fromEntries(Object.entries(original.stockRoutineBindings).map(([name, binding]) => [name, Number(binding.addr)])), emacHarness: fixtures.emacHarness })
  }
}
const scratch = await mkdtemp(resolve(tmpdir(), 'modwerk-events-cpu-'))
try {
  const path = resolve(scratch, 'synthetic.json'); await writeFile(path, JSON.stringify(cases))
  execFileSync(resolve(one('--python')), [resolve(root, 'sdk/elemod/core/tests/events-cpu.py'), path], { stdio: 'inherit', timeout: 60_000 })
} finally { await rm(scratch, { recursive: true, force: true }) }
