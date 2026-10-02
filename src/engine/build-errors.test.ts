import { describe, expect, it } from 'vitest'
import { explainBuildFailure, isMenuSpaceFailure } from './build-errors'
describe('build refusal wording', () => {
  it('explains the stock FX2 trade only where the switch is offered', () => {
    expect(explainBuildFailure('payload A: nothing is harvested, so there is nowhere to place EUCLID.', true)).toContain('Turn off Keep stock FX2')
    expect(explainBuildFailure('payload A: nothing is harvested, so there is nowhere to place EUCLID.')).not.toContain('Keep stock FX2')
  })
  it('asks to remove a module when the DSP space is too small', () => {
    for (const detail of ['payload A: MODULATION overruns the region (3955 > 2724 words)', 'payload A: EUCLID does not fit any harvested run'])
      expect(explainBuildFailure(detail)).toBe('These modules do not fit together in the available effect memory. Remove one of them, then check again.')
  })
  it('does not offer the stock FX2 switch when it is off or absent', () => {
    expect(explainBuildFailure('wide dial hook (116 B) does not fit', false)).not.toContain('Keep stock FX2')
    expect(explainBuildFailure('A module menu cave exceeds its reserved region.')).toBe('These modules do not fit together. Remove one of them, then check again.')
    expect(explainBuildFailure('A module menu cave exceeds its reserved region.', true)).toContain('Turn off Keep stock FX2')
  })
  it('tells menu space apart from DSP placement', () => {
    for (const detail of ['A module menu cave exceeds its reserved region.', 'The effect choosers need more space than this configuration leaves. Remove an effect or shorten the chooser lists.', 'wide dial hook (116 B) does not fit'])
      expect(isMenuSpaceFailure(detail)).toBe(true)
    for (const detail of ['payload A: EUCLID does not fit any harvested run.', 'payload A: MODULATION overruns the region (2966 > 2724 words)', 'The selected firmware changed. Build again.'])
      expect(isMenuSpaceFailure(detail)).toBe(false)
  })
  it('passes other failures through unchanged', () => expect(explainBuildFailure('The selected firmware changed. Build again.')).toBe('The selected firmware changed. Build again.'))
})
