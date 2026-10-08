import { describe, expect, it, vi } from 'vitest'
import { diagnosePlacement, isPlacementFailure } from './placement-conflicts'
import { MODULES } from '../catalog/modules'
import { MenuSpaceError } from './placement-error'

const reported = ['miniverb', 'tapeecho', 'euclid', 'repitch', 'tapehead', 'analog-bassdrum', 'previewvol', 'sidechain-compressor', 'playmodes', 'mute-modes', 'recorder-loop-fix']
const failure = new MenuSpaceError('Mute Modes menu and patch code', 208, 60, ['mute-modes'])
describe('placement fixes', () => {
  it('checks complete remaining selections and finds two removals when no single removal works', async () => {
    const companions = ['miniverb', 'euclid', 'tapehead', 'sidechain-compressor']
    const verify = vi.fn(async (remaining: string[]) => {
      const removed = reported.filter(id => !remaining.includes(id))
      if (removed.length !== 2 || !removed.includes('mute-modes') || !removed.some(id => companions.includes(id))) throw failure
    })
    const conflict = await diagnosePlacement(reported, failure, verify)
    expect(verify.mock.calls.slice(0, reported.length).map(([ids]) => ids.length)).toEqual(reported.map(() => 10))
    expect(conflict.moduleIds).toEqual(['mute-modes'])
    expect(conflict.description).toContain('208 bytes needed, 60 bytes available')
    expect(conflict.description).toContain('Removing one module is insufficient')
    expect(conflict.fixes.map(fix => fix.removeIds)).toEqual(companions.map(id => [id, 'mute-modes']))
    for (const fix of conflict.fixes) await expect(verify(reported.filter(id => !fix.removeIds!.includes(id)))).resolves.toBeUndefined()
  })
  it('prefers successful single removals and does not offer unchecked two-module guesses', async () => {
    const verify = vi.fn(async (remaining: string[]) => { if (remaining.includes('euclid')) throw failure })
    const conflict = await diagnosePlacement(['miniverb', 'tapeecho', 'euclid', 'repitch'], failure, verify)
    expect(conflict.fixes).toEqual([{ label: 'Remove Euclid', removeIds: ['euclid'] }])
    expect(verify).toHaveBeenCalledTimes(4)
    expect(conflict.description).not.toContain('Removing one module is insufficient')
  })
  it('leaves unsupported reductions explicit and stops when the firmware changes', async () => {
    const verify = vi.fn(async () => { throw failure })
    const noFix = await diagnosePlacement(reported, failure, verify)
    expect(noFix.fixes).toEqual([])
    expect(noFix.description).toContain('among the checked choices')
    let current = true
    const stale = await diagnosePlacement(reported, failure, async () => { current = false }, () => current)
    expect(stale.fixes).toEqual([])
  })
  it('only diagnoses space failures and preserves the DSP/menu distinction', () => {
    expect(isPlacementFailure(failure)).toBe(true)
    expect(isPlacementFailure(new Error('payload A: EUCLID does not fit any harvested run.'))).toBe(true)
    expect(isPlacementFailure(new Error('The original OS fingerprint differs.'))).toBe(false)
    expect(isPlacementFailure(new Error('Invalid module menu placement.'))).toBe(false)
  })
  it('bounds diagnostic work for large selections without claiming untested choices work', async () => {
    const verify = vi.fn(async () => { throw failure })
    const conflict = await diagnosePlacement(MODULES.map(module => module.id), failure, verify)
    expect(verify).toHaveBeenCalledTimes(128)
    expect(conflict.fixes).toEqual([])
    expect(conflict.description).toContain('among the checked choices')
  })
  it('names DSP failures without advising a single removal when none was verified', async () => {
    const conflict = await diagnosePlacement(reported, new Error('payload A: SIDECHAIN_COMPRESSOR does not fit any harvested run.'), async () => { throw failure })
    expect(conflict.title).toContain('effect memory')
    expect(conflict.moduleIds).toEqual(['sidechain-compressor'])
    expect(conflict.description).toContain('Sidechain Compressor does not fit')
    expect(conflict.description).not.toContain('Remove one of them')
  })
})
