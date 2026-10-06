import { describe, expect, it } from 'vitest'
import { linkColdFireRuntime, runtimeCatalogObject } from './coldfire-link'
import { readColdFirePackage, PLATFORM_UNITS } from './coldfire-package'
import { serializeRuntimeCatalog } from './runtime-catalog'
import suffix from './test-fixtures/coldfire-suffix.json'
import { parseColdFireObject } from './coldfire-elf'
import fixtures from './assets/coldfire-runtime-oracles.json'
async function hash(bytes: Uint8Array) { const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer); return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') }
async function inputs() { return Promise.all(PLATFORM_UNITS.map(readColdFirePackage)) }
describe('native ColdFire runtime link parity', () => {
  for (const fixture of fixtures.cases) it(`matches GNU linker bytes and global symbols: ${fixture.name}`, async () => {
    const native = await inputs(), catalog = serializeRuntimeCatalog(fixture.catalogPackages.map(pkg => ({ ...pkg, words: new Uint32Array(pkg.words) })), fixture.catalogOptions)
    const units = []
    for (const label of fixture.labels) units.push(label === 'dlcatalog' ? { label, object: runtimeCatalogObject(catalog, native[0].object.flags) } : await readColdFirePackage(label))
    const linked = linkColdFireRuntime(units, fixture.base)
    expect(linked.bytes.length).toBe(fixture.expected.bytes)
    expect(await hash(linked.bytes)).toBe(fixture.expected.sha256)
    expect(Object.fromEntries(linked.symbols)).toEqual(fixture.expected.exports)
    expect(linked.sections.filter(section => section.size)).toEqual(fixture.expected.sections)
  })
  it('matches GNU shared nonempty and empty string suffix ownership', async () => {
    const object = parseColdFireObject(Uint8Array.from(suffix.objectHex.match(/../g)!, byte => parseInt(byte, 16)))
    const linked = linkColdFireRuntime([{ label: 'suffix', object }], suffix.base)
    expect(linked.bytes.length).toBe(suffix.bytes)
    expect(await hash(linked.bytes)).toBe(suffix.sha256)
    for (const [name, address] of Object.entries(suffix.symbols)) expect(linked.symbols.get(name)).toBe(address)
  })
  it('rejects incompatible, duplicate, unbounded and unsupported runtime inputs', async () => {
    const units = await inputs()
    expect(() => linkColdFireRuntime([], 0x1000)).toThrow('input count')
    expect(() => linkColdFireRuntime(units, 1)).toThrow('invalid base')
    expect(() => linkColdFireRuntime(units, 0xfffffffc)).toThrow('bounded address')
    expect(() => linkColdFireRuntime([units[0],units[0]], 0x1000)).toThrow('duplicate')
    expect(() => linkColdFireRuntime([{ ...units[0], object: { ...units[0].object, flags: 1 } }, units[1]], 0x1000)).toThrow('CPU object flags')
    const bad = await readColdFirePackage('dltransfer'); bad.object.sections.find(section => section.name === '.bss')!.size = 4
    expect(() => linkColdFireRuntime([bad], 0x1000)).toThrow('zero-fill initialization')
    bad.object.sections.find(section => section.name === '.bss')!.size = 0; bad.object.sections.find(section => section.name === '.text')!.name = '.text.unproven'
    expect(() => linkColdFireRuntime([bad], 0x1000)).toThrow('unsupported allocated section')
    await expect(readColdFirePackage('repitch')).rejects.toThrow('different native placement')
  })
})
