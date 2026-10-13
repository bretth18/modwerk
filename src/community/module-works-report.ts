import type { DownloadedBuild } from './hardware-feedback'
import { communityModule } from './modules'
import { post } from './api'

const buildDetails = ({ machine, os, modules }: DownloadedBuild): DownloadedBuild => ({ machine, os, modules: modules.map(({ id, name, version }) => ({ id, name, version })) })

/** Confirm this module in one press; unknown installed versions remain unknown. */
export function moduleWorksReport(id: string, download?: DownloadedBuild) {
  if (!communityModule(id)) throw new Error('This module could not be found.')
  return { testedModuleIds: [id], ...(download?.modules.some(module => module.id === id) ? { build: buildDetails(download) } : {}) }
}

export function saveWorkingReports(testedModuleIds: string[], build?: DownloadedBuild, catalogVersion?: string) {
  return post<{ ok: true; testedModuleIds: string[] }>('/working-reports', { testedModuleIds, ...(build ? { build: buildDetails(build) } : catalogVersion ? { catalogVersion } : {}) })
}
