import { describe, expect, it } from 'vitest'
import artwork from '../../sdk/runtime/startup/artwork.json'
import { createStartupAnimationWrites, STARTUP_ANIMATION_VERSION } from './startup-animation'

describe('VAC Octatrack startup artwork', () => {
  it('replaces only the existing particle and wordmark tables within their exact budgets', () => {
    const writes = createStartupAnimationWrites()
    expect(STARTUP_ANIMATION_VERSION).toBe('1.0.0-vac')
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

  it('settles into the exact VAC mark, each cell landing as one block, left to right', () => {
    const data = createStartupAnimationWrites()[0].bytes, view = new DataView(data.buffer)
    const { x: mx, y: my, cell, rows: markRows } = artwork.mark
    const points = new Map<string, number>()
    for (let i = 0; i < 843; i++) {
      const x = view.getInt16(i * 6) + 63, y = 21 - view.getInt16(i * 6 + 2), delay = view.getInt16(i * 6 + 4)
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(128)
      expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(artwork.wordmark.y)
      expect(delay).toBeGreaterThanOrEqual(0); expect(delay).toBeLessThan(256)
      const key = `${x},${y}`
      if (points.has(key)) expect(delay).toBe(points.get(key))
      else points.set(key, delay)
      // Every pixel of a cell shares its cell's delay.
      expect(delay).toBe(250 - Math.floor((x - mx) / cell) * 10 - Math.floor((y - my) / cell) * 2)
    }
    expect(points.size).toBe(832)
    const rows = markRows.map((row, y) => Array.from(row, (_, x) => points.has(`${mx + x},${my + y}`) ? '#' : '.').join(''))
    expect(rows).toEqual(markRows)
    // The V lands before the A, and the A before the C.
    expect(points.get(`${mx},${my}`)!).toBeGreaterThan(points.get(`${mx + 6 * cell},${my}`)!)
    expect(points.get(`${mx + 6 * cell},${my}`)!).toBeGreaterThan(points.get(`${mx + 15 * cell},${my + cell}`)!)
  })
})
