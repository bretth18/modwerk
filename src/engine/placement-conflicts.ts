import { resolveSelection } from '../catalog/modules.ts'
import type { SelectionConflict } from '../catalog/selection-conflicts.ts'
import { isMenuSpaceFailure } from './build-errors.ts'
import { MenuSpaceError } from './placement-error.ts'

export function isPlacementFailure(error: unknown): error is Error {
  return error instanceof Error && (isMenuSpaceFailure(error.message) || /overruns the region|does not fit any harvested run|nowhere to place/.test(error.message))
}

/** Check complete candidate builds, smallest removals first. Bounded work keeps failures responsive. */
export async function diagnosePlacement(ids: readonly string[], error: Error, verify: (remaining: string[]) => Promise<unknown>, current: () => boolean = () => true): Promise<SelectionConflict> {
  const modules = resolveSelection(ids), fixes: SelectionConflict['fixes'] = []
  let attempts = 0, singlesComplete = true
  const tryRemoval = async (removeIds: string[]) => {
    if (!current() || attempts >= 128) return false
    attempts++
    const remaining = modules.filter(module => !removeIds.includes(module.id)).map(module => module.id)
    if (!remaining.length) return false
    try { await verify(remaining) } catch { return false }
    if (!current()) return false
    fixes.push({ label: 'Remove ' + modules.filter(module => removeIds.includes(module.id)).map(module => module.name).join(' + '), removeIds })
    return true
  }
  for (const module of modules) {
    if (!current() || attempts >= 128) { singlesComplete = false; break }
    await tryRemoval([module.id])
    if (fixes.length === 4) break
  }
  if (!fixes.length && current()) {
    outer: for (let left = 0; left < modules.length; left++) for (let right = left + 1; right < modules.length; right++) {
      if (!current() || attempts >= 128 || fixes.length === 4) break outer
      await tryRemoval([modules[left].id, modules[right].id])
    }
  }
  const advice = fixes.length
    ? (fixes[0].removeIds!.length > 1 && singlesComplete ? 'Removing one module is insufficient. ' : '') + 'Each choice below passed local placement checks for all remaining modules.'
    : 'No working removal of one or two modules was found among the checked choices. Remove more modules, then check again.'
  const menu = isMenuSpaceFailure(error.message), owner = modules.find(module => error.message.includes(module.key))
  const reason = error instanceof MenuSpaceError ? error.message : (owner?.name ?? 'This selection') + ' does not fit in the available ' + (menu ? 'menu and patch space.' : 'effect memory.')
  return { id: 'build-placement-space', title: menu ? 'This selection needs more menu and patch space' : 'This selection needs more effect memory',
    description: reason + ' ' + advice,
    moduleIds: error instanceof MenuSpaceError && error.moduleIds.length ? error.moduleIds : owner ? [owner.id] : modules.map(module => module.id), fixes }
}
