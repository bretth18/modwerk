// Explicit private check; never run firmware or the native oracle in npm check.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { composeOs } from '../src/engine/compose-os.ts'
import { composeStaticOs, planStaticOs } from '../src/engine/static-compose.ts'
import { defaultChoosers } from '../src/engine/choosers.ts'
import { createStartupAnimationWrites } from '../src/engine/startup-animation.ts'
import { applyGuardedOsWrites, OS_LOAD_ADDRESS } from '../src/engine/os-patches.ts'
import { decodeFirmware, encodeFirmware } from '../src/engine/elek.ts'
import { FIRMWARE_VERSION } from '../src/engine/protocol.ts'

const [input, output] = process.argv.slice(2)
if (!input || !output || process.argv.length !== 4) throw new Error('Usage: node scripts/verify-startup-animation-native.mjs original-MAIN-or-firmware.bin NEW-private-report-directory')
const root = fileURLToPath(new URL('../', import.meta.url)), out = resolve(output)
if (out === root.slice(0, -1) || out.startsWith(root) || existsSync(out)) throw new Error('Use a new private report directory outside the repository.')
mkdirSync(out)
const work = mkdtempSync(join(tmpdir(), 'modwerk-startup-')), native = fileURLToPath(new URL('../sdk/runtime/startup/build.py', import.meta.url))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const inputBytes = new Uint8Array(readFileSync(input)), inputHash = sha(inputBytes)
const container = inputBytes.length === 1112560 ? null : decodeFirmware(inputBytes)
const original = container?.mainOs ?? inputBytes, before = sha(original)
assert.equal(before, '164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e', 'Use the fingerprinted original MAIN OS 1.40C')
const writes = createStartupAnimationWrites(), proofs = []
const cases = [[], ['repitch'], ['miniverb'], ['tapeecho', 'euclid'], ['analog-bassdrum'], ['sidechain-compressor'], ['usb-audio-out-tracks-main-cue', 'quantizer'], ['midi-scenes']].map(ids => ({ ids, loader: false, direct: false, keep: false }))
cases.push({ ids: ['miniverb'], loader: true, direct: false, keep: false }, { ids: [], loader: false, direct: true, keep: true })
try {
  for (const test of cases) {
    const profile = defaultChoosers(test.ids, test.keep)
    const result = test.direct ? await composeStaticOs(original, test.ids, profile) : await composeOs(original, test.ids, profile, { loader: test.loader })
    // Prove the shared graphics spans are disjoint from every other write.
    if (!test.loader && !test.ids.includes('midi-scenes')) {
      const plan = await planStaticOs(original, test.ids, profile)
      for (const graphic of writes) for (const other of [...plan.menus.writes, ...plan.dsp.writes, ...plan.platform, ...plan.logging.writes]) {
        assert(graphic.address + graphic.guardLength <= other.address || other.address + other.guardLength <= graphic.address, 'Startup graphics overlap ' + other.note)
      }
    }
    const baseline = result.bytes.slice()
    for (const write of writes) {
      const at = write.address - OS_LOAD_ADDRESS
      assert.deepEqual(result.bytes.subarray(at, at + write.bytes.length), write.bytes)
      baseline.set(original.subarray(at, at + write.bytes.length), at)
    }
    const source = join(work, 'baseline.bin'), target = join(work, 'native.bin')
    writeFileSync(source, baseline)
    execFileSync('python3', ['-B', native, source, target], { stdio: 'pipe' })
    assert.equal(Buffer.compare(Buffer.from(result.bytes), readFileSync(target)), 0, 'Complete native/browser image parity')
    let firmware = null
    if (container) {
      const update = encodeFirmware(container, result.bytes, FIRMWARE_VERSION)
      const decoded = decodeFirmware(update)
      assert.equal(Buffer.compare(Buffer.from(decoded.mainOs), Buffer.from(result.bytes)), 0, 'Complete firmware round trip')
      assert.deepEqual(decoded.tail, container.tail); assert.equal(decoded.seed, container.seed)
      firmware = { bytes: update.length, sha256: sha(update), roundTrip: 'passed' }
    }
    const proof = { ...test, bytes: result.bytes.length, sha256: sha(result.bytes), nativeParity: 'passed', firmware }
    proofs.push(proof)
    console.log((test.ids.join('+') || 'core only') + ': complete native/browser image parity passed')
  }
  for (const write of writes) {
    const changed = original.slice(); changed[write.address - OS_LOAD_ADDRESS] ^= 1
    await assert.rejects(applyGuardedOsWrites(changed, writes), /guard/)
    const source = join(work, 'changed.bin'), target = join(work, 'refused.bin')
    writeFileSync(source, changed)
    assert.throws(() => execFileSync('python3', ['-B', native, source, target], { stdio: 'pipe' }))
    assert.equal(existsSync(target), false, 'Native guard failure must not write partial output')
  }
  const patched = await applyGuardedOsWrites(original, writes)
  await assert.rejects(applyGuardedOsWrites(patched, writes), /guard/)
  assert.equal(sha(original), before)
  assert.equal(sha(inputBytes), inputHash)
  writeFileSync(join(out, 'proofs.json'), JSON.stringify({ kind: 'modwerk-startup-native-parity', originalSha256: before, writes: writes.map(({ bytes, ...guard }) => ({ ...guard, replacementSha256: sha(bytes) })), proofs, alteredGraphicsRejected: true, repeatPatchRejected: true, originalUnchanged: true, hardware: 'untested' }, null, 2) + '\n')
} finally { rmSync(work, { recursive: true, force: true }) }
console.log('10 image cases and both graphic guards passed' + (container ? ', including full firmware round trips' : '') + '. Firmware intermediates removed; physical reboot remains untested.')
