import { machineModules } from './modules'
import { compareModuleVersions } from '../catalog/versions'
import { DEVICES_BY_ID } from '../devices/registry'
export const FORUM_CATEGORIES = { general: 'General discussion', modules: 'Module help', issues: 'Bug reports', configs: 'Shared configurations' } as const
export type ForumCategory = keyof typeof FORUM_CATEGORIES
// A thread may name one Elektron machine; null means it is about Modwerk or every machine.
export function forumMachine(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !DEVICES_BY_ID[value]) throw new Error('Choose a machine from the list.')
  return value
}
export type ForumMachineSummary = { machine: string; threads: number; updated_at: string }
export type SharedConfiguration = { name: string; device?: string; moduleIds: string[]; moduleVersions: Record<string,string>; keepStockFx2: boolean }
export function sharedConfiguration(value: unknown): SharedConfiguration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose a configuration to share.')
  const item = value as SharedConfiguration
  if (Object.keys(item).some(key => !['name','device','moduleIds','moduleVersions','keepStockFx2'].includes(key))) throw new Error('Only configuration names, machine, module choices, versions and settings can be shared. Firmware and other files are not accepted.')
  const device = item.device ?? 'octatrack'
  if (item.device !== undefined && typeof item.device !== 'string') throw new Error('Choose a valid configuration machine.')
  if (typeof device !== 'string' || !['octatrack','digitakt','digitone'].includes(device)) throw new Error('Choose a machine with configurable modules.')
  if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80 || typeof item.keepStockFx2 !== 'boolean' || !Array.isArray(item.moduleIds) || !item.moduleIds.length || item.moduleIds.length > 100 || new Set(item.moduleIds).size !== item.moduleIds.length || item.moduleIds.some(id => typeof id !== 'string' || !machineModules(device).some(module => module.moduleId === id))) throw new Error('This configuration has invalid module choices or settings.')
  if (!item.moduleVersions || typeof item.moduleVersions !== 'object' || Array.isArray(item.moduleVersions) || Object.keys(item.moduleVersions).length !== item.moduleIds.length || Object.keys(item.moduleVersions).some(id => !item.moduleIds.includes(id))) throw new Error('Include the exact version of every module.')
  for (const id of item.moduleIds) {
    const version = item.moduleVersions[id]
    if (typeof version !== 'string' || version.length > 80) throw new Error('Include the exact version of every module.')
    compareModuleVersions(version, version)
  }
  return { name: item.name.trim(), ...(item.device ? {device} : {}), moduleIds: [...item.moduleIds], moduleVersions: { ...item.moduleVersions }, keepStockFx2: item.keepStockFx2 }
}
export type ForumThread = { id:string;title:string;category:ForumCategory;machine:string|null;module_id:string|null;username:string|null;official?:number;status:'open'|'resolved';locked:number;pinned:number;hidden?:number;created_at:string;updated_at:string;replies:number }
export type ForumPost = {id:string;body:string;username:string|null;user_id?:string;created_at:string;edited_at:string|null;hidden:number;likes:number;liked:boolean;canEdit:boolean;official?:boolean}
export type ThreadDetail = {thread:ForumThread;posts:ForumPost[];configuration:SharedConfiguration|null;issue:{device:string;version:string;steps:string;expected:string;actual:string}|null;following:boolean;bookmarked:boolean;hasMore:boolean}
