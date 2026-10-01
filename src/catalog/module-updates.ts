import { compareModuleVersions } from './versions'

export type ModuleVersion = { id: string; version: string }

export function moduleHasUpdate(module: ModuleVersion, viewedVersion: string | undefined): boolean {
  if (!viewedVersion) return false
  try { return compareModuleVersions(module.version, viewedVersion) > 0 } catch { return false }
}

// A first encounter establishes a baseline. Later grid visits retain it until
// the visitor opens the module page, even when filtering or sorting the grid.
export function moduleViewsToRemember(modules: readonly ModuleVersion[], viewed: Readonly<Record<string, string>>, openedId?: string): ModuleVersion[] {
  return modules.filter(module => viewed[module.id] === undefined || module.id === openedId && viewed[module.id] !== module.version)
}
