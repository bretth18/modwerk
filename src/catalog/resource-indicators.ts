import type { ModuleDocument } from './module-contract'
import { requireModuleResourceImpact } from './resource-impact'

export function moduleResourceIndicators(document: ModuleDocument) {
  const impact = requireModuleResourceImpact(document)
  const levels = { minimal: { score: 1, label: 'Minimal' }, low: { score: 2, label: 'Low' }, moderate: { score: 3, label: 'Moderate' }, high: { score: 4, label: 'High' } }
  return (['cpu', 'dsp', 'memory'] as const).map(id => {
    const estimate = impact[id]
    const level = levels[estimate.level]
    return {
      id, label: id === 'cpu' ? 'CPU' : id === 'dsp' ? 'DSP core' : 'Memory',
      value: level.label, score: level.score, fill: level.score / 4 * 100,
      status: estimate.basis === 'source-estimate' ? 'Estimated' : 'Compared',
      description: estimate.rationale, source: estimate.source,
    }
  })
}
