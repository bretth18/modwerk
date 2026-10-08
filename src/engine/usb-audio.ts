// Reviewed source-only USB layouts, used by the shared composer.
import facts from './assets/usb-audio-packages.json' with { type: 'json' }
import { USB_AUDIO_MODULE, USB_AUDIO_REVISION, USB_AUDIO_VERSION, parseUsbAudioConfiguration, usbAudioLayout, type UsbAudioConfiguration } from '../config/usb-audio.ts'
import { parseColdFireObject } from './coldfire-elf.ts'
import { bytesHash, word32, requestedFacts } from './requested-modules.ts'
import { recoverStockDsp } from './stock-dsp.ts'
import { readDspWords } from './dsp-memory.ts'
import { OS_LOAD_ADDRESS, type OsWrite } from './os-patches.ts'
import type { CfRuntimeLink } from './coldfire-link.ts'

export function usbAudioPackages(value: UsbAudioConfiguration) {
  const configuration = parseUsbAudioConfiguration(value), layout = usbAudioLayout(configuration.layout)
  const packaged = facts.layouts.find(row => row.id === layout.id)
  if (facts.schema !== 1 || facts.version !== USB_AUDIO_VERSION || facts.upstreamRevision !== USB_AUDIO_REVISION || !packaged || packaged.define !== layout.define || packaged.channels !== layout.channels || packaged.key !== layout.key) throw new Error('USB Audio packages do not match the selected layout and source revision.')
  return [...packaged.objects.slice(0, 1), ...facts.common, ...packaged.objects.slice(1)]
}

export async function readUsbAudioObjects(value: UsbAudioConfiguration, original: Uint8Array) {
  const units = []
  for (const pkg of usbAudioPackages(value)) {
    if (pkg.bytes < 52 || pkg.bytes > 1024 * 1024 || pkg.code.length !== pkg.bytes * 2 || !/^[0-9a-f]+$/.test(pkg.code)) throw new Error('Invalid USB Audio object package.')
    const bytes = Uint8Array.from({ length: pkg.bytes }, (_, index) => parseInt(pkg.code.slice(index * 2, index * 2 + 2), 16))
    if (await bytesHash(bytes) !== pkg.sha256) throw new Error('USB Audio package checksum differs.')
    const object = parseColdFireObject(bytes)
    for (const copy of pkg.stockCopies) {
      const section = object.sections[copy.section], at = copy.source - OS_LOAD_ADDRESS
      if (!section || copy.bytes !== 23 || copy.offset < 0 || copy.offset + copy.bytes > section.data.length || at < 0 || at + copy.bytes > original.length || section.data.subarray(copy.offset, copy.offset + copy.bytes).some(byte => byte)) throw new Error('USB Audio needs the verified local stock descriptors.')
      const inherited = original.slice(at, at + copy.bytes)
      if (await bytesHash(inherited) !== copy.sha256) throw new Error('USB Audio stock descriptor fingerprint differs.')
      section.data.set(inherited, copy.offset)
    }
    if (pkg.curve) {
      const { section: index, offset, words, address } = pkg.curve, section = object.sections[index]
      if (value.layout !== 'tracks-post' || words !== 256 || address !== 0x6c00 || !section || offset < 0 || offset + words * 4 > section.data.length || section.data.subarray(offset, offset + words * 4).some(byte => byte)) throw new Error('USB Audio post-fader curve placeholder differs.')
      const cores = await recoverStockDsp(original), curve = readDspWords(cores[0].memory, 1, address, words)
      const view = new DataView(section.data.buffer, section.data.byteOffset, section.data.byteLength)
      for (const [i, word] of curve.entries()) {
        const expected = Math.round(Math.sin(2 * Math.PI * i / 1024) * 0x7fffff)
        if (Math.abs(word - expected) > 64 || (i > 0 && word <= curve[i - 1])) throw new Error('USB Audio post-fader curve differs from the stock quarter-sine table.')
        view.setUint32(offset + i * 4, word)
      }
    }
    units.push({ label: pkg.label, object })
  }
  return units
}

/** Replace the original USB-owned hooks; every new site retains its stock guard. */
export async function replaceUsbAudioHooks(original: Uint8Array, writes: OsWrite[], runtime: CfRuntimeLink) {
  const oldSites = new Set(requestedFacts.groups.filter(group => [USB_AUDIO_MODULE, 'usb-midi'].includes(group.moduleId)).flatMap(group => [...group.detours, ...group.refs, ...group.pokes].map(row => row.address)))
  const result = writes.filter(write => !oldSites.has(write.address))
  const target = (unit: string, symbol: string) => {
    const address = runtime.symbols.get(unit + '::' + symbol) ?? runtime.symbols.get(symbol)
    if (address === undefined || address % 2) throw new Error('Unresolved USB Audio hook: ' + symbol)
    return address
  }
  for (const row of facts.hooks.detours) {
    const address = target(row.unit, row.symbol), text = runtime.sections[0]
    if (address < text.address || address >= text.address + text.size) throw new Error('USB Audio hook is outside runtime code.')
    const bytes = new Uint8Array(row.writeLength)
    bytes.set([0x4e, 0xf9]); bytes.set(word32(address), 2)
    for (let at = 6; at < bytes.length; at += 2) bytes.set([0x4e, 0x71], at)
    result.push({ address: row.address, guardLength: row.guardLength, guardSha256: row.guardSha256, bytes, note: row.note })
  }
  for (const row of facts.hooks.refs) result.push({ address: row.address, guardLength: row.guardLength, guardSha256: row.guardSha256, bytes: word32(target(row.unit, row.symbol)), note: row.note })
  for (const row of facts.hooks.pokes) result.push({ address: row.address, guardLength: row.guardLength, guardSha256: row.guardSha256, bytes: Uint8Array.from(row.code.match(/../g)!, byte => parseInt(byte, 16)), note: row.note })
  // Checking here also makes the planning-only qualification path fail closed.
  for (const row of result.filter(write => facts.hooks.detours.some(hook => hook.address === write.address) || facts.hooks.refs.some(hook => hook.address === write.address) || facts.hooks.pokes.some(hook => hook.address === write.address))) {
    const at = row.address - OS_LOAD_ADDRESS
    if (at < 0 || at + row.guardLength > original.length || await bytesHash(original.subarray(at, at + row.guardLength)) !== row.guardSha256) throw new Error('USB Audio hook guard differs from stock.')
  }
  return result
}
