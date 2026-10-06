import { isModuleAvailable } from '../catalog/availability'
import { moduleBuildPending } from '../catalog/build-support'
import { communityModule } from './modules'

/** Download events use the same machine-specific IDs as ratings and likes. */
export function canTrackModuleDownload(id: string) {
  const module = communityModule(id)
  return !!module && (module.machine !== 'octatrack' || isModuleAvailable(id) && !moduleBuildPending(id))
}
