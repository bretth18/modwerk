// SPDX-License-Identifier: GPL-3.0-or-later
// Exercises compiled original code on synthetic memory, with no firmware input.
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { LINK_DEVICES, parseElemod, linkMods } from '../src/engine/elektron/elemod.ts'

const args = process.argv.slice(2), one = name => args[args.indexOf(name) + 1]
if (!args.includes('--packages') || !args.includes('--python')) throw new Error('Usage: verify-elemod-core-cpu.mjs --packages DIR --python PATCHED_UNICORN_PYTHON')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), packages = resolve(one('--packages')), cases = []
for (const device of LINK_DEVICES) {
  const release = device.releases[0], plan = JSON.parse(await readFile(resolve(packages, 'cores', device.machine, release.version + '.json'), 'utf8'))
  if (plan.stage !== 'boot-probe' || plan.providesInterface !== false) throw new Error('Expected the original boot-only probe')
  for (const mode of ['normal', 'no-bss', 'no-run', 'empty']) {
    // NOPs and an original absolute-call placeholder: no owner's image is read.
    const image = Uint8Array.from({ length: 512 }, (_, i) => i % 2 ? 0x71 : 0x4e), view = new DataView(image.buffer)
    view.setUint16(0x138, 0x4eb9); view.setUint32(0x13a, Number(plan.stockBootTarget))
    const sha = bytes => createHash('sha256').update(bytes).digest('hex'), syxSha256 = 'a'.repeat(64)
    const synthetic = { ...device, releases: [{ ...release, mainLength: image.length, mainSha256: sha(image), syxSha256 }] }
    const document = structuredClone(plan.module)
    document.target = { device: device.key, os: release.version, syx_sha256: syxSha256 }
    document.sites = [{ addr: '0x40000538', len: 6, new: '4eb900000000', kind: 'code', stock_sha256: sha(image.subarray(0x138, 0x13e)), relocs: [[2, 'abs32', 'sym:mw_boot', 0]] }]
    if (['no-bss', 'empty'].includes(mode)) delete document.sections['.bss']
    if (['no-run', 'empty'].includes(mode)) {
      delete document.sections['.run']; document.collections = {}
      document.relocs = document.relocs.filter(([section]) => section === '.boot')
      document.imports = document.imports.filter(name => !name.startsWith('ev_'))
    }
    document.symbols = Object.fromEntries(Object.entries(document.symbols).filter(([, [section]]) => section === 'abs' || section in document.sections))
    document.exports = document.exports.filter(name => name in document.symbols)
    const linked = await linkMods([parseElemod(document, 'synthetic core', [synthetic])], image)
    cases.push({ machine: device.machine, mode, image: Buffer.from(linked.image).toString('hex'), imageBase: device.mainLoad,
      boot: linked.map['core:mw_boot'], stockCall: Number(plan.stockBootTarget), layout: linked.layout })
  }
}
const scratch = await mkdtemp(resolve(tmpdir(), 'modwerk-core-cpu-'))
try {
  const path = resolve(scratch, 'synthetic.json'); await writeFile(path, JSON.stringify(cases))
  execFileSync(resolve(one('--python')), [resolve(root, 'sdk/elemod/core/tests/boot-cpu.py'), path], { stdio: 'inherit', timeout: 60_000 })
} finally { await rm(scratch, { recursive: true, force: true }) }
