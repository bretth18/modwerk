import { describe, expect, it } from 'vitest'
import { hasUsbLinkAccess } from './beta-access'
import { emptySession } from './context'

const member = { id: 'member', username: 'tester', displayName: 'Tester', verified: true }
describe('Octatrack USB link gate', () => {
  it('opens for beta testers and verified administrators on a computer, and closes again when access goes', () => {
    const beta = { ...emptySession, user: { ...member, betaTester: true } }
    expect(hasUsbLinkAccess(beta, false, false)).toBe(true)
    expect(hasUsbLinkAccess({ ...emptySession, admin: true, user: member }, false, false)).toBe(true)
    expect(hasUsbLinkAccess({ ...emptySession, user: member }, false, false)).toBe(false)
    expect(hasUsbLinkAccess({ ...beta, user: { ...member, betaTester: false } }, false, false)).toBe(false) // revoked
    expect(hasUsbLinkAccess(emptySession, false, false)).toBe(false)
    expect(hasUsbLinkAccess({ ...emptySession, admin: true, user: { ...member, verified: false } }, false, false)).toBe(false)
  })
  it('stays off on touch-only devices, and on for anyone in a dev build or once released', () => {
    expect(hasUsbLinkAccess({ ...emptySession, user: { ...member, betaTester: true } }, true, false)).toBe(false)
    expect(hasUsbLinkAccess({ ...emptySession, user: { ...member, betaTester: true } }, true, true)).toBe(false)
    expect(hasUsbLinkAccess(emptySession, false, true)).toBe(true)
  })
})
