// Dynamic-loader native OS identities (explicitly enabled only in this verifier), compared in memory using the user's own firmware.
// No firmware, runtime or decoded stock files are written or uploaded.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { decodeElup } from '../src/engine/elup.ts'
import { encodeFirmware, decodeFirmware } from '../src/engine/elek.ts'
import { composeOs } from '../src/engine/compose-os.ts'
import { defaultChoosers, validateChoosers } from '../src/engine/choosers.ts'
import { CATALOG_SOURCE } from '../src/catalog/modules.ts'
const file = process.argv[2]
if (!file) { console.error('Usage: node scripts/verify-composition-native.mjs <own-original-1.40C.bin>'); process.exit(2) }
const fixtures = JSON.parse(readFileSync(new URL('../src/engine/assets/composition-proofs.json', import.meta.url)))
assert.equal(fixtures.revision, CATALOG_SOURCE.revision)
assert.ok(fixtures.packing, 'native packaging source identity')
assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), fixtures.packing.sourceUpgradeSha256, 'same original card firmware input')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const stock = decodeFirmware(readFileSync(file)), original = stock.mainOs, before = hash(original)
for (const proof of fixtures.proofs) {
  if (proof.default) assert.deepEqual(defaultChoosers(proof.moduleIds, true, true), { fx1: proof.menu.fx1, fx2: proof.menu.fx2 })
  if (proof.error) {
    await assert.rejects(composeOs(original, proof.moduleIds, proof.menu, { loader: true }), /does not fit|do not fit|exceeds its reserved region|more space/)
    assert.equal(hash(original), before)
    console.log('Crowded stock-chooser selection: native and browser both reject allocation; original preserved.')
    continue
  }
  const result = await composeOs(original, proof.moduleIds, proof.menu, { loader: true })
  assert.equal(result.bytes.length, proof.bytes)
  assert.equal(hash(result.bytes.subarray(0, original.length)), proof.osSha256, 'entire patched original extent')
  assert.equal(hash(result.bytes.subarray(original.length)), proof.appendSha256, 'entire runtime append')
  assert.equal(hash(result.bytes), proof.sha256, 'entire composed OS')
  assert.deepEqual(result.chooser.hidden, proof.menu.hidden)
  assert.equal(hash(original), before)
  assert.ok(proof.firmware, 'complete native update packaging identity')
  const update = encodeFirmware(stock, result.bytes, proof.firmware.version), container = decodeElup(update).container
  assert.equal(container.length, proof.firmware.containerBytes, 'native ELEK length')
  assert.equal(hash(container), proof.firmware.containerSha256, 'entire native ELEK container')
  assert.equal(update.length, proof.firmware.bytes, 'native ELUP length')
  assert.equal(hash(update), proof.firmware.sha256, 'entire native ELUP update')
  assert.deepEqual(decodeFirmware(update).mainOs, result.bytes)
  assert.equal(hash(original), before)
  console.log(`${proof.moduleIds.join(', ') || 'Stock effects'}; ${proof.default ? 'stock choosers retained' : 'compact chooser'}: all ${proof.bytes} OS bytes and ${update.length} final firmware bytes match native output.`)
}
const modified = original.slice(); modified[100] ^= 1
await assert.rejects(composeOs(modified, ['repitch'], undefined, { loader: true }), /original OS fingerprint/)
assert.throws(() => validateChoosers(['miniverb'], { fx1: ['MINIVERB'], fx2: [] }), /FX2 only/)
assert.throws(() => validateChoosers(['spectrum'], { fx1: [], fx2: ['SPECTRUM'] }), /FX1 only/)
assert.throws(() => validateChoosers([], { fx1: [], fx2: ['EUCLID'] }), /does not include/)
assert.throws(() => validateChoosers(['character'], { fx1: ['CHARACTER'], fx2: [] }), /X-table placement/)
console.log('Complete native OS comparisons and invalid / unsupported selection, wrong-slot, crowded-menu and modified-firmware rejection passed. No firmware files written.')
