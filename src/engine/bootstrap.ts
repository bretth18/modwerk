// Authored octabam loader template, derived from June Kiff's Octakit loader.
// See /licenses/octabam.txt and /licenses/ems-octakit.txt.
import template from './assets/bootstrap-package.json' with { type: 'json' }
import { CATALOG_SOURCE } from '../catalog/modules.ts'
import { parseColdFireObject, relocateColdFireObject } from './coldfire-elf.ts'
import { packGka3, unpackGka3 } from './runtime-pack.ts'
import { PLATFORM_RUNTIME_BASE } from './coldfire-runtime.ts'
export const PLATFORM_RESERVE_BYTES = 1707 * 6144
export const BOOTSTRAP_ADDRESS = 0x4010fdf0
const UNCACHED = 0x08000000, STAGE_ALIGNMENT = 0x1000
export function rollingHash(bytes: Uint8Array): number {
  let result = 0
  for (const byte of bytes) result = (Math.imul(result, 33) + byte) >>> 0
  return result
}
export function runtimeStageLayout(rawBytes: number, packedBlobBytes: number, reserveBytes = PLATFORM_RESERVE_BYTES, base = PLATFORM_RUNTIME_BASE) {
  if (!Number.isInteger(rawBytes) || rawBytes < 1 || !Number.isInteger(packedBlobBytes) || packedBlobBytes < 13) throw new Error('The runtime stage has invalid sizes.')
  if (!Number.isInteger(reserveBytes) || reserveBytes < 1 || reserveBytes > 16 * 1024 * 1024) throw new Error('Invalid runtime reserve.')
  if (!Number.isInteger(base) || base < PLATFORM_RUNTIME_BASE || (base - PLATFORM_RUNTIME_BASE) % 6144 || base + reserveBytes > 0x46025de0) throw new Error('Invalid runtime base.')
  const ceiling = base + reserveBytes, runtimeEnd = base + rawBytes
  const stage = Math.ceil(runtimeEnd / STAGE_ALIGNMENT) * STAGE_ALIGNMENT, stageEnd = stage + packedBlobBytes
  if (stageEnd > ceiling) throw new Error('The runtime and its packed stage exceed the reserved sample memory.')
  return { base, runtimeEnd, stage, stageEnd, ceiling, size: reserveBytes }
}
export async function createRuntimeBootstrap(raw: Uint8Array, reserveBytes = PLATFORM_RESERVE_BYTES, base = PLATFORM_RUNTIME_BASE) {
  if (raw.length < 1 || raw.length > reserveBytes) throw new Error('The runtime exceeds its reserved sample memory.')
  if (template.schema !== 1 || template.revision !== CATALOG_SOURCE.revision || template.cpu !== '5475' || template.loaderAddress !== BOOTSTRAP_ADDRESS || template.runtimeBase !== PLATFORM_RUNTIME_BASE || template.reserveBytes !== PLATFORM_RESERVE_BYTES || template.uncachedAlias !== UNCACHED || template.stageAlignment !== STAGE_ALIGNMENT) throw new Error('The boot loader template does not match the pinned runtime layout.')
  if (template.bytes < 52 || template.bytes > 65536 || template.code.length !== template.bytes * 2 || !/^[0-9a-f]+$/.test(template.code)) throw new Error('The boot loader template has invalid bytes.')
  const bytes = Uint8Array.from({ length: template.bytes }, (_, i) => parseInt(template.code.slice(i * 2, i * 2 + 2), 16))
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer)
  if (Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') !== template.sha256) throw new Error('The boot loader template checksum does not match.')
  const object = parseColdFireObject(bytes), text = object.sections.find(section => section.name === '.text')
  const table = object.symbols.find(symbol => symbol.name === 'table'), blobSymbol = object.symbols.find(symbol => symbol.name === 'blob0')
  if (!text || text.type !== 1 || text.flags !== 6 || !table || !blobSymbol || table.section !== text.index || blobSymbol.section !== text.index || table.value % 4 || table.value + 36 !== blobSymbol.value || blobSymbol.value !== text.size || object.sections.some(section => section.flags & 2 && section.index !== text.index && section.size)) throw new Error('The boot loader template has an unsupported table layout.')
  const packed = packGka3(raw), decoded = unpackGka3(packed)
  if (decoded.length !== raw.length || decoded.some((byte, i) => byte !== raw[i])) throw new Error('The runtime failed its packing round-trip.')
  const blob = new Uint8Array(packed.length + 4)
  new DataView(blob.buffer).setUint32(0, 0x4f435441); blob.set(packed, 4)
  const layout = runtimeStageLayout(raw.length, blob.length, reserveBytes, base), rawHash = rollingHash(raw), packedHash = rollingHash(packed)
  const content = new Uint8Array(text.size + blob.length); content.set(text.data); content.set(blob, blobSymbol.value)
  const view = new DataView(content.buffer), row = table.value + 4
  if (view.getUint32(table.value) !== 1) throw new Error('The boot loader template has an invalid payload count.')
  // The source pointer is relocated by ELF; the remaining fields are dynamic.
  for (const [index, value] of [blob.length, packedHash, layout.stage + UNCACHED, layout.base + UNCACHED, raw.length, rawHash, 0].entries()) view.setUint32(row + 4 + index * 4, value)
  text.data = content; text.size = content.length
  const placements = new Map(object.sections.filter(section => section.flags & 2).map(section => [section.index, { address: section.index === text.index ? BOOTSTRAP_ADDRESS : Math.ceil((BOOTSTRAP_ADDRESS + text.size) / section.alignment) * section.alignment }]))
  const linked = relocateColdFireObject(object, placements, new Map())
  const append = linked.sections.find(section => section.index === text.index)!.data
  return { append, layout, rawHash, packedHash }
}
