import { DSP_LOADER } from '../engine/protocol'
import { resolveSelection } from '../catalog/modules'
import { compareModuleVersions } from '../catalog/versions'

function deviceId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128
  const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('')
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-')
}

export type Configuration = { id: string; name: string; moduleIds: string[]; moduleVersions: Record<string,string>; keepStockFx2: boolean; createdAt: string; updatedAt: string }
export function newConfiguration(name: string, moduleIds: string[] = [], keepStockFx2 = DSP_LOADER, moduleVersions?: Record<string,string>): Configuration {
  const now = new Date().toISOString()
  return { id: deviceId(), name: cleanName(name), moduleIds: resolveSelection(moduleIds).map(m => m.id), moduleVersions: moduleVersions ? normalizeModuleVersions(moduleIds,moduleVersions) : pinModuleVersions(moduleIds), keepStockFx2, createdAt: now, updatedAt: now }
}
export function cleanName(name: string) {
  const value = name.trim()
  if (!value || value.length > 80) throw new Error('Use a configuration name between 1 and 80 characters.')
  return value
}
export function validateConfiguration(value: unknown): Configuration {
  if (!value || typeof value !== 'object') throw new Error('A saved configuration is unreadable.')
  const item = value as Configuration
  if (item.keepStockFx2 !== undefined && typeof item.keepStockFx2 !== 'boolean') throw new Error('A saved chooser setting is unreadable.')
  if (typeof item.id !== 'string' || !item.id || typeof item.name !== 'string' || !Array.isArray(item.moduleIds) || !item.moduleIds.every(id => typeof id === 'string') || typeof item.createdAt !== 'string' || typeof item.updatedAt !== 'string') throw new Error('A saved configuration is unreadable.')
  return { id: item.id, name: cleanName(item.name), moduleIds: resolveSelection(item.moduleIds).map(m => m.id), moduleVersions: normalizeModuleVersions(item.moduleIds,item.moduleVersions), keepStockFx2: item.keepStockFx2 ?? true, createdAt: item.createdAt, updatedAt: item.updatedAt }
}

export function pinModuleVersions(ids: readonly string[]): Record<string,string> {return Object.fromEntries(resolveSelection(ids).map(module=>[module.id,module.version]))}
// Saved configurations and backups select modules; builds always use the current catalog versions.
export function normalizeModuleVersions(ids: readonly string[], value: unknown): Record<string,string> {
  const modules=resolveSelection(ids)
  if(value!==undefined&&(!value||typeof value!=='object'||Array.isArray(value)))throw new Error('Saved module versions are unreadable.')
  const pins=(value??{}) as Record<string,unknown>
  for(const key of Object.keys(pins))if(!ids.includes(key))throw new Error('Saved version belongs to an unselected module.')
  return Object.fromEntries(modules.map(module=>{const version=pins[module.id]??module.version;if(typeof version!=='string')throw new Error('Saved module version is unreadable.');compareModuleVersions(version,version);return [module.id,module.version]}))
}
