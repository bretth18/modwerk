import type { ModuleResourceImpact } from '../module-contract'

// Synthetic ratings exercise metadata validation; never module measurements.
export function resourceImpactFixture(): ModuleResourceImpact {
  return {
    conditions: 'Synthetic active-instance workload with all controls changing.',
    cpu: { level: 'minimal', basis: 'source-estimate', rationale: 'Synthetic CPU control-path assessment.', source: 'TESTING.md' },
    dsp: { level: 'high', basis: 'measured-comparison', rationale: 'Synthetic comparison against a reference effect.', source: 'TESTING.md' },
    memory: { level: 'moderate', basis: 'source-estimate', rationale: 'Synthetic state/buffer footprint assessment.', source: 'TESTING.md' },
  }
}
