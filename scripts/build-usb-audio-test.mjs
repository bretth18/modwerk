// Local, explicitly experimental hardware qualification path. Not a release
// gate override. Firmware and derived stock always stay outside the checkout.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { registerHooks } from 'node:module'
// The web app uses bundler resolution. Keep this private CLI on the same
// validators without changing their imports or duplicating backup validation.
registerHooks({ resolve(specifier, context, next) {
  const local = specifier.startsWith('./') || specifier.startsWith('../')
  const resolved = local && !path.extname(specifier) ? specifier + '.ts' : specifier
  const attributes = local && resolved.endsWith('.json') ? { type: 'json' } : context.importAttributes
  return { ...next(resolved, { ...context, importAttributes: attributes }), importAttributes: attributes }
} })
const { inspectBaseFirmware } = await import('../src/engine/base.ts')
const { decodeFirmware, encodeFirmware } = await import('../src/engine/elek.ts')
const { composeStaticOs } = await import('../src/engine/static-compose.ts')
const { defaultChoosers } = await import('../src/engine/choosers.ts')
const { isMenuSpaceFailure } = await import('../src/engine/build-errors.ts')
const { checkSelection } = await import('../src/catalog/compatibility.ts')
const { moduleAvailabilityError } = await import('../src/catalog/availability.ts')
const { moduleBuildError } = await import('../src/catalog/build-support.ts')
const { parseSelection } = await import('../src/config/selection.ts')
const { USB_AUDIO_MODULE, USB_AUDIO_REVISION, usbAudioLayout } = await import('../src/config/usb-audio.ts')


const [firmwareFile, configurationFile, directory] = process.argv.slice(2)
if (!firmwareFile || !configurationFile || !directory || process.argv.length !== 5) throw new Error('Usage: node scripts/build-usb-audio-test.mjs original-1.40C.bin exported-configuration.json NEW-private-output-directory')
const root = fileURLToPath(new URL('../', import.meta.url)), output = path.resolve(directory)
if (output === root.slice(0, -1) || output.startsWith(root)) throw new Error('Test firmware must stay outside the repository.')
const configuration = parseSelection(fs.readFileSync(configurationFile, 'utf8'))
if (!configuration.usbAudio || !configuration.moduleIds.includes(USB_AUDIO_MODULE)) throw new Error('Export an experimental USB Audio setup from the module configurator first.')
const unavailable = moduleAvailabilityError(configuration.moduleIds) || moduleBuildError(configuration.moduleIds)
if (unavailable) throw new Error(unavailable)
const claims = checkSelection(configuration.moduleIds, false)
if (!claims.checked || claims.issues.length) throw new Error(claims.issues.join(' ') || 'The selection is incompatible.')
const stock = fs.readFileSync(firmwareFile)
await inspectBaseFirmware(new Uint8Array(stock).buffer, path.basename(firmwareFile))
const original = decodeFirmware(stock)
let result
try { result = await composeStaticOs(original.mainOs, configuration.moduleIds, defaultChoosers(configuration.moduleIds, true), configuration.usbAudio) }
catch (error) {
  if (!(error instanceof Error) || !isMenuSpaceFailure(error.message)) throw error
  result = await composeStaticOs(original.mainOs, configuration.moduleIds, defaultChoosers(configuration.moduleIds, false), configuration.usbAudio)
}
const version = 'USBTEST02', update = encodeFirmware(original, result.bytes, version)
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
if (sha(decodeFirmware(update).mainOs) !== sha(result.bytes)) throw new Error('The test firmware did not survive its packaging round trip.')
const layout = usbAudioLayout(configuration.usbAudio.layout)
fs.mkdirSync(output, { recursive: false })
const name = `${version}-${layout.id}.bin`
fs.writeFileSync(path.join(output, name), update)
const report = { kind: 'usb-audio-hardware-candidate', status: 'untested', model: 'MKII', version, usbAudio: configuration.usbAudio, sourceRevision: USB_AUDIO_REVISION, baseSha256: sha(stock), imageSha256: sha(update), mainOsSha256: sha(result.bytes), configuration, runtime: result.runtime, checks: ['verified base OS 1.40C', 'guarded composition', 'complete firmware packaging round trip'], limitations: ['Physical Outbox handshake, lifecycle and audio checks remain pending.', 'Worst-case chip cycles, complete memory bounds and hardware canaries remain unmeasured.', 'Local test build only; does not qualify this version for publication.'] }
fs.writeFileSync(path.join(output, 'test-build.json'), JSON.stringify(report, null, 2) + '\n')
const routes = configuration.usbAudio.outboxPairs.map((pair, i) => `Outbox ${i * 2 + 1}/${i * 2 + 2}: ${pair ? `${layout.pairs[pair - 1]} / USB ${pair * 2 - 1}/${pair * 2}` : 'Off'}`)
fs.writeFileSync(path.join(output, 'routing.txt'), [layout.name, '44.1 kHz / 24-bit', ...routes, 'Apply in https://app.elektron.se/outbox8', 'Read sdk/octabam/modules/usb-audio-out-tracks-main-cue/TESTING.md before testing.'].join('\n') + '\n')
console.log(JSON.stringify({ file: path.join(output, name), imageSha256: report.imageSha256, layout: layout.name, hardwareStatus: report.status }, null, 2))
