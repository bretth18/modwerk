import metadata from './assets/platform-writes.json' with { type: 'json' }
import { CATALOG_SOURCE, MODULES, resolveSelection } from '../catalog/modules.ts'
import { BOOTSTRAP_ADDRESS } from './bootstrap.ts'
import { PLATFORM_RUNTIME_BASE } from './coldfire-runtime.ts'
import { applyGuardedOsWrites, OS_LOAD_ADDRESS, type OsWrite } from './os-patches.ts'

type RuntimeText = { symbols: ReadonlyMap<string, number>; sections: readonly { name: string; address: number; size: number }[] }
const long = (value: number) => { const bytes = new Uint8Array(4); new DataView(bytes.buffer).setUint32(0, value); return bytes }
function call(target: number, kind: string, length: number) {
  if (!Number.isInteger(target) || target < 0 || target > 0xffffffff || !['jmp','jsr'].includes(kind) || !Number.isInteger(length) || length < 6 || length > 64 || length % 2) throw new Error('The ColdFire detour has an invalid target or size.')
  const result = new Uint8Array(length), view = new DataView(result.buffer)
  view.setUint16(0, kind === 'jmp' ? 0x4ef9 : 0x4eb9); view.setUint32(2, target)
  for (let at = 6; at < length; at += 2) view.setUint16(at, 0x4e71)
  return result
}
/** `loader: false` leaves out the dynamic DSP loader's hooks (native static stock). */
export function createPlatformOsWrites(runtime: RuntimeText, ids: readonly string[], { loader = true, reserveBytes = 1707 * 6144, runtimeBase = PLATFORM_RUNTIME_BASE }: { loader?: boolean; reserveBytes?: number; runtimeBase?: number } = {}): OsWrite[] {
  const selected = new Set(resolveSelection(ids).map(module => module.id))
  if (metadata.schema !== 1 || metadata.revision !== CATALOG_SOURCE.revision || metadata.osBase !== OS_LOAD_ADDRESS) throw new Error('The platform write metadata does not match the catalog.')
  const text = runtime.sections.find(section => section.name === '.text')
  if (!text || text.address !== runtimeBase || text.size < 1) throw new Error('The platform writes require the linked runtime text.')
  if (!Number.isInteger(reserveBytes) || reserveBytes % 6144 || reserveBytes < 6144 || reserveBytes / 6144 > 14602 - 2048) throw new Error('Invalid platform arena reservation.')
  const delta = reserveBytes - 1707 * 6144
  const arenaValue = (row: typeof metadata.arena[number]) => {
    if (row.note.startsWith('arena base')) return row.value + delta
    if (row.note === 'arena clear length') return row.value - delta
    if (['page count','free-list fill limit','recorder page cap'].includes(row.note)) return row.value - delta / 6144
    throw new Error('Unknown native arena write.')
  }
  const plan: OsWrite[] = metadata.arena.map(row => ({ address: row.address, guardLength: row.length, guardSha256: row.sha256, bytes: long(arenaValue(row)), note: row.note }))
  plan.push({ address: metadata.boot.address, guardLength: metadata.boot.length, guardSha256: metadata.boot.sha256, bytes: call(BOOTSTRAP_ADDRESS, 'jsr', 6), note: metadata.boot.note })
  for (const group of metadata.groups) {
    if (group.moduleId === 'dsp-dynload-stock') {
      if (group.key !== 'DSP DYNLOAD STOCK' || group.author !== 'repeat98') throw new Error('The platform write attribution is invalid.')
      if (!loader) continue
    } else {
      const module = MODULES.find(module => module.id === group.moduleId)
      if (!module || module.key !== group.key || module.author !== group.author) throw new Error('The module write attribution is invalid.')
      if (!selected.has(module.id)) continue
    }
    for (const row of group.detours) {
      const target = runtime.symbols.get(row.symbol)
      if (target === undefined || target < text.address || target >= text.address + text.size || target % 2) throw new Error('The platform hook has an unresolved runtime symbol: ' + row.symbol + '.')
      plan.push({ address: row.address, guardLength: row.length, guardSha256: row.sha256, bytes: call(target, row.kind, row.writeLength), note: row.note })
    }
  }
  return plan
}
export async function applyPlatformOsWrites(original: Uint8Array, runtime: RuntimeText, ids: readonly string[]) {
  if (original.length !== metadata.osBytes) throw new Error('Platform installation needs the original OS image.')
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(original).buffer)
  if (Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') !== metadata.sourceSha256) throw new Error('Platform installation needs the original OS fingerprint.')
  return applyGuardedOsWrites(original, createPlatformOsWrites(runtime, ids))
}
