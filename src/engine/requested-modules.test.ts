import { describe, expect, it } from 'vitest'
import { requestedFacts, readRequestedObject, bytesHash, requestedTables, requestedCaves } from './requested-modules'
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


describe('live playback and mute integration', () => {
  it('inserts MUTE MODE before existing rows and retains the final MKII LED BRIGHTNESS row', async () => {
    const tables = requestedFacts.groups.find(group => group.moduleId === 'mute-modes')!.tables
    const original = new Uint8Array(0x100000), view = new DataView(original.buffer), symbols = new Map<string, number>()
    const captured: Uint8Array[] = []
    for (const table of tables) {
      for (let i = 0; i < table.count; i++) view.setUint32(table.old - 0x40000400 + i * 4, 0x40010000 + i * 4)
      for (const ref of table.refs) view.setUint32(ref.address - 0x40000400, ref.old)
      for (const row of table.symbols) symbols.set(row.symbol, 0x40020000)
    }
    await requestedTables(original, ['mute-modes'], 0x400d7800, async (_address, bytes) => { captured.push(bytes) }, symbols)
    for (const bytes of captured) {
      const result = new DataView(bytes.buffer)
      expect(result.getUint32(0)).toBe(0x40010000)
      expect(result.getUint32(4)).toBe(0x40010004)
      expect(result.getUint32(8)).toBe(0x40020000)
      expect(result.getUint32(bytes.length - 4)).toBe(0x4001003c)
    }
  })
  it('selects the ratified sidechain mute variant only when sidechain is carried', async () => {
    const pkg = requestedFacts.objects.find(row => row.label === 'mm_softmute')!
    const plain = await readRequestedObject(pkg.label), sidechain = await readRequestedObject(pkg.label, undefined, ['mute-modes', 'sidechain-compressor'])
    expect(plain.object.sections.find(row => row.name === '.text')!.data.length).toBe(968)
    expect(sidechain.object.sections.find(row => row.name === '.text')!.data.length).toBe(1086)
  })
  it('relocates all eleven recorder sentinels to the reserved sample arena, leaving stock literals behind', async () => {
    const poolBase = 0x40a955e0 + 16 * 6144, captured: Uint8Array[] = []
    await requestedCaves(['recorder-loop-fix'], 0x400d6b80, 0x400d24d0, 0x400d7c00, async (_address, bytes) => { captured.push(bytes) }, poolBase)
    let count = 0
    for (const bytes of captured) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      for (let i = 0; i + 4 <= bytes.length; i += 2) { const literal = view.getUint32(i); expect(literal).not.toBe(0x40a955e0); if (literal === poolBase) count++ }
    }
    expect(count).toBe(11)
  })
})
