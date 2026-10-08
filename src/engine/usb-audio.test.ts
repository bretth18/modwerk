import { it, expect } from 'vitest'
import facts from './assets/usb-audio-packages.json'
import { USB_AUDIO_LAYOUTS, USB_AUDIO_MODULE, usbAudioPreset } from '../config/usb-audio'
import { usbAudioPackages, readUsbAudioObjects } from './usb-audio'
import { parseColdFireObject } from './coldfire-elf'
import { bytesHash } from './requested-modules'
import { composeSelection } from './compose-os'
import { createEngineSession } from './session'
import type { EngineResponse } from './protocol'

it('keeps assembly and descriptors paired, includes new MIDI RX, and contains no inherited stock spans', async () => {
  for (const layout of USB_AUDIO_LAYOUTS) {
    const config = { ...usbAudioPreset('computer'), layout: layout.id, outboxPairs: [0, 0, 0, 0] }
    const packages = usbAudioPackages(config)
    expect(packages.map(pkg => pkg.label)).toEqual(['usbaudio', 'usbmidi', 'usbmidi_rx', 'usbmidi_clamp', 'usbmidi_cfg'])
    for (const pkg of packages) {
      const bytes = Uint8Array.from(pkg.code.match(/../g)!, hex => parseInt(hex, 16))
      expect(await bytesHash(bytes)).toBe(pkg.sha256)
      const object = parseColdFireObject(bytes)
      for (const copy of pkg.stockCopies) expect(object.sections[copy.section].data.slice(copy.offset, copy.offset + copy.bytes).every(byte => byte === 0)).toBe(true)
      if (pkg.curve) expect(object.sections[pkg.curve.section].data.slice(pkg.curve.offset, pkg.curve.offset + 1024).every(byte => byte === 0)).toBe(true)
      if (pkg.label === 'usbmidi_cfg') {
        const symbol = object.symbols.find(symbol => symbol.name === 'cfg_hs')!
        const data = object.sections[symbol.section].data.slice(symbol.value)
        // UAC2 FORMAT_TYPE_I descriptor: 24-bit samples in four-byte subslots.
        // Skip the deliberately masked 23-byte MSC interface after the header.
        let offset = 32, channels = 0
        while (offset + data[offset] <= data.length && data[offset]) {
          const length = data[offset]
          if (length === 16 && data[offset + 1] === 0x24 && data[offset + 2] === 1) channels = data[offset + 10]
          offset += length
        }
        expect(channels).toBe(layout.channels)
      }
    }
  }
  expect(facts.hooks.detours.filter(row => row.address === 0x4001e606)).toHaveLength(1)
  expect(facts.hooks.detours.find(row => row.address === 0x4001d9ca)?.unit).toBe('usbmidi_rx')
})

it('requires local stock and refuses malformed settings at public worker entry points', async () => {
  const settings = usbAudioPreset('outbox')
  await expect(readUsbAudioObjects(settings, new Uint8Array(256))).rejects.toThrow(/original|verified local/)
  await expect(composeSelection(new Uint8Array(), [USB_AUDIO_MODULE], false, { ...settings, version: 'future' } as unknown as typeof settings)).rejects.toThrow('unsupported version')
  const responses: EngineResponse[] = [], handle = createEngineSession(response => responses.push(response))
  await handle({ id: 1, type: 'build', moduleIds: [USB_AUDIO_MODULE], keepStockFx2: false, usbAudio: { ...settings, version: 'future' } as unknown as typeof settings })
  expect(responses[0]).toMatchObject({ type: 'error', message: expect.stringContaining('unsupported version') })
})
