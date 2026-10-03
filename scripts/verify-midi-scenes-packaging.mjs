// Private local verification only. Never runs in ordinary checks or visitor builds.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { decodeFirmware, encodeContainer, encodeFirmware } from '../src/engine/elek.ts'
import { reconstructMidiScenes } from '../src/engine/midi-scenes-patch.ts'

const [file] = process.argv.slice(2)
if (!file || process.argv.length !== 3) throw new Error('Usage: node scripts/verify-midi-scenes-packaging.mjs original-local-1.40C-update.bin')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const original = new Uint8Array(await readFile(file))
assert.equal(sha(original), '34695b606eb00e1b4dded5fd0c4b66f3a460522a632e47d7416dbd220599e1ad', 'Original local OS 1.40C update required')
const recipe = JSON.parse(await readFile(new URL('../sdk/drafts/midi-scenes/recipe.json', import.meta.url), 'utf8'))
const proof = JSON.parse(await readFile(new URL('../sdk/drafts/midi-scenes/evidence/packaging.json', import.meta.url), 'utf8'))
const stock = decodeFirmware(original), main = await reconstructMidiScenes(stock.mainOs, recipe)
const container = encodeContainer(stock, main, 'MIDISC2.0'), update = encodeFirmware(stock, main, 'MIDISC2.0')
assert.equal(sha(main), proof.mainSha256)
assert.equal(sha(container), proof.nativeContainerSha256)
assert.equal(sha(update), proof.nativeUpdateSha256)
assert.deepEqual(decodeFirmware(update).mainOs, main)
const corrupt = original.slice(); corrupt[100] ^= 1
assert.throws(() => decodeFirmware(corrupt))
assert.throws(() => decodeFirmware(original.subarray(0, original.length - 4)))
assert.equal(sha(original), '34695b606eb00e1b4dded5fd0c4b66f3a460522a632e47d7416dbd220599e1ad')
console.log(JSON.stringify({ status: 'passed', version: 'MIDISC2.0', mainSha256: sha(main), containerSha256: sha(container), updateSha256: sha(update), nativeContainerParity: true, nativeUpdateParity: true, roundTrip: true, corruptAndTruncatedUpdatesRefused: true, originalUnchanged: true, firmwareSaved: false }))
