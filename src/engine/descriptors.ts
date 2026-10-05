// Native descriptor recipes contain authored names, defaults and format facts.
// Inherited descriptor content is copied from the user's verified OS only.
import recipes from './assets/descriptor-recipes.json' with { type: 'json' }
import { CATALOG_SOURCE, resolveSelection } from '../catalog/modules.ts'
import { OS_LOAD_ADDRESS, type OsWrite } from './os-patches.ts'

async function hash(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
/** Placement order of the selected modules: catalog order, except that `leading` modules come first. Native lists a module that
 *  replaces a kept stock effect at that effect's chooser slot, ahead of every module of its own, and places clones in that order. */
export function placementOrder<T extends { id: string }>(selected: readonly T[], leading: readonly string[] = []): T[] {
  return [...selected.filter(module => leading.includes(module.id)), ...selected.filter(module => !leading.includes(module.id))]
}
export async function composeDescriptors(original: Uint8Array, ids: readonly string[], leading: readonly string[] = []) {
  const selected = placementOrder(resolveSelection(ids).filter(module => module.fxId !== undefined), leading)
  if (recipes.schema !== 1 || recipes.revision !== CATALOG_SOURCE.revision || recipes.descriptorBytes !== 0x192 || recipes.cloneStride !== 0x1a0 || recipes.cloneBase !== 0x400d6b20 || recipes.safeCeiling !== 0x400d8000 || recipes.buildTag !== '79') throw new Error('Descriptor recipes do not match the pinned catalog layout.')
  if (await hash(original) !== recipes.sourceSha256) throw new Error('Descriptor composition needs the original OS fingerprint.')
  const writes: OsWrite[] = [], descriptors = []
  for (const [index, module] of selected.entries()) {
    const recipe = recipes.recipes.find(recipe => recipe.id === module.id)
    if (!recipe || recipe.key !== module.key || recipe.author !== module.author || recipe.fxId !== module.fxId) throw new Error('Descriptor attribution does not match the module catalog.')
    const address = recipes.cloneBase + index * recipes.cloneStride, donorOffset = recipe.donorAddress - OS_LOAD_ADDRESS
    if (address + recipes.descriptorBytes > 0x400d7bbc || donorOffset < 0 || donorOffset + recipes.descriptorBytes > original.length) throw new Error('The descriptor clone does not fit its reserved window.')
    const bytes = new Uint8Array(original.subarray(donorOffset, donorOffset + recipes.descriptorBytes))
    if (await hash(bytes) !== recipe.donorSha256) throw new Error('The local descriptor donor fingerprint does not match.')
    const view = new DataView(bytes.buffer)
    const inheritedLo = view.getUint32(0x18e), inheritedHi = view.getUint32(0x18a)
    for (const field of recipe.integers) {
      if (![1,4].includes(field.width) || !Number.isInteger(field.offset) || field.offset < 0 || field.offset + field.width > bytes.length || !Number.isInteger(field.value) || field.value < 0 || field.value >= 2 ** (field.width * 8)) throw new Error('A descriptor field has an invalid width, offset or value.')
      if (field.width === 1) view.setUint8(field.offset, field.value)
      else view.setUint32(field.offset, field.value)
    }
    if (recipe.inheritedEnable) {
      for (const slot of recipe.inheritedEnable) {
        if (!Number.isInteger(slot) || slot < 0 || slot > 11) throw new Error('Invalid inherited descriptor control.')
        const offset = slot < 8 ? 0x18e : 0x18a, shift = (slot % 8) * 4, mask = (0xf << shift) >>> 0
        const inherited = slot < 8 ? inheritedLo : inheritedHi
        view.setUint32(offset, ((view.getUint32(offset) & ~mask) | (inherited & mask)) >>> 0)
      }
    }
    for (const field of recipe.strings) {
      if (!Number.isInteger(field.offset) || !Number.isInteger(field.width) || field.offset < 0 || field.width < 1 || field.offset + field.width > bytes.length || field.value.length >= field.width || [...field.value].some(char => char.charCodeAt(0) > 255 || char.charCodeAt(0) === 0)) throw new Error('A descriptor name exceeds its terminated field.')
      bytes.fill(0, field.offset, field.offset + field.width)
      for (let i = 0; i < field.value.length; i++) bytes[field.offset + i] = field.value.charCodeAt(i)
    }
    writes.push({ address, guardLength: bytes.length, guardSha256: recipes.cloneZeroSha256, bytes, note: module.name + ' descriptor clone' })
    const pointer = new Uint8Array(4); new DataView(pointer.buffer).setUint32(0, address)
    writes.push({ address: recipe.fx2Slot, guardLength: 4, guardSha256: recipe.slotSha256, bytes: pointer, note: module.name + ' FX2 descriptor pointer' })
    descriptors.push({ id: module.id, key: module.key, address, fxId: recipe.fxId, bytes })
  }
  return { writes, descriptors, caveCursor: recipes.cloneBase + selected.length * recipes.cloneStride, buildTag: recipes.buildTag }
}
