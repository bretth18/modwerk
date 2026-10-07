import { describe, expect, it } from 'vitest'
import { getStartedComplete, getStartedSteps } from './get-started'
const fresh = { username: 'newcomer', displayName: 'newcomer', avatar: null, introductions: 0, followedModules: 0, pushEnabled: false }
describe('new-member checklist', () => {
  it('starts with every step open and links each one to the place that completes it', () => {
    const steps = getStartedSteps(fresh, 'digitakt')
    expect(steps.map(step => step.done)).toEqual([false, false, false, false])
    expect(steps.map(step => step.href)).toEqual(['#account', '#forum/new?category=introductions', '#forum?view=modules&machine=digitakt', '#account/notifications'])
    expect(getStartedSteps(fresh)[2].href).toBe('#forum?view=modules')
    expect(getStartedComplete(steps)).toBe(false)
  })
  it('counts a picture or a display name that differs from the username as a finished profile', () => {
    expect(getStartedSteps({ ...fresh, avatar: 'picture' })[0].done).toBe(true)
    expect(getStartedSteps({ ...fresh, displayName: 'The Newcomer' })[0].done).toBe(true)
    expect(getStartedSteps({ ...fresh, displayName: ' Newcomer ' })[0].done).toBe(false)
  })
  it('is complete once the member introduced themselves, follows a module and gets push on this device', () => {
    const steps = getStartedSteps({ ...fresh, avatar: 'picture', introductions: 1, followedModules: 2, pushEnabled: true })
    expect(steps.every(step => step.done)).toBe(true)
    expect(getStartedComplete(steps)).toBe(true)
    expect(getStartedComplete(getStartedSteps({ ...fresh, avatar: 'picture', introductions: 1, followedModules: 2 }))).toBe(false)
  })
})
