import { moduleHasUpdate } from '../catalog/module-updates'
import type { ModuleVersion } from '../catalog/module-updates'

export function ModuleRelease({ module, viewedVersion }: { module: ModuleVersion; viewedVersion?: string }) {
  const updated = moduleHasUpdate(module, viewedVersion)
  return <div className="card-release">
    <span className="card-version" aria-label={'Module version ' + module.version} title={module.version}>v{module.version.split('-')[0]}</span>
    {updated && <span className="module-update-badge" title={'Updated from ' + viewedVersion + ' to ' + module.version + '. Open the module page to review the update.'}>Updated<span className="sr-only"> since you last viewed this module</span></span>}
  </div>
}
