// Explicit private firmware checks; proprietary inputs never enter CI or Git.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { decodeFirmware, encodeFirmware } from '../src/engine/elek.ts'
import { composeOs, composeSelection } from '../src/engine/compose-os.ts'
import { planStaticOs } from '../src/engine/static-compose.ts'
import { createStaticColdFireRuntime } from '../src/engine/coldfire-runtime.ts'
import { readBetaStartup, installStartup, createBetaStartupRom } from '../src/engine/beta-startup.ts'
import { parseColdFireObject } from '../src/engine/coldfire-elf.ts'
import { BETA_STARTUP_ROM_ADDRESS, BETA_STARTUP_ACTIVE_ADDRESS, MIDI_SCENES_STARTUP_ROM_ADDRESS } from '../src/engine/beta-startup.ts'
import { MIDI_SCENES_LOGGER_BASE } from '../src/engine/midi-scenes-logged.ts'
import { linkColdFireRuntime } from '../src/engine/coldfire-link.ts'
import { applyGuardedOsWrites, OS_LOAD_ADDRESS } from '../src/engine/os-patches.ts'
import { createStartupAnimationWrites } from '../src/engine/startup-animation.ts'
import { FIRMWARE_VERSION } from '../src/engine/protocol.ts'
import pkg from '../src/engine/assets/beta-startup.json' with { type: 'json' }

const [input, destination, only] = process.argv.slice(2)
if (only && only !== 'midi-scenes') throw new Error('Only the standalone midi-scenes recheck is supported.')
if (!input || !destination) throw new Error('Usage: node scripts/verify-startup-beta-native.mjs original-firmware.bin NEW-private-output-directory')
const root = fileURLToPath(new URL('../', import.meta.url)), out = resolve(destination)
if (existsSync(out) || out.startsWith(root)) throw new Error('Use a new private directory outside the repository.')
mkdirSync(out)
const hash = b => createHash('sha256').update(b).digest('hex')
const inputBytes = new Uint8Array(readFileSync(input)), inputHash = hash(inputBytes), container = decodeFirmware(inputBytes), main = container.mainOs
assert.equal(hash(main), '164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e')

// Independent GNU linker checks the authored object at both runtime bases.
const unit = await readBetaStartup(), objectPath = join(out, 'startup.o')
writeFileSync(objectPath, Uint8Array.from({ length: pkg.bytes }, (_, i) => parseInt(pkg.code.slice(i * 2, i * 2 + 2), 16)))
for (const base of [0x40a955e0, 0x4600dde0]) {
  const link = linkColdFireRuntime([unit], base, new Map([['modwerk_boot_active', BETA_STARTUP_ACTIVE_ADDRESS]])), elf = join(out, 'startup.elf'), bin = join(out, 'startup.bin')
  execFileSync('m68k-elf-ld', ['-Ttext=0x' + base.toString(16), '--defsym=modwerk_boot_active=' + BETA_STARTUP_ACTIVE_ADDRESS, '-o', elf, objectPath], { stdio: 'pipe' })
  execFileSync('m68k-elf-objcopy', ['-O', 'binary', elf, bin], { stdio: 'pipe' })
  const native = new Uint8Array(link.bytes.length)
  native.set(readFileSync(bin))
  assert.deepEqual(native, link.bytes, 'Complete GNU/browser startup link parity')
}

const cases = only ? [['midi-scenes']] : [[], ['repitch'], ['miniverb'], ['tapeecho', 'euclid'], ['analog-bassdrum'], ['sidechain-compressor'], ['usb-audio-out-tracks-main-cue', 'quantizer'], ['midi-scenes'], ['airwindows-chorus'], ['poly8']]
writeFileSync(join(out, 'stock-MAIN.bin'), main)
const proofs = []
for (const ids of cases) {
  const ordinary = await composeSelection(main, ids, false)
  if (!ids.length) assert.deepEqual((await composeSelection(main, ids, false, undefined, false)).bytes, ordinary.bytes)
  const beta = await composeSelection(main, ids, false, undefined, true)
  assert.equal(beta.runtime.reservedBytes, ordinary.runtime.reservedBytes, 'No added sample-memory reservation')
  for (const graphic of createStartupAnimationWrites()) {
    const at = graphic.address - OS_LOAD_ADDRESS
    assert.deepEqual(beta.bytes.subarray(at, at + graphic.guardLength), main.subarray(at, at + graphic.guardLength))
  }
  for (const guard of Object.values(pkg.guards)) assert.equal(new DataView(beta.bytes.buffer).getUint16(guard.address - OS_LOAD_ADDRESS), 0x4ef9)
  if (!ids.includes('midi-scenes')) {
    const plan = await planStaticOs(main, ids, undefined, undefined, true)
    const prefix = await createBetaStartupRom(plan.runtime, main)
    const romPath = join(out, 'startup-rom.o'), romElf = join(out, 'startup-rom.elf'), romBin = join(out, 'startup-rom.bin')
    writeFileSync(romPath, Buffer.from(pkg.romGate.code, 'hex'))
    const object = parseColdFireObject(new Uint8Array(readFileSync(romPath)))
    execFileSync('m68k-elf-ld', ['-Ttext=0x' + BETA_STARTUP_ROM_ADDRESS.toString(16),
      '--defsym=modwerk_boot_frame_hook=' + plan.runtime.symbols.get('modwerk_boot_frame_hook'),
      '-o', romElf, romPath], { stdio: 'pipe' })
    execFileSync('m68k-elf-objcopy', ['-O', 'binary', romElf, romBin], { stdio: 'pipe' })
    const nativeRom = new Uint8Array(readFileSync(romBin))
    const replay = object.symbols.find(symbol => symbol.name === 'modwerk_boot_rom_replay')
    nativeRom.set(main.subarray(pkg.guards.draw.address - OS_LOAD_ADDRESS, pkg.guards.draw.address - OS_LOAD_ADDRESS + 6), replay.value)
    assert.deepEqual(nativeRom, prefix.bytes, 'GNU/browser ROM gate parity')
    assert.deepEqual(beta.bytes.subarray(BETA_STARTUP_ROM_ADDRESS - OS_LOAD_ADDRESS, BETA_STARTUP_ROM_ADDRESS - OS_LOAD_ADDRESS + prefix.bytes.length), prefix.bytes)
    for (const startup of plan.startup) for (const other of [...plan.menus.writes, ...plan.dsp.writes, ...plan.platform, ...plan.logging.writes])
      assert(startup.address + startup.guardLength <= other.address || other.address + other.guardLength <= startup.address, 'Startup overlaps ' + other.note)
  }
  if (ids.includes('midi-scenes')) {
    // This is the author's live CC-cache table, not unused zero padding.
    const cache = 0x400d7500 - OS_LOAD_ADDRESS
    assert.deepEqual(beta.bytes.subarray(cache, cache + 256), ordinary.bytes.subarray(cache, cache + 256))
    const runtime = await createStaticColdFireRuntime([], main, MIDI_SCENES_LOGGER_BASE, undefined, true, MIDI_SCENES_STARTUP_ROM_ADDRESS)
    const rom = await createBetaStartupRom(runtime, main, MIDI_SCENES_STARTUP_ROM_ADDRESS)
    const at = MIDI_SCENES_STARTUP_ROM_ADDRESS - OS_LOAD_ADDRESS
    assert.deepEqual(beta.bytes.subarray(at, at + rom.bytes.length), rom.bytes)
    assert.deepEqual(rom.bytes.subarray(76,80), new Uint8Array(4))
  }
  const packed = encodeFirmware(container, beta.bytes, FIRMWARE_VERSION), decoded = decodeFirmware(packed)
  assert.deepEqual(decoded.mainOs, beta.bytes); assert.deepEqual(decoded.tail, container.tail); assert.equal(decoded.seed, container.seed)
  proofs.push({ modules: ids, mainBytes: beta.bytes.length, mainSha256: hash(beta.bytes), updateSha256: hash(packed), reservedBytes: beta.runtime.reservedBytes, roundTrip: 'passed' })
  if (ids.length === 0) {
    writeFileSync(join(out, 'beta-MAIN.bin'), beta.bytes)
    writeFileSync(join(out, 'stock-MAIN.bin'), main)
  }
  if (ids.includes('midi-scenes')) writeFileSync(join(out, 'midi-scenes-MAIN.bin'), beta.bytes)
  console.log((ids.join('+') || 'core only') + ': beta build, disjoint hooks, unchanged reservation, full packaging passed')
}
const dynamic = await composeOs(main, ['repitch'], undefined, { loader: true, betaAccess: true })
assert(dynamic.bytes.length > main.length)
const runtime = await createStaticColdFireRuntime([], main, undefined, undefined, true)
const writes = await installStartup(runtime, main, true)
const replay = runtime.symbols.get('modwerk_boot_replay_draw') - runtime.sections[0].address
const draw = pkg.guards.draw.address - OS_LOAD_ADDRESS
assert.deepEqual(runtime.bytes.subarray(replay, replay + 6), main.subarray(draw, draw + 6))
for (const guard of Object.values(pkg.guards)) {
  const changed = main.slice(); changed[guard.address - OS_LOAD_ADDRESS] ^= 1
  await assert.rejects(installStartup(runtime, changed, true), /guard/)
}
await assert.rejects(applyGuardedOsWrites(await applyGuardedOsWrites(main, writes), writes), /guard/)
assert.equal(hash(inputBytes), inputHash)
writeFileSync(join(out, 'proofs.json'), JSON.stringify({ kind: 'modwerk-beta-startup-native', packageSha256: pkg.sha256, nativeLinkParity: 'passed at both runtime bases', proofs, dynamicBuild: 'Repitch passed', alteredHooksRejected: true, repeatPatchRejected: true, inputUnchanged: true, hardware: 'untested' }, null, 2) + '\n')
console.log('Private beta startup checks passed. Keep these firmware outputs outside Git.')
