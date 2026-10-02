import { compareModuleVersions } from './versions'

export type ModuleVersion = { id: string; version: string }

export function moduleIsNew(module: ModuleVersion, viewedVersion: string | undefined, baseline: readonly string[] | null): boolean {
  return baseline !== null && !baseline.includes(module.id) && viewedVersion === undefined
}

export function moduleHasUpdate(module: ModuleVersion, viewedVersion: string | undefined): boolean {
  if (!viewedVersion) return false
  try { return compareModuleVersions(module.version, viewedVersion) > 0 } catch { return false }
}

// The first visit snapshots the full catalog, including modules hidden by filters.
// Later additions and updates stay unread until their module page is opened.
export function moduleViewsToRemember(modules: readonly ModuleVersion[], viewed: Readonly<Record<string, string>>, baseline: readonly string[], openedId?: string): ModuleVersion[] {
  return modules.filter(module => viewed[module.id] === undefined && baseline.includes(module.id) || module.id === openedId && viewed[module.id] !== module.version)
}
