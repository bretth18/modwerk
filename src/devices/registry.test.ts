import { describe, expect, it } from 'vitest'
import { DEVICES, DEVICES_BY_ID, DEVICE_STEPS } from './registry'
import { DIGI_MODS, estimateCombination } from './digi-mods'

describe('device registry', () => {
  it('has unique ids and a state for every step', () => {
    expect(new Set(DEVICES.map(device => device.id)).size).toBe(DEVICES.length)
    for (const device of DEVICES) for (const step of DEVICE_STEPS) expect(device.steps[step.id]).toMatch(/^(done|started|open)$/)
  })

  it('only claims firmware details and finished steps for machines with mods', () => {
    for (const device of DEVICES) {
      const hasMods = device.status === 'available' || device.status === 'preview'
      expect(!!device.firmware).toBe(hasMods)
      if (!hasMods) expect(device.steps.mods).toBe('open')
    }
  })

  it('lists digi mods only for digi machines in the registry', () => {
    for (const mod of DIGI_MODS) expect(DEVICES_BY_ID[mod.device]?.status).toBe('preview')
  })
})

describe('digi combination estimate', () => {
  it('fits small sets and rejects sets over the shared area', () => {
    expect(estimateCombination('digitakt', ['digineighbor', 'digisophie', 'digihealth']).fits).toBe(true)
    expect(estimateCombination('digitakt', ['digislicer', 'digineighbor']).fits).toBe(false)
  })

  it('keeps machine slots apart between slicer and neighbor', () => {
    const estimate = estimateCombination('digitakt', ['digislicer', 'digineighbor'])
    expect(estimate.clashes).toEqual([])
  })
})

describe('standalone firmware', () => {
  it('never combines with other mods', async () => {
    const { DIGI_MODS: mods } = await import('./digi-mods')
    const original = mods.slice()
    mods.push({ ...mods[0], id: 'whole-os', title: 'WHOLE OS', exclusive: true, claims: [], libraryCategory: 'standalone' })
    try {
      expect(estimateCombination('digitakt', ['whole-os']).clashes).toEqual([])
      expect(estimateCombination('digitakt', ['whole-os', 'digisophie']).clashes[0].claim).toContain('standalone firmware')
    } finally { mods.splice(0, mods.length, ...original) }
  })
})
