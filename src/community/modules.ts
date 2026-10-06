import { MODULES } from '../catalog/modules'
import { moduleSlug } from '../catalog/module-links'
import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'
import MACHINE_MODULES from '../catalog/machine-modules.json'
import type { ModwerkModule } from '../catalog/module-contract-v3'
import { deviceHref } from '../devices/registry'

/** Community IDs are unique across machines; configuration IDs stay native to each SDK. */
export const COMMUNITY_MODULES = [
  ...MODULES.map(module => ({
    id: module.id, moduleId: module.id, machine: 'octatrack', name: module.name,
    version: module.version, author: module.author, maintainers: [module.author],
    href: '#module/' + moduleSlug(module.id), sourcePath: 'sdk/octabam/modules/' + module.id, summary: module.description,
    evidence: MODULE_DOCUMENTS_BY_ID[module.id].tests.summary,
  })),
  ...(MACHINE_MODULES.modules as ModwerkModule[]).map(module => ({
    id: module.machine + '-' + module.id, moduleId: module.id, machine: module.machine,
    name: module.name, version: module.version, author: module.author.github,
    maintainers: module.maintainers, href: deviceHref(module.machine, 'module/' + module.id),
    sourcePath: 'sdk/' + module.machine + '/modules/' + module.id, summary: module.presentation.summary,
    evidence: module.evidence.tier,
  })),
]
export type CommunityModule = typeof COMMUNITY_MODULES[number]
/** Only reviewed catalog handles confer developer eligibility. */
export function developerModules(login: string | null | undefined) {
  if (!login) return []
  return COMMUNITY_MODULES.filter(module => module.maintainers.some(maintainer => maintainer.toLowerCase() === login.toLowerCase()))
}
export const communityModule = (id: string) => COMMUNITY_MODULES.find(module => module.id === id)
export const machineModules = (machine: string) => COMMUNITY_MODULES.filter(module => module.machine === machine)
export function nativeModule(machine: string, id: string) { return machineModules(machine).find(module => module.moduleId === id) }
/** Each module has one server-created forum thread with this fixed ID. */
export const moduleThreadId = (id: string) => 'module-' + id
/** Open the dedicated report form for catalog modules, sets and reviewed contributions. */
export function moduleIssueHref(id: string) {
  const href = communityModule(id)?.href ?? (id.startsWith('remix-') ? '#module-set/' + id.slice(6) : '#community-module/' + id)
  return href + '?report=1'
}
