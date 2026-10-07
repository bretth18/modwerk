import { describe, expect, it } from 'vitest'
import { contributionPoints, isMemberRole, memberStanding, TIERS } from './member-standing'

const none = { threads: 0, replies: 0, likesReceived: 0, reports: 0, modules: 0 }

describe('member standing', () => {
  it('weighs each kind of contribution', () => {
    expect(contributionPoints({ threads: 2, replies: 3, likesReceived: 4, reports: 1, modules: 1 })).toBe(10 + 6 + 4 + 3 + 50)
  })
  it('places new members in the first tier with progress towards the next', () => {
    expect(memberStanding(none)).toMatchObject({ points: 0, rank: 1, tier: { id: 'listener' }, next: { id: 'jammer' }, progress: 0 })
    expect(memberStanding({ ...none, replies: 5 }).progress).toBeCloseTo(10 / 25)
  })
  it('promotes at each threshold and stops at the top tier', () => {
    for (const [index, tier] of TIERS.entries()) {
      expect(memberStanding({ ...none, likesReceived: tier.from }).rank).toBe(index + 1)
      if (tier.from) expect(memberStanding({ ...none, likesReceived: tier.from - 1 }).rank).toBe(index)
    }
    expect(memberStanding({ ...none, modules: 40 })).toMatchObject({ tier: { id: 'headliner' }, next: null, progress: 1 })
  })
  it('recognizes only the three roles', () => {
    expect(['user', 'developer', 'owner'].every(isMemberRole)).toBe(true)
    expect(isMemberRole('admin')).toBe(false)
  })
})
