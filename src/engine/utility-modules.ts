// Authored ROM packages only; stock-site guards remain hashes.
import facts from './assets/utility-packages.json' with { type: 'json' }
import { parseColdFireObject } from './coldfire-elf.ts'
import { linkRomText } from './rom-package.ts'
import { bytesHash, word32 } from './requested-modules.ts'
import type { OsWrite } from './os-patches.ts'
import { CATALOG_SOURCE, MODULES } from '../catalog/modules.ts'

export const UTILITY_MODULE_IDS = ['previewvol', 'cc-map'] as const
type CaveWriter = (address: number, bytes: Uint8Array, note: string) => Promise<void>

export async function readUtilityObject(id: string) {
  if (facts.schema !== 1 || facts.stockRead !== false || facts.revision !== CATALOG_SOURCE.revision) throw new Error('Utility packages must contain pinned authored source only.')
  const pkg = facts.packages.find(item => item.id === id)
  const module = MODULES.find(item => item.id === id)
  if (!pkg || !UTILITY_MODULE_IDS.includes(id as typeof UTILITY_MODULE_IDS[number]) || pkg.bytes < 52 || pkg.bytes > 65536 || pkg.code.length !== pkg.bytes * 2 || !/^[a-f0-9]+$/.test(pkg.code)) throw new Error('Invalid utility module package.')
  if (!module || module.version !== pkg.version || module.key !== pkg.key || module.author !== pkg.author) throw new Error('Utility package version or attribution differs from the catalog.')
  const bytes = Uint8Array.from({ length: pkg.bytes }, (_, i) => parseInt(pkg.code.slice(i * 2, i * 2 + 2), 16))
  if (await bytesHash(bytes) !== pkg.sha256) throw new Error('Utility object checksum does not match.')
  return { pkg, object: parseColdFireObject(bytes) }
}

export async function composeUtilityRom(ids: readonly string[], cursor: number, overflow: number, caveLimit: number, cave: CaveWriter, phase: 'linked' | 'caves') {
  const writes: OsWrite[] = [], symbols = new Map<string, number>()
  for (const id of UTILITY_MODULE_IDS) {
    if (!ids.includes(id) || (id === 'previewvol' ? 'linked' : 'caves') !== phase) continue
    const { pkg, object } = await readUtilityObject(id)
    const external = new Map(Object.entries(pkg.external).map(([name, value]) => [name, value as number]))
    let address = Math.ceil(cursor / 128) * 128
    let linked = linkRomText(object, address, external)
    const inside = address + linked.bytes.length <= caveLimit
    if (!inside) {
      // Native linked units refuse overflow; floating CC Map caves use its
      // separate four-byte-aligned overflow region.
      if (id === 'previewvol') throw new Error('Preview Vol ROM unit is past the stock zero run.')
      address = Math.ceil(overflow / 4) * 4
      linked = linkRomText(object, address, external)
    }
    await cave(address, linked.bytes, pkg.key + ' ROM unit')
    for (const [name, value] of linked.symbols) symbols.set(name, value)
    if (inside) cursor = address + linked.bytes.length
    else overflow = Math.ceil((address + linked.bytes.length) / 4) * 4
    if (id === 'cc-map') {
      const guard = pkg.guards[0]
      writes.push({ address: guard.address, guardLength: guard.bytes, guardSha256: guard.sha256, bytes: word32(address), note: 'CC Map MIDI dispatch' })
    } else {
      for (const [index, name] of ['vol_static', 'vol_flex'].entries()) {
        const target = linked.symbols.get(name), guard = pkg.guards[index]
        if (target === undefined || guard.bytes !== 6) throw new Error('Preview Vol hook is missing its linked symbol.')
        const bytes = new Uint8Array(6); bytes.set([0x4e, 0xf9]); bytes.set(word32(target), 2)
        writes.push({ address: guard.address, guardLength: 6, guardSha256: guard.sha256, bytes, note: 'Preview Vol ' + name })
      }
    }
  }
  return { cursor, overflow, symbols, writes }
}
