import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import raw from '../../sdk/drafts/midi-scenes/recipe.json'
import { midiScenesConflicts, reconstructMidiScenes, validateMidiScenesPatch, type MidiScenesPatch } from './midi-scenes-patch'
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const candidate = raw as MidiScenesPatch

function synthetic() {
  // Synthetic OS-shaped bytes only; ordinary checks never read real firmware.
  const original = new Uint8Array(1112560)
  const output = original.slice(); output.set([1, 2, 0], 100)
  const recipe: MidiScenesPatch = { ...structuredClone(candidate), stockSha256: sha(original), mainSha256: sha(output), writes: [{ offset: 100, bytes: 3, guardSha256: sha(original.slice(100, 103)), segments: [{ hex: '0102' }, { stockOffset: 10, bytes: 1, sha256: sha(new Uint8Array(1)) }] }] }
  return { original, output, recipe }
}

describe('MIDISC2.0 stock-free candidate', () => {
  it('pins the new author recipe and retains inherited spans as references', () => {
    expect(() => validateMidiScenesPatch(candidate)).not.toThrow()
    expect(candidate.mainSha256).toBe('debb24090cada4be00bc70880136f14e813b0d3a9018b516f922d33671bd9b87')
    expect(candidate.writes).toHaveLength(85)
    const segments = candidate.writes.flatMap(row => row.segments)
    expect(segments.reduce((total, row) => total + ('hex' in row ? row.hex.length / 2 : 0), 0)).toBe(5848)
    expect(segments.reduce((total, row) => total + ('stockOffset' in row ? row.bytes : 0), 0)).toBe(3179)
  })
  it('reconstructs without changing the input, and checks every guard and the final output', async () => {
    const { original, output, recipe } = synthetic()
    // Hash comparison avoids a million-element assertion walk on shared CI runners.
    expect(sha(await reconstructMidiScenes(original, recipe))).toBe(sha(output))
    expect(original.some(Boolean)).toBe(false)
    const altered = original.slice(); altered[12] = 1
    await expect(reconstructMidiScenes(altered, recipe)).rejects.toThrow('unmodified')
    for (const modify of [
      (r: MidiScenesPatch) => { r.writes[0].guardSha256 = '0'.repeat(64) },
      (r: MidiScenesPatch) => { const copy = r.writes[0].segments[1]; if ('stockOffset' in copy) copy.sha256 = '0'.repeat(64) },
      (r: MidiScenesPatch) => { r.writes[0].segments[0] = { hex: '0304' } },
    ]) {
      const changed = structuredClone(recipe); modify(changed)
      await expect(reconstructMidiScenes(original, changed)).rejects.toThrow(/fingerprint|pinned author image/)
    }
  })
  it('rejects malformed recipes, out-of-bounds references, and overlapping writes', () => {
    const { recipe } = synthetic()
    for (const change of [
      (r: MidiScenesPatch) => { r.writes.push(structuredClone(r.writes[0])) },
      (r: MidiScenesPatch) => { r.writes[0].bytes++ },
      (r: MidiScenesPatch) => { r.writes[0].segments[0] = { hex: '1' } },
      (r: MidiScenesPatch) => { r.writes[0].segments[1] = { stockOffset: r.osBytes, bytes: 1, sha256: '0'.repeat(64) } },
      (r: MidiScenesPatch) => { r.upstream.revision = '0'.repeat(40) },
    ]) {
      const changed = structuredClone(recipe); change(changed)
      expect(() => validateMidiScenesPatch(changed)).toThrow()
    }
  })
  it('identifies a remixer write touching the author patch without treating unrelated writes as conflicts', () => {
    const { original, recipe } = synthetic()
    const unrelated = original.slice(); unrelated[50] = 1
    expect(midiScenesConflicts(original, unrelated, recipe)).toEqual([])
    unrelated[101] = 1
    expect(midiScenesConflicts(original, unrelated, recipe)).toEqual([{ offset: 100, bytes: 3 }])
  })
})
