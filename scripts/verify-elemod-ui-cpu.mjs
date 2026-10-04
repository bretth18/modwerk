// SPDX-License-Identifier: GPL-3.0-or-later
// Compiled original UI adapters and dispatcher on synthetic memory; no firmware input.
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { LINK_DEVICES, parseElemod, linkMods } from '../src/engine/elektron/elemod.ts'

const args = process.argv.slice(2), one = name => args[args.indexOf(name) + 1]
if (!args.includes('--packages') || !args.includes('--python')) throw new Error('Usage: verify-elemod-ui-cpu.mjs --packages DIR --python PATCHED_UNICORN_PYTHON')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), packages = resolve(one('--packages')), cases = []
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const inventory = JSON.parse(await readFile(resolve(packages, 'core-ui-build.json'), 'utf8'))
if (inventory.stage !== 'ui-hook-probe' || inventory.providesInterface !== false || inventory.artifacts.length !== 4) throw new Error('Expected four UI development probes')
for (const entry of inventory.artifacts) {
  const device = LINK_DEVICES.find(item => item.machine === entry.machine), release = device?.releases.find(item => item.version === entry.release)
  if (!release || entry.path !== 'ui-cores/' + entry.machine + '/' + entry.release + '.json') throw new Error('Invalid probe path')
  const bytes = await readFile(resolve(packages, entry.path)), plan = JSON.parse(bytes.toString('utf8'))
  if (sha(bytes) !== entry.sha256 || plan.stage !== inventory.stage || plan.provenance.sourceCommit !== inventory.sourceCommit || plan.providesInterface !== false) throw new Error('Probe inventory mismatch')
  for (const event of ['tick', 'draw', 'key', 'enc']) for (const mode of ['empty', 'observe', ...(['key', 'enc'].includes(event) ? ['consume-first', 'consume-second'] : [])]) {
    // A NOP image with a synthetic boot call. The real UI sites are not read.
    const image = Uint8Array.from({ length: 512 }, (_, i) => i % 2 ? 0x71 : 0x4e), view = new DataView(image.buffer)
    view.setUint16(0x138, 0x4eb9); view.setUint32(0x13a, Number(plan.stockBootTarget))
    const syxSha256 = 'a'.repeat(64), synthetic = { ...device, releases: [{ ...release, mainLength: image.length, mainSha256: sha(image), syxSha256 }] }
    const document = structuredClone(plan.module)
    document.target = { device: device.key, os: release.version, syx_sha256: syxSha256 }
    document.sites = [{ addr: '0x40000538', len: 6, new: '4eb900000000', kind: 'code', stock_sha256: sha(image.subarray(0x138, 0x13e)), relocs: [[2, 'abs32', 'sym:mw_boot', 0]] }]
    const handlers = mode === 'empty' ? [] : mode === 'consume-second' ? [0x41001000, 0x41001100] : [0x41001000]
    document.contribute = handlers.map((handler, index) => ({ to: 'ev_' + event, order: index, data: '00000000', relocs: [[0, 'abs32', 'abs', handler]] }))
    const linked = await linkMods([parseElemod(document, 'synthetic UI core', [synthetic])], image)
    cases.push({ machine: entry.machine, release: entry.release, event, mode, image: Buffer.from(linked.image).toString('hex'), imageBase: device.mainLoad,
      entry: linked.map['core:mw_hook_' + event], stockCall: Number(plan.stockCallBindings['mw_stock_' + event].target), handlers, layout: linked.layout })
  }
}
const scratch = await mkdtemp(resolve(tmpdir(), 'modwerk-ui-cpu-'))
try {
  const path = resolve(scratch, 'synthetic.json'); await writeFile(path, JSON.stringify(cases))
  execFileSync(resolve(one('--python')), [resolve(root, 'sdk/elemod/core/tests/ui-cpu.py'), path], { stdio: 'inherit', timeout: 60_000 })
} finally { await rm(scratch, { recursive: true, force: true }) }
