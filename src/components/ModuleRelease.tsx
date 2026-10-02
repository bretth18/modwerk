import { moduleHasUpdate, moduleIsNew } from '../catalog/module-updates'
import type { ModuleVersion } from '../catalog/module-updates'

export function ModuleRelease({ module, viewedVersion, baseline }: { module: ModuleVersion; viewedVersion?: string; baseline: readonly string[] | null }) {
  const isNew = moduleIsNew(module, viewedVersion, baseline)
  const updated = moduleHasUpdate(module, viewedVersion)
  return <div className="card-release">
    <span className="card-version" aria-label={'Module version ' + module.version} title={module.version}>v{module.version.split('-')[0]}</span>
    {isNew && <span className="module-update-badge" title="Added to the library since your first visit. Open the module page to explore it.">New<span className="sr-only"> since your first visit to the module library</span></span>}
    {updated && <span className="module-update-badge" title={'Updated from ' + viewedVersion + ' to ' + module.version + '. Open the module page to review the update.'}>Updated<span className="sr-only"> since you last viewed this module</span></span>}
  </div>
}
