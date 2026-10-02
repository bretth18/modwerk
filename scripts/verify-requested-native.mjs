// Private developer verification. Reads local firmware; writes no firmware or extracted content.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { decodeFirmware } from '../src/engine/elek.ts'
import { composeOs } from '../src/engine/compose-os.ts'
import { CATALOG_SOURCE } from '../src/catalog/modules.ts'
import { defaultChoosers } from '../src/engine/choosers.ts'
import { moduleBuildPending } from '../src/catalog/build-support.ts'
const [file, proofFile] = process.argv.slice(2)
if (!file || !proofFile || process.argv.length !== 4) throw new Error('Usage: node scripts/verify-requested-native.mjs local-1.40C.bin local-proof.json')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const original = decodeFirmware(readFileSync(file)).mainOs, before = sha(original), facts = JSON.parse(readFileSync(proofFile, 'utf8'))
if (facts.sourceSha256 !== before) throw new Error('The local original OS differs from the native proofs.')
if (facts.schema !== 1 || facts.revision !== CATALOG_SOURCE.revision || facts.staticStock !== true || !Array.isArray(facts.proofs)) throw new Error('Native proofs do not match the reviewed static catalog.')
const visible = ['miniverb', 'tapeecho', 'euclid', 'repitch', 'analog-bassdrum', 'midi-scenes', 'usb-audio-out-tracks-main-cue', 'quantizer']
const retained = visible.filter(id => !['miniverb', 'tapeecho', 'euclid'].includes(id))
const key = p => [...p.ids].sort().join('+') + ':' + p.keepStockFx2
const expected = new Set()
for (const [ids, keepStockFx2] of [[visible, false], [retained, true]]) for (let mask = 0; mask < 2 ** ids.length; mask++) expected.add(key({ ids: ids.filter((_, bit) => mask >> bit & 1), keepStockFx2 }))
assert.equal(facts.proofs.length, expected.size, 'all 288 native profiles required')
const seen = new Set()
for (const proof of facts.proofs) {
  assert.ok(Array.isArray(proof.ids) && new Set(proof.ids).size === proof.ids.length && typeof proof.keepStockFx2 === 'boolean', 'valid unique module selection')
  const identity = key(proof)
  assert.ok(expected.has(identity) && !seen.has(identity), 'unique supported native profile')
  seen.add(identity)
  assert.ok(typeof proof.error === 'string' && proof.error.length > 0 || Number.isSafeInteger(proof.bytes) && proof.bytes > 0 && /^[a-f0-9]{64}$/.test(proof.sha256), 'native byte identity or refusal required')
}
const compose = composeOs
let built = 0, refused = 0, pending = 0
const failures = []
for (const proof of facts.proofs) {
  // The browser refuses build-pending modules before composing; their native identities wait for verification.
  if (proof.ids.some(moduleBuildPending)) { pending++; continue }
  let result, error
  try { result = await compose(original, proof.ids, defaultChoosers(proof.ids, proof.keepStockFx2)) } catch (e) { error = e.message }
  const label = proof.ids.join('+') + ' / stock FX2 ' + proof.keepStockFx2
  if (proof.error) { if (!error) failures.push(label + ': native refused, browser accepted'); else refused++ }
  else if (error) failures.push(label + ': browser refused: ' + error)
  else if (result.bytes.length !== proof.bytes || sha(result.bytes) !== proof.sha256) failures.push(label + ': native byte identity differs')
  else built++
}
const changed = original.slice(); changed[100] ^= 1
for (const id of ['analog-bassdrum', 'midi-scenes', 'usb-audio-out-tracks-main-cue', 'quantizer'].filter(id => !moduleBuildPending(id))) await assert.rejects(compose(changed, [id], defaultChoosers([id], false)), /original|unmodified/)
assert.equal(sha(original), before)
console.log(`${built} native byte-identical compositions, ${refused} matching refusals, ${failures.length} mismatches, ${pending} with a build-pending module not compared (${facts.proofs.length} selections).`)
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1 }
else console.log('Changed-firmware rejections passed for every buildable requested module; original file unchanged; no firmware written.')
