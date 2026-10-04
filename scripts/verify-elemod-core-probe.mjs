// SPDX-License-Identifier: GPL-3.0-or-later
// Explicit local evidence command. Never run in CI or a visitor build.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, basename } from 'node:path'
import { createHash } from 'node:crypto'
import { readEle3Syx, mainImage, packMain, writeEle3Syx, verifyEle3Build, ELE3_DEVICES } from '../src/engine/elektron/ele3.ts'
import { LINK_DEVICES, parseElemod, linkMods } from '../src/engine/elektron/elemod.ts'
import { materializeModuleObject } from '../src/engine/elektron/module-object.ts'

const args = process.argv.slice(2), values = name => args.flatMap((arg, i) => arg === name ? [args[i + 1]] : []), one = name => values(name)[0]
if (!one('--packages') || !one('--out') || !values('--firmware').length) throw new Error('Usage: verify-elemod-core-probe.mjs --packages DIR --out LOCAL_DIR --firmware machine:stock.syx ...')
if (args.includes('--ui-hooks') && args.includes('--events')) throw new Error('Select only one development probe stage')
const commonHooks = args.includes('--events'), uiHooks = commonHooks || args.includes('--ui-hooks')
const stage = commonHooks ? 'event-hook-probe' : uiHooks ? 'ui-hook-probe' : 'boot-probe', prefix = commonHooks ? 'event-cores' : uiHooks ? 'ui-cores' : 'cores'
const packages = resolve(one('--packages')), output = resolve(one('--out')), sha = b => createHash('sha256').update(b).digest('hex')
const inventory = JSON.parse(await readFile(resolve(packages, commonHooks ? 'core-event-build.json' : uiHooks ? 'core-ui-build.json' : 'core-build.json'), 'utf8')), cases = []
if (inventory.schemaVersion !== 1 || inventory.stage !== stage || inventory.providesInterface !== false) throw new Error('Expected development probe inventory')
await mkdir(output, { recursive: true })
for (const input of values('--firmware')) {
  const colon = input.indexOf(':'), machine = input.slice(0, colon), path = input.slice(colon + 1), device = LINK_DEVICES.find(d => d.machine === machine)
  if (!device || !path) throw new Error('Expected machine:path')
  const raw = new Uint8Array(await readFile(path)), release = device.releases.find(r => r.syxSha256 === sha(raw))
  if (!release) throw new Error('Unrecognized stock firmware')
  const entry = inventory.artifacts.find(e => e.machine === machine && e.release === release.version)
  if (!entry || entry.path !== prefix + '/' + machine + '/' + release.version + '.json') throw new Error('Missing core probe')
  const bytes = await readFile(resolve(packages, entry.path)), plan = JSON.parse(bytes.toString('utf8'))
  if (sha(bytes) !== entry.sha256 || plan.provenance.sourceCommit !== inventory.sourceCommit || plan.id !== 'core' || plan.stage !== stage || plan.providesInterface !== false || plan.machine !== machine || plan.release !== release.version || plan.sites.length !== (commonHooks ? 8 : uiHooks ? 5 : 1)) throw new Error('Core probe identity/hash mismatch')
  const container = readEle3Syx(raw), image = mainImage(container, ELE3_DEVICES[machine]), view = new DataView(image.buffer, image.byteOffset, image.byteLength)
  const boot = Number(plan.sites[0].addr) - device.mainLoad, binding = plan.module.symbols.mw_stock_boot
  if (view.getUint16(boot) !== 0x4eb9 || view.getUint32(boot + 2) !== Number(plan.stockBootTarget) || binding?.[0] !== 'abs' || binding[1] !== Number(plan.stockBootTarget)) throw new Error('Original boot call binding changed')
  if (uiHooks) {
    if (Object.keys(plan.stockCallBindings ?? {}).sort().join() !== 'mw_stock_draw,mw_stock_enc,mw_stock_key,mw_stock_tick') throw new Error('Invalid stock UI call bindings')
    for (const [symbol, call] of Object.entries(plan.stockCallBindings)) {
      const offset = Number(call.addr) - device.mainLoad, definition = plan.module.symbols[symbol]
      if (offset < 0 || offset + 6 > image.length || view.getUint16(offset) !== 0x4eb9 || view.getUint32(offset + 2) !== Number(call.target) || definition?.[0] !== 'abs' || definition[1] !== Number(call.target) || !plan.sites.some(site => site.addr === call.addr && site.target === symbol.replace('stock', 'hook'))) throw new Error('Original UI call binding changed')
    }
  }
  if (commonHooks) {
    if (plan.stockResumes?.length !== 3 || Object.keys(plan.stockRoutineBindings ?? {}).sort().join() !== 'mw_stock_allocate,mw_stock_function_manager,mw_stock_item_construct,mw_stock_menu_append') throw new Error('Invalid common event bindings')
    for (const [symbol, call] of Object.entries(plan.stockRoutineBindings)) {
      const offset = Number(call.addr) - device.mainLoad, definition = plan.module.symbols[symbol]
      if (!Number.isSafeInteger(call.len) || call.len < 2 || call.len > 256 || offset < 0 || offset + call.len > image.length || sha(image.subarray(offset, offset + call.len)) !== call.stockSha256 || definition?.[0] !== 'abs' || definition[1] !== Number(call.addr)) throw new Error('Original stock helper binding changed')
    }
  }
  const linked = await linkMods([parseElemod(await materializeModuleObject(plan, image))], image)
  const rebuilt = writeEle3Syx(container, packMain(linked.image), ELE3_DEVICES[machine], 'MW01')
  const facts = verifyEle3Build(rebuilt, container, linked.image, ELE3_DEVICES[machine], 'MW01')
  const name = machine + '-' + release.version + '-' + stage + '.syx'
  await writeFile(resolve(output, name), rebuilt)
  const result = { machine, release: release.version, stock: basename(path), stockSha256: sha(raw), sourceCommit: inventory.sourceCommit, recipeSha256: entry.sha256,
    stage, providesInterface: false, containerVerified: true, buildSha256: sha(rebuilt), imageSha256: sha(linked.image), layout: linked.layout, facts }
  cases.push(result); console.log(machine + ' ' + release.version + ': ' + stage + ' container verified; emulator evidence still required')
}
await writeFile(resolve(output, commonHooks ? 'event-hook-probes.json' : uiHooks ? 'ui-hook-probes.json' : 'boot-probes.json'), JSON.stringify({ sourceCommit: inventory.sourceCommit, cases }, null, 2) + '\n')
