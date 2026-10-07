// Local-only verification. Native facts contain hashes, never firmware bytes.
// Temporary bootloader inputs (including local DSP uploads) are removed on exit.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { decodeFirmware, encodeFirmware } from '../src/engine/elek.ts'
import { planStaticOs } from '../src/engine/static-compose.ts'
import { composeAnalogBd, createAnalogBootstrap } from '../src/engine/analog-bd.ts'
import { defaultChoosers } from '../src/engine/choosers.ts'
import { applyGuardedOsWrites, OS_LOAD_ADDRESS } from '../src/engine/os-patches.ts'
import { BOOTSTRAP_ADDRESS, rollingHash } from '../src/engine/bootstrap.ts'
import { packGka3, unpackGka3 } from '../src/engine/runtime-pack.ts'
import { LOGGER_RETAINED_BYTES } from '../src/engine/core-logger.ts'
import { FIRMWARE_VERSION } from '../src/engine/protocol.ts'
import { ANALOG_BD_DSP_COMPANIONS } from '../src/engine/analog-bd-layout.ts'
import { CATALOG_SOURCE } from '../src/catalog/modules.ts'
import { compareSelection } from './native-comparison.mjs'

const [file, proofFile] = process.argv.slice(2)
if (!file || !proofFile || process.argv.length !== 4) throw new Error('Usage: node scripts/verify-analog-bd-native.mjs original-1.40C.bin native-proof.json')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const decoded = decodeFirmware(fs.readFileSync(file)), original = decoded.mainOs, before = sha(original)
const facts = JSON.parse(fs.readFileSync(proofFile, 'utf8'))
assert.equal(facts.schema, 1); assert.equal(facts.revision, CATALOG_SOURCE.revision)
assert.equal(facts.sourceSha256, before); assert.equal(facts.staticStock, true)
const utilities = ['repitch', 'usb-audio-out-tracks-main-cue', 'quantizer', 'previewvol', 'cc-map']
const scope = [...ANALOG_BD_DSP_COMPANIONS, ...utilities]
const key = (ids, keep) => [...ids].sort().join('+') + ':' + keep
const expected = new Set()
for (let mask = 0; mask < 2 ** scope.length; mask++) {
  const ids = scope.filter((_, bit) => mask >> bit & 1)
  const dsp = ids.filter(id => ANALOG_BD_DSP_COMPANIONS.includes(id)), utility = ids.filter(id => utilities.includes(id))
  if (!utility.length || dsp.length <= 1 && [1, 5].includes(utility.length)) for (const keep of [true, false]) expected.add(key(['analog-bassdrum', ...ids], keep))
}
assert.equal(facts.proofs.length, expected.size)
assert.equal(new Set(facts.proofs.map(proof => key(proof.moduleIds, proof.keepStockFx2))).size, expected.size)
const root = fileURLToPath(new URL('../', import.meta.url)), temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'modwerk-analog-proof-'))
let matched = 0, refused = 0, packed = 0
try {
  assert.equal(facts.moduleSourceTreeSha256, JSON.parse(fs.readFileSync(path.join(root, 'src/engine/assets/module-build.json'))).sourceTreeSha256)
  const builderFiles = ['tools/build/build_bus.py', 'tools/build/ab_image.py', 'tools/remix/loader.S']
  assert.deepEqual(Object.keys(facts.builderSources).sort(), builderFiles.sort())
  for (const file of builderFiles) assert.equal(sha(fs.readFileSync(path.join(root, 'sdk/octabam', file))), facts.builderSources[file], file + ': native evidence is stale')
  for (const proof of facts.proofs) {
    const label = key(proof.moduleIds, proof.keepStockFx2)
    assert.ok(expected.has(label), label)
    const profile = defaultChoosers(proof.moduleIds, proof.keepStockFx2)
    assert.deepEqual(profile, { fx1: proof.menu.fx1, fx2: proof.menu.fx2 }, label)
    let plan, analog, failure
    try {
      plan = await planStaticOs(original, proof.moduleIds, profile)
      const owned = await applyGuardedOsWrites(original, [...plan.menus.writes, ...plan.dsp.writes])
      analog = await composeAnalogBd(original, owned, proof.moduleIds, profile, plan.dsp.layouts)
    } catch (error) { failure = error.message }
    if (proof.error) {
      assert.ok(failure, label + ': native refused but browser accepted')
      const category = text => /overruns the region|does not fit any harvested run/.test(text) ? 'dsp'
        : /does not fit|do not fit|chooser list of|past the stock zero run|fits neither|exceeds its reserved region|need more space/.test(text) ? 'menu' : null
      assert.ok(category(proof.error), proof.error)
      assert.equal(category(failure), category(proof.error), label + ': ' + failure)
      assert.equal((await compareSelection(original, proof, profile)).failure, undefined, label + ': common native verifier')
      refused++; continue
    }
    assert.equal(failure, undefined, label)
    const reset = analog.bytes.slice()
    for (const write of plan.platform) {
      const offset = write.address - OS_LOAD_ADDRESS
      reset.set(original.subarray(offset, offset + write.bytes.length), offset)
    }
    assert.equal(sha(reset), proof.maskedOsSha256, label + ': native module-owned OS differs')
    for (const a of [...plan.menus.writes, ...plan.dsp.writes]) for (const b of [...plan.platform, ...plan.logging.writes]) {
      assert.ok(a.address >= b.address + b.bytes.length || b.address >= a.address + a.bytes.length, `${label}: ${a.note} overlaps ${b.note}`)
    }
    // Independently assemble/link the real logger-bearing bootstrap, with the
    // actual packed payload lengths. This exercises the >32 KiB table offset.
    const runtime = plan.runtime
    const bootstrap = await createAnalogBootstrap(runtime.bytes, analog.uploads, runtime.reserveBytes - LOGGER_RETAINED_BYTES, runtime)
    const compressed = packGka3(runtime.bytes), blob = new Uint8Array(Buffer.concat([Buffer.from('OCTA'), compressed]))
    const payloads = [{ blob, raw: runtime.bytes, destination: bootstrap.layout.base, stage: bootstrap.layout.stage }, ...analog.uploads]
    function include(entries, prefix) {
      const lines = [` .long ${entries.length}`]
      for (const [i, entry] of entries.entries()) {
        assert.deepEqual(unpackGka3(entry.blob.subarray(4)), new Uint8Array(entry.raw))
        fs.writeFileSync(path.join(temporary, `${prefix}${i}.bin`), entry.blob)
        lines.push(` .long ${prefix}${i},${entry.blob.length},${rollingHash(entry.blob.subarray(4))},${entry.stage + 0x08000000},${entry.destination + 0x08000000},${entry.raw.length},${rollingHash(entry.raw)},0`)
      }
      for (const [i] of entries.entries()) lines.push(' .align 4', `${prefix}${i}:`, ` .incbin "${prefix}${i}.bin"`)
      return lines.join('\n') + '\n'
    }
    fs.writeFileSync(path.join(temporary, 'table.inc'), include(payloads.slice(0, 1), 'blob'))
    fs.writeFileSync(path.join(temporary, 'pretable.inc'), include(payloads.slice(1), 'preblob'))
    execFileSync('m68k-elf-as', ['-mcpu=5475', '-I', temporary, '--defsym', 'PREBOOT=1', '-o', 'loader.o', path.join(root, 'sdk/octabam/tools/remix/loader.S')], { cwd: temporary, stdio: 'pipe' })
    execFileSync('m68k-elf-ld', [`-Ttext=0x${BOOTSTRAP_ADDRESS.toString(16)}`, '-o', 'loader.elf', 'loader.o'], { cwd: temporary, stdio: 'pipe' })
    execFileSync('m68k-elf-objcopy', ['-O', 'binary', 'loader.elf', 'append.bin'], { cwd: temporary, stdio: 'pipe' })
    const nativeAppend = fs.readFileSync(path.join(temporary, 'append.bin'))
    const differences = [...nativeAppend.keys()].filter(index => nativeAppend[index] !== bootstrap.append[index])
    assert.equal(sha(nativeAppend), sha(bootstrap.append), label + ': native bootstrap differs at ' + differences.slice(0, 20).join(',') + ` (lengths ${nativeAppend.length}/${bootstrap.append.length})`)
    // Complete firmware round trips for each individual companion with stock
    // preserved; all other profiles still compare both native DSP uploads.
    if (proof.keepStockFx2 && proof.moduleIds.length === 2 && proof.moduleIds.some(id => ANALOG_BD_DSP_COMPANIONS.includes(id))) {
      assert.equal((await compareSelection(original, proof, profile)).failure, undefined, label + ': common native verifier')
      const patched = await applyGuardedOsWrites(original, [...plan.menus.writes, ...plan.dsp.writes, ...plan.platform, ...plan.logging.writes])
      const fullAnalog = await composeAnalogBd(original, patched, proof.moduleIds, profile, plan.dsp.layouts)
      const image = new Uint8Array(patched.length + bootstrap.append.length)
      image.set(fullAnalog.bytes); image.set(bootstrap.append, patched.length)
      const upgrade = encodeFirmware(decoded, image, FIRMWARE_VERSION)
      assert.equal(sha(decodeFirmware(upgrade).mainOs), sha(image), label + ': complete upgrade round trip')
      packed++
    }
    assert.equal(sha(original), before, 'Original firmware was modified')
    matched++
    if (matched % 25 === 0) console.log(`${matched} native OS and bootloader comparisons passed.`)
  }
  const changed = original.slice(); changed[100] ^= 1
  await assert.rejects(planStaticOs(changed, ['analog-bassdrum', 'tapeecho']), /original|unmodified/)
  console.log(`${matched} native OS comparisons and GNU bootloader comparisons; ${refused} matching refusals; ${packed} complete firmware round trips. Original unchanged; temporary firmware removed; no hardware qualification claimed.`)
} finally { fs.rmSync(temporary, { recursive: true, force: true }) }
