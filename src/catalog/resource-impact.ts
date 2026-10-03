import { parseModuleResourceImpact, type ModuleDocument, type ModuleResourceImpact } from './module-contract.ts'

type ResourceImpactPin = { id: string; version: string; folderSha256: string }
export type RetainedResourceImpact = ResourceImpactPin & { impact: ModuleResourceImpact }

// Ratings for the frozen existing versions grant no qualification exemptions.
export function parseRetainedResourceImpacts(value: unknown, pins: readonly ResourceImpactPin[]): Map<string, RetainedResourceImpact> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid retained resource estimates')
  const data = value as Record<string, unknown>
  if (data.schemaVersion !== 1 || !Array.isArray(data.modules) || Object.keys(data).some(key => !['schemaVersion', 'modules'].includes(key))) throw new Error('Invalid retained resource estimates schema')
  const records = new Map<string, RetainedResourceImpact>()
  for (const value of data.modules) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid retained resource estimate entry')
    const record = value as Record<string, unknown>
    const pin = pins.find(pin => pin.id === record.id)
    if (!pin || record.version !== pin.version || record.folderSha256 !== pin.folderSha256 || records.has(pin.id) || Object.keys(record).some(key => !['id', 'version', 'folderSha256', 'impact'].includes(key))) throw new Error('Retained resource estimates must pin unique, unchanged existing versions; new modules and updates need resources.impact in their manifest')
    records.set(pin.id, { ...pin, impact: parseModuleResourceImpact(record.impact, pin.id + '.resources.impact') })
  }
  return records
}

export function requireModuleResourceImpact(document: ModuleDocument, retained?: ReadonlyMap<string, RetainedResourceImpact>, retainedVersion?: string): ModuleResourceImpact {
  if (document.resources.impact) return parseModuleResourceImpact(document.resources.impact)
  const record = retained?.get(document.id)
  if (record && (record.version === document.version || record.version === retainedVersion)) return record.impact
  throw new Error(document.id + ': release requires populated CPU, DSP core and memory gauges in resources.impact, with a load tier, basis, rationale, source and workload; rough source estimates are accepted')
}
