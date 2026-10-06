import type { Plugin } from 'vite'
import { COMMUNITY_MODULES } from '../src/community/modules'
import { isModulePaused } from '../src/catalog/availability'
import type { ModuleReleaseManifest } from '../src/community/module-release-contract'

export function moduleReleases(): Plugin {
  return {
    name: 'modwerk-module-release-inventory', apply: 'build',
    generateBundle() {
      const manifest: ModuleReleaseManifest = { format: 'modwerk-module-releases-v1', modules: COMMUNITY_MODULES.filter(module => module.machine !== 'octatrack' || !isModulePaused(module.id)).map(({ id, name, version, href }) => ({ id, name, version, href })) }
      this.emitFile({ type: 'asset', fileName: 'module-releases.json', source: JSON.stringify(manifest) })
    },
  }
}
