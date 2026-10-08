// Private qualification check; never run in CI and never commit its artifacts.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { inspectBaseFirmware } from '../src/engine/base.ts'
import { decodeFirmware, encodeFirmware } from '../src/engine/elek.ts'
import { createStaticColdFireRuntime } from '../src/engine/coldfire-runtime.ts'
import { composeSelection } from '../src/engine/compose-os.ts'
import { composeStaticOs, planStaticOs } from '../src/engine/static-compose.ts'
import { readUsbAudioObjects, usbAudioPackages } from '../src/engine/usb-audio.ts'
import { readRequestedObject, requestedFacts } from '../src/engine/requested-modules.ts'
import { readColdFirePackage } from '../src/engine/coldfire-package.ts'
import { readCoreLogger, loggerExternals } from '../src/engine/core-logger.ts'
import { USB_AUDIO_LAYOUTS, USB_AUDIO_MODULE, USB_AUDIO_REVISION, usbAudioPreset } from '../src/config/usb-audio.ts'
import core from '../src/engine/assets/core-logger.json' with { type: 'json' }
import coldfire from '../src/engine/assets/coldfire-packages.json' with { type: 'json' }

const { registerHooks } = await import('node:module')
registerHooks({ resolve(specifier, context, next) {
  const local = specifier.startsWith('./') || specifier.startsWith('../')
  const resolved = local && !path.extname(specifier) ? specifier + '.ts' : specifier
  const attributes = local && resolved.endsWith('.json') ? { type: 'json' } : context.importAttributes
  return { ...next(resolved, { ...context, importAttributes: attributes }), importAttributes: attributes }
} })
const { createEngineSession } = await import('../src/engine/session.ts')

const [file, directory] = process.argv.slice(2)
if (!file || !directory || process.argv.length !== 4) throw new Error('Usage: node scripts/verify-usb-audio-native.mjs original-1.40C.bin NEW-private-output-directory')
const root = fileURLToPath(new URL('../', import.meta.url)), output = path.resolve(directory)
if (output === root.slice(0, -1) || output.startsWith(root)) throw new Error('Private native output must stay outside the repository.')
const stock = fs.readFileSync(file)
await inspectBaseFirmware(new Uint8Array(stock).buffer, path.basename(file))
const original = decodeFirmware(stock), sha = bytes => createHash('sha256').update(bytes).digest('hex'), before = sha(original.mainOs)
fs.mkdirSync(output, { recursive: false })
const proofs = [], replies = []
const handle = createEngineSession(reply => replies.push(reply))
await handle({ id: 0, type: 'inspect', name: path.basename(file), buffer: new Uint8Array(stock).buffer })
assert.equal(replies.at(-1)?.type, 'inspection', 'public worker inspects the original firmware')
for (const layout of USB_AUDIO_LAYOUTS) for (const companions of [[], ['quantizer'], ['tapeecho', 'euclid']]) {
  const configuration = { ...usbAudioPreset('outbox'), layout: layout.id, outboxPairs: [0, 0, 0, 0] }, ids = [...companions, USB_AUDIO_MODULE]
  const name = [layout.id, ...companions].join('-'), work = path.join(output, name)
  fs.mkdirSync(work)
  const runtime = await createStaticColdFireRuntime(ids, original.mainOs, undefined, configuration), rows = []
  for (const id of companions) {
    if (['tapeecho', 'euclid'].includes(id)) rows.push({ pkg: coldfire.packages.find(p => p.label === id), unit: await readColdFirePackage(id) })
    for (const pkg of requestedFacts.objects.filter(p => p.moduleId === id && p.dram)) rows.push({ pkg, unit: await readRequestedObject(pkg.label, original.mainOs) })
  }
  const packages = usbAudioPackages(configuration), units = await readUsbAudioObjects(configuration, original.mainOs)
  rows.push(...units.map((unit, i) => ({ pkg: packages[i], unit })), { pkg: core, unit: await readCoreLogger() })
  rows.sort((a, b) => runtime.units.indexOf(a.unit.label) - runtime.units.indexOf(b.unit.label))
  const objects = rows.map(({ pkg, unit }, index) => {
    const bytes = Buffer.from(pkg.code, 'hex'), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), table = view.getUint32(32), stride = view.getUint16(46)
    for (const section of unit.object.sections) if (section.type !== 8 && section.data.length) bytes.set(section.data, view.getUint32(table + section.index * stride + 16))
    const object = path.join(work, index + '.o'); fs.writeFileSync(object, bytes); return object
  })
  const elf = path.join(work, 'runtime.elf'), bin = path.join(work, 'runtime.bin')
  execFileSync('m68k-elf-ld', ['-Ttext=0x40a955e0', ...Array.from(loggerExternals(runtime.reserveBytes), ([key, value]) => `--defsym=${key}=0x${value.toString(16)}`), '-o', elf, ...objects], { stdio: 'pipe' })
  execFileSync('m68k-elf-objcopy', ['-O', 'binary', elf, bin])
  assert.equal(Buffer.compare(Buffer.from(runtime.bytes), fs.readFileSync(bin)), 0, name + ': complete native runtime bytes')
  const symbols = Object.fromEntries(execFileSync('m68k-elf-nm', [elf], { encoding: 'utf8' }).trim().split('\n').map(line => line.trim().split(/\s+/)).filter(fields => fields.length === 3).map(fields => [fields[2], parseInt(fields[0], 16)]))
  for (const [symbol, value] of runtime.symbols) if (!symbol.includes('::')) assert.equal(symbols[symbol], value, name + ': ' + symbol)
  const planned = await planStaticOs(original.mainOs, ids, undefined, configuration)
  assert.equal(planned.menus.writes.filter(write => write.address === 0x4001e606).length, 1, 'one shared USB ISR detour')
  for (const site of [0x4001e91c, 0x4001e952]) assert(planned.menus.writes.some(write => write.address === site), 'reset/session-end hook')
  const result = await composeStaticOs(original.mainOs, ids, undefined, configuration), update = encodeFirmware(original, result.bytes, 'USBTEST02')
  assert.equal(sha(decodeFirmware(update).mainOs), sha(result.bytes), 'full firmware round trip')
  const published = await composeSelection(original.mainOs, ids, true, configuration)
  assert.equal(sha(published.bytes), sha(result.bytes), 'public builder matches linked composition')
  let workerImageSha256
  if (!companions.length) {
    await handle({ id: proofs.length + 1, type: 'build', moduleIds: ids, keepStockFx2: true, usbAudio: configuration })
    const built = replies.at(-1)
    assert.equal(built?.type, 'built', 'public worker builds ' + name + ': ' + built?.message)
    assert.equal(built.report.moduleVersions[USB_AUDIO_MODULE], '0.2.0-experimental')
    assert.equal(sha(decodeFirmware(new Uint8Array(built.buffer)).mainOs), sha(result.bytes), 'worker firmware matches composition')
    workerImageSha256 = sha(new Uint8Array(built.buffer))
  }
  assert.equal(sha(original.mainOs), before, 'stock image remains immutable')
  proofs.push({ layout: layout.id, moduleIds: ids, runtimeBytes: runtime.bytes.length, sections: runtime.sections, runtimeSha256: sha(runtime.bytes), imageSha256: sha(update), nativeBytes: 'pass', nativeSymbols: 'pass', guardedHooks: 'pass', packaging: 'pass', publicBuilder: 'pass', ...(workerImageSha256 ? { workerBuild: 'pass', workerImageSha256 } : {}) })
  console.log(name + ': native runtime bytes/symbols, USB guards and full firmware round trip pass')
}
const altered = original.mainOs.slice(); altered[0x1e91c - 0x400] ^= 1
await assert.rejects(planStaticOs(altered, [USB_AUDIO_MODULE], undefined, usbAudioPreset('outbox')), /fingerprint|differs|stock/i)
fs.writeFileSync(path.join(output, 'proofs.json'), JSON.stringify({ kind: 'usb-audio-native-link-and-composition', revision: USB_AUDIO_REVISION, baseSha256: sha(stock), proofs, alteredBaseRejected: true, hardware: 'untested', limitations: 'GNU linker parity and guarded browser composition, not full native octabam image parity, chip timing or hardware qualification.' }, null, 2) + '\n')
console.log(proofs.length + ' cases passed. Hardware testing was waived; no hardware result is claimed.')
