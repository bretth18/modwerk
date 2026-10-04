import { MODULE_DOCUMENTS } from './documents.ts'
export type ModuleDetails = { label: string; family: string; overview: string; highlights: readonly string[]; controls: readonly string[] }
export const DETAILS: Record<string, ModuleDetails> = Object.fromEntries(MODULE_DOCUMENTS.map(document=>[document.id,{label:document.presentation.label,family:document.presentation.family,overview:document.presentation.overview,highlights:document.presentation.highlights,controls:document.controls.map(control=>control.name)}]))
