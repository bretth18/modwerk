import type { BuilderMachine } from '../engine/elekloader/protocol'
import { BUILDER_SOURCE } from '../engine/elekloader/digi-build'
import { resolveDigiSelection } from '../devices/digi-mods'
import { cleanName, normalizeModuleVersions, type Configuration } from './workspace'

/** A JSON selection backup contains no stock file, local filename, account or build output. */
export function createDigiSelection(configuration: Pick<Configuration, 'name' | 'moduleIds' | 'moduleVersions'>, device: BuilderMachine) {
  return { app: 'modwerk', schemaVersion: 1, device, name: cleanName(configuration.name), catalog: { revision: BUILDER_SOURCE.commit },
    modules: resolveDigiSelection(device, configuration.moduleIds).map(module => ({ id: module.id, version: configuration.moduleVersions[module.id] ?? module.version })) }
}
export function downloadDigiSelection(configuration: Pick<Configuration, 'name' | 'moduleIds' | 'moduleVersions'>, device: BuilderMachine) {
  const backup = createDigiSelection(configuration, device)
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2) + '\n'], { type: 'application/json' })), link = document.createElement('a')
  link.href = url; link.download = (backup.name.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '') || device) + '.json'
  document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function parseDigiSelection(text: string, device: BuilderMachine) {
  if (new TextEncoder().encode(text).length > 32 * 1024) throw new Error('Configuration backups must be smaller than 32 KB.')
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('This file is not valid configuration JSON.') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose a Modwerk configuration backup.')
  const item = value as { app?: unknown; schemaVersion?: unknown; device?: unknown; name?: unknown; catalog?: { revision?: unknown }; modules?: { id?: unknown; version?: unknown }[] }
  if (Object.keys(item).some(key => !['app', 'schemaVersion', 'device', 'name', 'catalog', 'modules'].includes(key)) || item.app !== 'modwerk' || item.schemaVersion !== 1 || typeof item.name !== 'string' || !Array.isArray(item.modules) || item.modules.length > 100 || item.modules.some(module => !module || typeof module.id !== 'string' || typeof module.version !== 'string')) throw new Error('Choose a Modwerk configuration backup.')
  if (item.device !== device) throw new Error('This backup belongs to a different machine. Open its configuration page to import it.')
  if (item.catalog?.revision !== BUILDER_SOURCE.commit) throw new Error('This backup uses a different module catalog. Review its modules before creating a new configuration.')
  const moduleIds = resolveDigiSelection(device, item.modules.map(module => module.id as string)).map(module => module.id)
  const versions = Object.fromEntries(item.modules.map(module => [module.id, module.version]))
  return { name: cleanName(item.name), moduleIds, moduleVersions: normalizeModuleVersions(moduleIds, versions, device) }
}
