import { MODULE_DOCUMENTS } from './documents.ts'
import { MODULE_ADDED_AT } from './module-additions.ts'
export const CATALOG_SOURCE = {
  repository: 'https://github.com/repeat98/octamad',
  revision: 'b8deefc88b2c3e5f3c6158e364eb741df1924e1d',
  branch: 'codex/dsp-dynload',
} as const

export const LIBRARY_CATEGORIES = ['effects', 'pitch', 'playback', 'machines', 'scenes', 'midi-usb'] as const
export type ModuleCategory = typeof LIBRARY_CATEGORIES[number]
// Library grouping can change without rewriting approved module metadata or qualification pins.
const LIBRARY_CATEGORY_OVERRIDES: Readonly<Partial<Record<string, ModuleCategory>>> = {
  quantizer: 'pitch',
  repitch: 'pitch',
}
export type FirmwareModule = {
  id: string
  key: string
  name: string
  category: ModuleCategory
  description: string
  detail: string
  author: string
  authorName: string
  authorUrl: string
  sourcePath: string
  fxId?: number
  version: string
  addedAt: string
}

export const MODULES: readonly FirmwareModule[] = MODULE_DOCUMENTS.map(document=>({
  id:document.id,key:document.key,name:document.name,category:LIBRARY_CATEGORY_OVERRIDES[document.id]??document.category,
  description:document.presentation.summary,detail:document.compatibility.location,
  author:document.author.github,authorName:document.author.name??document.author.github,authorUrl:'https://github.com/'+document.author.github,
  sourcePath:'sdk/octabam/modules/'+document.id+'/manifest.py',version:document.version,addedAt:MODULE_ADDED_AT[document.id],fxId:document.compatibility.effectId??undefined,
}))

export function getModuleSource(module: FirmwareModule): string {
  const source = MODULE_DOCUMENTS.find(document => document.id === module.id)?.source
  return source ? source.repository + '/tree/' + source.revision + '/' + source.path : CATALOG_SOURCE.repository + '/tree/' + CATALOG_SOURCE.revision + '/modules/' + module.id
}

export function resolveSelection(ids: readonly string[]): FirmwareModule[] {
  const unknown = ids.filter((id) => !MODULES.some((module) => module.id === id))
  if (unknown.length) throw new Error('Unknown module: ' + unknown.join(', '))
  const selected = new Set(ids)
  return MODULES.filter((module) => selected.has(module.id))
}
