import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import committed from './compatibility-checks.json'
import pairs from './compatibility-pairs.json'
import { compactChecks, passingPairs, recordedCheck, selectionKey, type CompactChecks, type NativeChecks } from './compatibility-checks'
// JSON.parse takes under a second; a Vite JSON import of this 70 MB file takes about 25 s.
const native = JSON.parse(readFileSync(new URL('./native-metadata.json', import.meta.url), 'utf8')) as NativeChecks
describe('compact compatibility checks', () => {
  // Built once outside any test: rebuilding it inside the first test pushed that test past the 5 s default on CI.
  const compact = compactChecks(native), checked = new Set(compact.checked)
  it('matches the committed file, so the site ships the current native record', () => {
    expect(JSON.stringify(committed) + '\n').toBe(readFileSync(new URL('./compatibility-checks.json', import.meta.url), 'utf8'))
    expect(committed).toEqual(compact)
  })
  it('lists exactly the module pairs the full checks record as passing', () => {
    const expected = compact.modules.flatMap((left, index) => compact.modules.slice(index + 1)
      .filter(right => recordedCheck(compact, [left, right], checked)?.length === 0).map(right => selectionKey([left, right]))).sort()
    expect(expected.length).toBeGreaterThan(0)
    expect(passingPairs(compact)).toEqual(expected)
    expect(pairs).toEqual({ revision: compact.revision, passing: expected })
  })
  const records = Object.entries(native.checks)
  // Keep every recorded selection/order assertion within the per-test CPU limit.
  for (let shard = 0; shard < 16; shard++) {
    it(`answers recorded selections and their notes in either id order (group ${shard + 1}/16)`, () => {
      expect(compact.checked.length).toBe(records.length)
      // Collect mismatches: an expect() per record doubles this loop's cost.
      const wrong: string[] = []
      for (let index = shard; index < records.length; index += 16) {
        const [key, notes] = records[index]
        const ids = key.split('+')
        for (const order of [ids, [...ids].reverse()]) if (!isDeepStrictEqual(recordedCheck(compact, order, checked), notes)) wrong.push(order.join('+'))
      }
      expect(wrong).toEqual([])
    })
  }
  it('leaves unknown and unrecorded selections unchecked', () => {
    expect(recordedCheck(compact, ['unknown-module'], checked)).toBeUndefined()
    expect(recordedCheck(compact, compact.modules, checked)).toBeUndefined()
    const unrecorded = ['midi-scenes', 'spectrum', 'vector'].filter(id => compact.modules.includes(id))
    expect(unrecorded.length).toBe(3)
    expect(native.checks[unrecorded.join('+')]).toBeUndefined()
    expect(recordedCheck(compact, unrecorded, checked)).toBeUndefined()
  })
  it('keeps recorded problems by key and rejects malformed records', () => {
    const compact: CompactChecks = compactChecks({ revision: 'r', checks: { a: [], 'a+b': ['b needs a cave'], b: [] } })
    expect(compact).toEqual({ schemaVersion: 1, revision: 'r', modules: ['a', 'b'], checked: [1, 2, 3], problems: { 'a+b': ['b needs a cave'] } })
    expect(recordedCheck(compact, ['b', 'a'])).toEqual(['b needs a cave'])
    expect(recordedCheck(compact, ['a'])).toEqual([])
    expect(() => compactChecks({ revision: 'r', checks: { 'b+a': [] } })).toThrow('sorted')
    expect(() => compactChecks({ revision: 'r', checks: { 'a+a': [] } })).toThrow('sorted')
  })
})
