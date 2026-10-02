import { getModuleSource, resolveSelection } from './modules'
import { MODULE_DOCUMENTS } from './documents'
export type ResourceMetric = { label: string; value: string; note: string }
export type ModuleResources = { measured: string; memory: ResourceMetric; compute: ResourceMetric; usage: string[]; quality: string }
export const RESOURCES: Record<string, ModuleResources> = Object.fromEntries(MODULE_DOCUMENTS.map(document=>[document.id,{measured:document.resources.recorded,memory:{label:document.resources.storage.label,value:document.resources.storage.display,note:document.resources.storage.conditions},compute:{label:document.resources.processing.label,value:document.resources.processing.display,note:document.resources.processing.conditions},usage:document.presentation.usage,quality:document.tests.summary}]))
export function resourceSource(id:string,file='README.md'){return getModuleSource(resolveSelection([id])[0]).replace('/tree/','/blob/')+'/'+file}
