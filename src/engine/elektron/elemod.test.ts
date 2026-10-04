import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { ModError, applyWholeBuilds, linkMods, parseElemod, type LinkDevice } from './elemod'

// A synthetic machine whose "stock" image is 4 KiB of NOPs: no Elektron firmware involved.
const image = Uint8Array.from({ length: 4096 }, (_, i) => (i % 2 ? 0x71 : 0x4e))
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const device: LinkDevice = {
  key: 'test-machine', machine: 'digitakt', name: 'Test machine', mainLoad: 0x40000000,
  releases: [{ version: '1.0', syxSha256: 'a'.repeat(64), mainSha256: sha(image), mainLength: image.length }],
  areas: { ddr: [0x41000000, 0x41001000] }, ddr: [0x41000000, 0x41001000], sramCode: [0, 0], fastTable: '', protected: [],
}
const target = { device: 'test-machine', os: '1.0', syx_sha256: 'a'.repeat(64) }
const nops = (n: number) => '4e71'.repeat(n / 2)
const core = { elemod: 2, id: 'core', version: '1.0', target, sections: { '.boot': { parts: [['hex', nops(8)]] }, '.run': { parts: [['hex', '00000000']] } }, symbols: { core_zero: ['.run', 0] }, exports: ['core_zero'], collections: { ev_tick: { entry: 4 } } }
const mod = (id: string, addr: number, extra: Record<string, unknown> = {}) => ({
  elemod: 2, id, version: '1.0', target, requires: ['core'],
  sections: { '.run': { parts: [['hex', '4e75']] }, '.bss': { size: 16 } }, symbols: { handler: ['.run', 0] },
  sites: [{ addr: '0x' + addr.toString(16), len: 6, new: '4eb900000000', kind: 'code', stock_sha256: sha(image.subarray(addr - 0x40000000, addr - 0x40000000 + 6)), relocs: [[2, 'abs32', 'sym:handler', 0]] }],
  contribute: [{ to: 'ev_tick', order: 50, data: '00000000', relocs: [[0, 'abs32', 'sym:handler', 0]] }],
  ...extra,
})
const parse = (doc: Record<string, unknown>) => parseElemod(doc, String(doc.id), [device])

describe('elemod linker', () => {
  it('links a core and mods into one image with relocated sites and tables', async () => {
    const linked = await linkMods([parse(core), parse(mod('one', 0x40000100)), parse(mod('two', 0x40000200))], image)
    expect(linked.order).toEqual(['core 1.0', 'one 1.0', 'two 1.0'])
    const view = new DataView(linked.image.buffer)
    const handler = view.getUint32(0x100 + 2)
    expect(handler).toBeGreaterThanOrEqual(0x41000000)
    expect(view.getUint16(0x100)).toBe(0x4eb9)
    expect(linked.tables.ev_tick[1]).toBe(2)
    expect(linked.image.length).toBeGreaterThan(image.length)
    expect(linked.layout.ddrSpare).toBeGreaterThan(0)
  })

  it('refuses overlapping sites, missing cores, wrong stock bytes and budgets', async () => {
    await expect(linkMods([parse(core), parse(mod('one', 0x40000100)), parse(mod('two', 0x40000102))], image)).rejects.toThrow('overlap')
    await expect(linkMods([parse(mod('one', 0x40000100))], image)).rejects.toThrow('exactly one mod must carry .boot')
    const changed = image.slice(); changed[0x101] = 0
    await expect(linkMods([parse(core), parse(mod('one', 0x40000100))], changed)).rejects.toThrow('stock main OS')
    await expect(linkMods([parse(core), parse(mod('big', 0x40000100, { sections: { '.run': { parts: [['hex', '4e75']] }, '.bss': { size: 8192 } } }))], image)).rejects.toThrow('need RAM')
  })

  it('applies a single whole build and refuses two', async () => {
    const whole = (id: string) => ({ elemod: 1, id, version: '1.0', target, sites: [], blob: { load: '0x40001000', len: 2, sha256: sha(Uint8Array.from([0x4e, 0x75])), parts: [['hex', '4e75']] } })
    expect((await applyWholeBuilds([parse(whole('os'))], image)).length).toBe(image.length + 2)
    await expect(applyWholeBuilds([parse(whole('a')), parse(whole('b'))], image)).rejects.toThrow('more than one whole build')
    expect(() => parse({ ...whole('x'), surprise: 1 })).toThrow(ModError)
  })
})
