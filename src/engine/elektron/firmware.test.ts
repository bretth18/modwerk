import { describe, expect, it } from 'vitest'
import { packSection } from '../aplib'
import { contentChecksum, encodeSyx } from './sysex'
import { inspectDigiFirmware, MAX_DIGI_FIRMWARE_BYTES } from './firmware'
import { LINK_DEVICES, type LinkDevice } from './elemod'
import { sha256Hex } from './hash'

// This entire container is generated from an arbitrary pattern, with no firmware bytes.
async function fixture() {
  const image = Uint8Array.from({ length: 512 }, (_, i) => i % 31), packed = packSection(image)
  const container = new Uint8Array(64 + packed.length + (-packed.length & 15))
  container.set([0x45, 0x4c, 0x45, 0x33]); container.set([0x54, 0x45, 0x53, 0x54], 0x14)
  const view = new DataView(container.buffer)
  view.setUint32(0x1c, 1); view.setUint32(0x20, 3); view.setUint32(0x24, 64); view.setUint32(0x28, packed.length); view.setUint32(0x2c, 0x40000400)
  container.set(packed, 64)
  const stream = new Uint8Array(8 + container.length), streamView = new DataView(stream.buffer)
  streamView.setUint32(0, container.length); streamView.setUint32(4, contentChecksum(container)); stream.set(container, 8)
  const framing = Uint8Array.from([0xf0, 0, 0x20, 0x3c, 0x0a, 0, 0x7d, 0, 0x10, 1, 2, 3, 0, 0, 0, 0xf7])
  const bytes = encodeSyx(stream, 0x0a, framing, framing)
  const device: LinkDevice = { ...LINK_DEVICES[0], releases: [{ version: 'TEST', syxSha256: await sha256Hex(bytes), mainSha256: await sha256Hex(image), mainLength: image.length }] }
  return { bytes, device }
}

describe('local Digi firmware identity', () => {
  it('returns only verified metadata from the complete file and unpacked image', async () => {
    const { bytes, device } = await fixture()
    expect(await inspectDigiFirmware('digitakt', bytes, 'synthetic.syx', [device])).toEqual({ machine: 'digitakt', release: 'TEST', name: 'synthetic.syx', bytes: bytes.length, sha256: device.releases[0].syxSha256 })
  })
  it('refuses wrong-machine and modified files before parsing', async () => {
    const { bytes, device } = await fixture(), modified = bytes.slice(); modified[0] ^= 1
    await expect(inspectDigiFirmware('digitone', bytes, 'synthetic.syx', [device, LINK_DEVICES[1]])).rejects.toThrow('supported original')
    await expect(inspectDigiFirmware('digitakt', modified, 'synthetic.syx', [device])).rejects.toThrow('supported original')
  })
  it('requires both main image length and hash to agree with the pinned release', async () => {
    const { bytes, device } = await fixture()
    const wrongLength = { ...device, releases: [{ ...device.releases[0], mainLength: 1 }] }
    const wrongHash = { ...device, releases: [{ ...device.releases[0], mainSha256: '0'.repeat(64) }] }
    await expect(inspectDigiFirmware('digitakt', bytes, 'synthetic.syx', [wrongLength])).rejects.toThrow('integrity')
    await expect(inspectDigiFirmware('digitakt', bytes, 'synthetic.syx', [wrongHash])).rejects.toThrow('integrity')
  })
  it('bounds input size and refuses unrecognised containers even with a matching file hash', async () => {
    const { device } = await fixture(), malformed = new Uint8Array([1, 2, 3])
    await expect(inspectDigiFirmware('digitakt', new Uint8Array(), 'empty.syx', [device])).rejects.toThrow('original .syx')
    await expect(inspectDigiFirmware('digitakt', new Uint8Array(MAX_DIGI_FIRMWARE_BYTES + 1), 'oversize.syx', [device])).rejects.toThrow('original .syx')
    const invalid = { ...device, releases: [{ ...device.releases[0], syxSha256: await sha256Hex(malformed) }] }
    await expect(inspectDigiFirmware('digitakt', malformed, 'malformed.syx', [invalid])).rejects.toThrow()
  })
})
