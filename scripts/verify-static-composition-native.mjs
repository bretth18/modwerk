// Loader-free composition against native static-stock output, for every module subset with and without
// the stock FX2 effects. Uses the user's own firmware in memory; nothing is written or uploaded.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { decodeFirmware, encodeFirmware } from '../src/engine/elek.ts'
import { decodeElup } from '../src/engine/elup.ts'
import assert from 'node:assert/strict'
import { composeOs } from '../src/engine/compose-os.ts'
import { defaultChoosers, validateChoosers } from '../src/engine/choosers.ts'
import { CATALOG_SOURCE, MODULES } from '../src/catalog/modules.ts'
const file = process.argv[2]
const packingMode = process.argv[3] ?? '--packing=all'
if (!file || !['--packing=all', '--packing=representative'].includes(packingMode) || process.argv.length > 4) {
  console.error('Usage: node scripts/verify-static-composition-native.mjs <own-original-1.40C.bin> [--packing=all|--packing=representative]')
  process.exit(2)
}
// OS composition and refusals always cover all 512 profiles. The optional shorter packing pass covers
// stock-retaining ROM-only, compact DSP-only, resident DSP + ColdFire, the four-module CPU runtime, and the
// stock-retaining menus visitors build: Tape Echo in SPRING REV's place, and the four modules in DARK REV's.
const representative = new Set(['repitch:true', 'miniverb:false', 'character+miniverb+tapeecho:false', 'euclid+miniverb+repitch+tapeecho:false', 'tapehead:true', 'tapehead:false', 'miniverb+repitch+tapehead:true', 'tapeecho:true', 'euclid+miniverb+repitch+tapeecho:true'])
const packs = proof => packingMode === '--packing=all' || representative.has([...proof.moduleIds].sort().join('+') + ':' + proof.keepStockFx2)
const fixtures = JSON.parse(readFileSync(new URL('../src/engine/assets/static-composition-proofs.json', import.meta.url)))
if (fixtures.schema !== 1 || fixtures.revision !== CATALOG_SOURCE.revision || fixtures.staticStock !== true) throw new Error('Static proofs do not match the pinned catalog.')
assert.ok(fixtures.packing, 'same-input native packaging source identity')
const profileKey = proof => [...proof.moduleIds].sort().join('+') + ':' + proof.keepStockFx2
const originalIds = ['spectrum','modulation','character','miniverb','tapeecho','euclid','repitch','tapehead']
const verifiedModules = MODULES.filter(module => originalIds.includes(module.id))
const coverage = new Set(fixtures.proofs.map(profileKey))
assert.equal(fixtures.proofs.length, 2 ** verifiedModules.length * 2, 'every module subset and chooser setting')
assert.equal(coverage.size, fixtures.proofs.length, 'unique proof profiles')
for (let mask = 0; mask < 2 ** verifiedModules.length; mask++) for (const keepStockFx2 of [true, false]) {
  const moduleIds = verifiedModules.filter((_, bit) => mask >> bit & 1).map(module => module.id)
  assert.ok(coverage.has(profileKey({ moduleIds, keepStockFx2 })), 'complete native proof coverage')
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const source = readFileSync(file), stock = decodeFirmware(source), original = stock.mainOs, before = hash(original)
// Native packaging identities exist when the proofs were exported with --stock-bin.
if (hash(source) !== fixtures.packing.sourceUpgradeSha256) throw new Error('Use the same original upgrade file the packaging proofs were made from.')
let packed = 0
if (before !== fixtures.sourceSha256) throw new Error('Use the same original OS 1.40C the proofs were made from.')
const failures = [], counts = { built: 0, refused: 0 }
for (const proof of fixtures.proofs) {
  const label = (proof.moduleIds.join('+') || 'stock') + (proof.keepStockFx2 ? ' (stock FX2 kept)' : ' (stock FX2 off)')
  const site = defaultChoosers(proof.moduleIds, proof.keepStockFx2)
  if (JSON.stringify(site) !== JSON.stringify({ fx1: proof.menu.fx1, fx2: proof.menu.fx2 })) { failures.push(label + ': the site would build different menus than the proof'); continue }
  let result, error
  try { result = await composeOs(original, proof.moduleIds, site, { loader: false }) } catch (caught) { error = caught instanceof Error ? caught.message : String(caught) }
  if (hash(original) !== before) throw new Error('The original OS changed during composition.')
  if (proof.error) {
    // Native wording is the oracle: the overrun line verbatim, the other refusals by their reason.
    const expected = proof.error.includes('overruns the region') ? proof.error : proof.error.includes('nowhere to place') ? proof.error.split('. ')[0] : 'does not fit'
    const matches = expected === 'does not fit' ? /does not fit|do not fit|exceeds its reserved region/.test(error ?? '') : !!error?.includes(expected)
    if (!matches) failures.push(label + ': native refuses (' + proof.error.slice(0, 90) + ') but the browser ' + (error ? 'said: ' + error.slice(0, 90) : 'built it'))
    else counts.refused++
    continue
  }
  if (error) { failures.push(label + ': native builds it but the browser refused: ' + error.slice(0, 120)); continue }
  const { bytes } = result
  if (bytes.length !== proof.bytes || hash(bytes) !== proof.sha256) {
    const os = hash(bytes.subarray(0, original.length)) === proof.osSha256, append = hash(bytes.subarray(original.length)) === proof.appendSha256
    failures.push(label + ': ' + bytes.length + ' bytes vs native ' + proof.bytes + (os ? '' : '; patched OS differs') + (append ? '' : '; appended runtime differs'))
  } else {
    counts.built++
    assert.ok(proof.firmware, 'complete native packaging identity for every accepted profile')
    assert.equal(proof.firmware.version, fixtures.packing.version, 'native upgrade version')
    if (packs(proof)) {
      // The browser's ELEK/ELUP packaging of this exact image against native's container and update.
      const update = encodeFirmware(stock, bytes, proof.firmware.version), container = decodeElup(update).container
      if (container.length !== proof.firmware.containerBytes || hash(container) !== proof.firmware.containerSha256) failures.push(label + ': ELEK container differs from native')
      else if (update.length !== proof.firmware.bytes || hash(update) !== proof.firmware.sha256) failures.push(label + ': ELUP update differs from native')
      else if (hash(decodeFirmware(update).mainOs) !== hash(bytes)) failures.push(label + ': packed update does not round-trip')
      else packed++
    }
  }
}
if (hash(original) !== before || hash(source) !== fixtures.packing.sourceUpgradeSha256) throw new Error('The original firmware changed during packaging.')
console.log(counts.built + ' builds byte-identical to native' + (fixtures.packing ? ' (' + packed + ' with identical ELEK container and ELUP update)' : '') + ', ' + counts.refused + ' refusals matching native, ' + failures.length + ' mismatches (' + fixtures.proofs.length + ' proofs).')
for (const failure of failures.slice(0, 40)) console.log('  ' + failure)
if (failures.length) process.exit(1)
console.log('No firmware written; the original OS was unchanged throughout.')
// Rejections that must hold without the loader as well.
const modified = original.slice(); modified[100] ^= 1
await assert.rejects(composeOs(modified, ['repitch'], undefined, { loader: false }), /original OS fingerprint|original, unmodified OS/)
assert.throws(() => validateChoosers(['miniverb'], { fx1: ['MINIVERB'], fx2: [] }), /FX2 only/)
assert.throws(() => validateChoosers(['spectrum'], { fx1: [], fx2: ['SPECTRUM'] }), /FX1 only/)
assert.throws(() => validateChoosers([], { fx1: [], fx2: ['EUCLID'] }), /does not include/)
console.log('Modified-firmware, wrong-slot and unsupported-chooser rejections passed.')
