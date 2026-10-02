// Private developer parity check. Read local firmware in memory; retain no firmware bytes.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { composeOs } from '../src/engine/compose-os.ts'
import { decodeFirmware, encodeFirmware } from '../src/engine/elek.ts'
import { decodeElup } from '../src/engine/elup.ts'
import { defaultChoosers } from '../src/engine/choosers.ts'
import { CATALOG_SOURCE } from '../src/catalog/modules.ts'
const [file] = process.argv.slice(2)
if (!file || process.argv.length !== 3) throw new Error('Usage: node scripts/verify-tapehead-native.mjs local-original-1.40C.bin')
const facts = JSON.parse(readFileSync(new URL('../src/engine/assets/tapehead-composition-proofs.json', import.meta.url)))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const source = readFileSync(file), stock = decodeFirmware(source), original = stock.mainOs, before = sha(original)
assert.equal(facts.schema, 1); assert.equal(facts.revision, CATALOG_SOURCE.revision); assert.equal(facts.staticStock, true)
assert.equal(before, facts.sourceSha256); assert.equal(sha(source), facts.packing.sourceUpgradeSha256)
const ids = ['miniverb','tapeecho','euclid','repitch','tapehead','analog-bassdrum','usb-audio-out-tracks-main-cue','quantizer']
const key = proof => [...proof.moduleIds].sort().join('+') + ':' + proof.keepStockFx2
const expected = new Set()
for (let mask = 0; mask < 2 ** ids.length; mask++) for (const keepStockFx2 of [true, false]) {
  const moduleIds = ids.filter((_, bit) => mask >> bit & 1)
  if (moduleIds.includes('tapehead') && moduleIds.some(id => ids.slice(5).includes(id))) expected.add(key({ moduleIds, keepStockFx2 }))
}
assert.equal(expected.size, 224); assert.equal(facts.proofs.length, expected.size)
const seen = new Set(), failures = []; let built = 0, refused = 0, packed = 0
for (const proof of facts.proofs) {
  const label = key(proof)
  assert.ok(expected.has(label) && !seen.has(label), 'complete unique native coverage'); seen.add(label)
  const menus = defaultChoosers(proof.moduleIds, proof.keepStockFx2)
  assert.deepEqual(menus, { fx1: proof.menu.fx1, fx2: proof.menu.fx2 })
  let result, error
  try { result = await composeOs(original, proof.moduleIds, menus, { loader: false }) } catch (e) { error = e.message }
  if (proof.error) {
    const reason = proof.error.includes('stock effects only') ? /stock effects only/ : /does not fit|do not fit|overruns the region|nowhere to place|exceeds its reserved region/
    if (!reason.test(error ?? '')) failures.push(label + ': native refusal differs: ' + (error ?? 'browser accepted'))
    else refused++
  } else if (error || result.bytes.length !== proof.bytes || sha(result.bytes) !== proof.sha256) failures.push(label + ': native image differs: ' + (error ?? 'byte mismatch'))
  else {
    built++
    assert.ok(proof.firmware, 'native full packaging identity required')
    // The shared codec has exhaustive native identity records; exercise it again
    // on the three new retained/compact combinations with USB and Quantizer.
    if (proof.moduleIds.length <= 3) {
      const update = encodeFirmware(stock, result.bytes, proof.firmware.version), container = decodeElup(update).container
      if (sha(update) !== proof.firmware.sha256 || update.length !== proof.firmware.bytes || sha(container) !== proof.firmware.containerSha256 || container.length !== proof.firmware.containerBytes) failures.push(label + ': complete native package differs')
      else packed++
    }
  }
}
assert.equal(sha(original), before); assert.equal(sha(source), facts.packing.sourceUpgradeSha256)
const changed = original.slice(); changed[100] ^= 1
await assert.rejects(composeOs(changed, ['tapehead']), /original|unmodified/)
console.log(`${built} native byte-identical builds (${packed} identical complete packages), ${refused} matching refusals, ${failures.length} mismatches (${facts.proofs.length} profiles).`)
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1 }
else console.log('Changed-firmware rejection passed; original unchanged; no firmware written.')
