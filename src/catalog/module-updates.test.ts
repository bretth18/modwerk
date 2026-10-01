import { describe, expect, it } from 'vitest'
import { moduleHasUpdate, moduleViewsToRemember } from './module-updates'

const current = { id: 'midi-scenes', version: '0.2.0-experimental' }
const other = { id: 'repitch', version: '0.1.1-experimental' }

describe('updates since viewing a module', () => {
  it('does not label a first encounter, unchanged release or rollback as an update', () => {
    for (const viewed of [undefined, current.version, '0.3.0-experimental', 'corrupt']) {
      expect(moduleHasUpdate(current, viewed)).toBe(false)
    }
    expect(moduleHasUpdate(current, '0.1.1-experimental')).toBe(true)
  })

  it('uses semantic ordering for numeric and prerelease changes', () => {
    expect(moduleHasUpdate({ ...current, version: '0.10.0' }, '0.9.0')).toBe(true)
    expect(moduleHasUpdate({ ...current, version: '0.2.0' }, '0.2.0-rc.10')).toBe(true)
    expect(moduleHasUpdate({ ...current, version: '0.2.0-rc.10' }, '0.2.0-rc.2')).toBe(true)
  })

  it('establishes only displayed baselines and keeps later grid visits unread', () => {
    expect(moduleViewsToRemember([other], {})).toEqual([other])
    const viewed = { [current.id]: '0.1.1-experimental', [other.id]: other.version }
    expect(moduleViewsToRemember([current, other], viewed)).toEqual([])
    expect(moduleViewsToRemember([other, current], viewed)).toEqual([])
    expect(moduleViewsToRemember([current], viewed)).toEqual([])
  })

  it('acknowledges only the module whose details were opened', () => {
    const viewed = { [current.id]: '0.1.1-experimental', [other.id]: '0.1.0-experimental' }
    expect(moduleViewsToRemember([current, other], viewed, current.id)).toEqual([current])
    expect(moduleHasUpdate(current, current.version)).toBe(false)
    expect(moduleHasUpdate(other, viewed[other.id])).toBe(true)
  })
})
