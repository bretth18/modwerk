import { describe, expect, it } from 'vitest'
import { requestedFacts, readRequestedObject, bytesHash } from './requested-modules'
import { parseColdFireObject } from './coldfire-elf'
import { linkColdFireRuntime } from './coldfire-link'
import proofs from './assets/requested-link-proofs.json'
describe('reviewed requested runtime packages', () => {
  // Historical 8.2 link fixtures remain archived evidence; MIDISC2.0 uses no relocatable units.
  for (const proof of proofs.proofs.filter(proof=>!proof.ids.includes('midi-scenes'))) it('matches stock-free GNU link: ' + proof.ids.join(', '), async () => {
    const units = proof.labels.map(label => {
      const pkg = requestedFacts.objects.find(p => p.label === label)!
      return { label, object: parseColdFireObject(Uint8Array.from(pkg.code.match(/../g)!, b => parseInt(b, 16))) }
    })
    const linked = linkColdFireRuntime(units, 0x40a955e0)
    expect(linked.bytes.length).toBe(proof.bytes)
    expect(await bytesHash(linked.bytes)).toBe(proof.sha256)
    // GNU adds these three synthetic boundaries; compare every authored export.
    expect(Object.fromEntries(linked.symbols)).toEqual(Object.fromEntries(Object.entries(proof.exports).filter(([name]) => !['__bss_start', '_edata', '_end'].includes(name))))
  })
  it('requires local fingerprinted USB spans and bundles only zero placeholders', async () => {
    const pkg = requestedFacts.objects.find(p => p.label === 'usbmidi_cfg')!
    const object = parseColdFireObject(Uint8Array.from(pkg.code.match(/../g)!, b => parseInt(b, 16)))
    expect(pkg.stockCopies).toHaveLength(4)
    for (const copy of pkg.stockCopies) expect(object.sections[copy.section].data.slice(copy.offset, copy.offset + copy.bytes)).toEqual(new Uint8Array(23))
    await expect(readRequestedObject('usbmidi_cfg')).rejects.toThrow('verified local firmware')
    await expect(readRequestedObject('usbmidi_cfg', new Uint8Array(0x100000))).rejects.toThrow('fingerprint differs')
    await expect(readRequestedObject('unreviewed-unit')).rejects.toThrow('Invalid requested')
  })
})
