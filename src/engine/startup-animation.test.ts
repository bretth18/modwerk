import { describe, expect, it } from 'vitest'
import artwork from '../../sdk/runtime/startup/artwork.json'
import { createStartupAnimationWrites, STARTUP_ANIMATION_VERSION } from './startup-animation'

describe('Modwerk Octatrack startup artwork', () => {
  it('replaces only the existing particle and wordmark tables within their exact budgets', () => {
    const writes = createStartupAnimationWrites()
    expect(STARTUP_ANIMATION_VERSION).toBe('1.0.0')
    expect(writes.map(write => [write.address, write.guardLength, write.bytes.length])).toEqual([
      [0x400a81fc, 5058, 5058], [0x400c3c32, 440, 440],
    ])
    for (const write of writes) expect(write.guardSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(artwork.durationMs).toBe(2800)
  })

  it('encodes an upright wordmark for the rotated LCD and keeps bitmap padding clear', () => {
    const data = createStartupAnimationWrites()[1].bytes, view = new DataView(data.buffer)
    const rows = Array.from({ length: 15 }, (_, y) => Array.from({ length: 110 }, (_, x) => view.getUint32(x * 4) & (1 << (17 + y)) ? '#' : '.').join(''))
    expect(rows).toEqual(artwork.wordmark.rows)
    for (let x = 0; x < 110; x++) expect(view.getUint32(x * 4) & 0x1ffff).toBe(0)
  })

  it('settles into the exact tiled mark, with a late comet tail only on the ninth tile', () => {
    const data = createStartupAnimationWrites()[0].bytes, view = new DataView(data.buffer)
    const points = new Map<string, number>()
    for (let i = 0; i < 843; i++) {
      const x = view.getInt16(i * 6) + 63, y = 21 - view.getInt16(i * 6 + 2), delay = view.getInt16(i * 6 + 4)
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(128)
      expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(64)
      expect(delay).toBeGreaterThanOrEqual(0); expect(delay).toBeLessThan(256)
      const key = `${x},${y}`
      const mod = x - artwork.mark.x >= 26 && y - artwork.mark.y >= 26
      if (points.has(key)) expect(delay).toBe(points.get(key)! - (mod ? 16 : 0))
      else points.set(key, delay)
      if (mod) expect(delay).toBe(i < 483 ? 20 : 4)
      else expect(delay).toBeGreaterThanOrEqual(96)
    }
    expect(points.size).toBe(483)
    const rows = Array.from({ length: 34 }, (_, y) => Array.from({ length: 34 }, (_, x) => points.has(`${artwork.mark.x + x},${artwork.mark.y + y}`) ? '#' : '.').join(''))
    expect(rows).toEqual(artwork.mark.rows)
    // Each tile lands as a block; the center arrives before the clockwise ring.
    const tile = (x: number, y: number) => points.get(`${artwork.mark.x + x},${artwork.mark.y + y}`)
    expect([tile(15, 15), tile(7, 7), tile(15, 7), tile(23, 7), tile(23, 15), tile(15, 23), tile(7, 23), tile(7, 15)]).toEqual([248, 230, 212, 194, 176, 140, 122, 104])
  })
})
