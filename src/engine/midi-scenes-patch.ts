// MIDISC2.0 candidate. Public composition remains behind the catalog's pending gate.
// All inherited instruction/descriptor spans come from the local verified 1.40C.
export type MidiScenesPatch = {
  schemaVersion: number; id: string; moduleVersion: string
  upstream: { repository: string; revision: string; path: string; sha256: string }
  osBytes: number; stockSha256: string; mainSha256: string
  writes: { offset: number; bytes: number; guardSha256: string; segments: ({ hex: string } | { stockOffset: number; bytes: number; sha256: string })[] }[]
}
const hash = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)), byte => byte.toString(16).padStart(2, '0')).join('')
const digest = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const integer = (value: number, minimum: number, maximum: number) => Number.isSafeInteger(value) && value >= minimum && value <= maximum
const keys = (value: object, names: string[]) => Object.keys(value).sort().join(',') === names.sort().join(',')

export function validateMidiScenesPatch(recipe: MidiScenesPatch) {
  if (!recipe || !keys(recipe, ['schemaVersion', 'id', 'moduleVersion', 'upstream', 'osBytes', 'stockSha256', 'mainSha256', 'writes']) || recipe.schemaVersion !== 1 || recipe.id !== 'midi-scenes' || recipe.moduleVersion !== '0.2.3-experimental' || recipe.osBytes !== 1112560 || !digest(recipe.stockSha256) || !digest(recipe.mainSha256) || !Array.isArray(recipe.writes) || !recipe.writes.length || recipe.writes.length > 1024) throw new Error('Invalid MIDISC2.0 source recipe.')
  if (!recipe.upstream || !keys(recipe.upstream, ['repository', 'revision', 'path', 'sha256']) || recipe.upstream.repository !== 'https://github.com/bkkbrls-del/midisc' || recipe.upstream.revision !== '4f9a89453fdcdd39a3cd57f010ffa489cac721cd' || recipe.upstream.path !== 'tools/midisc/release20.json' || recipe.upstream.sha256 !== 'a2dbe20d82de8bd3a4f010c1e94c4b2ebf080ca3f7203521053f747b52dc24a1') throw new Error('MIDISC2.0 provenance does not match the pinned author release.')
  let previousEnd = 0
  for (const row of recipe.writes) {
    if (!row || !keys(row, ['offset', 'bytes', 'guardSha256', 'segments']) || !integer(row.offset, previousEnd, recipe.osBytes - 1) || !integer(row.bytes, 1, recipe.osBytes - row.offset) || !digest(row.guardSha256) || !Array.isArray(row.segments) || !row.segments.length || row.segments.length > 16384) throw new Error('Invalid or overlapping MIDISC2.0 patch region.')
    let count = 0
    for (const segment of row.segments) {
      if (!segment || typeof segment !== 'object') throw new Error('Invalid MIDISC2.0 segment.')
      if ('hex' in segment) {
        if (!keys(segment, ['hex']) || typeof segment.hex !== 'string' || !/^(?:[a-f0-9]{2})+$/.test(segment.hex) || segment.hex.length > row.bytes * 2) throw new Error('Invalid authored MIDISC2.0 segment.')
        count += segment.hex.length / 2
      } else {
        if (!keys(segment, ['stockOffset', 'bytes', 'sha256']) || !integer(segment.stockOffset, 0, recipe.osBytes - 1) || !integer(segment.bytes, 1, recipe.osBytes - segment.stockOffset) || !digest(segment.sha256)) throw new Error('Invalid local-stock MIDISC2.0 reference.')
        count += segment.bytes
      }
    }
    if (count !== row.bytes) throw new Error('MIDISC2.0 segment lengths do not match the patch region.')
    previousEnd = row.offset + row.bytes
  }
}

/** Reconstruct the author's standalone image; no bytes are stored, uploaded or logged. */
export async function reconstructMidiScenes(original: Uint8Array, recipe: MidiScenesPatch): Promise<Uint8Array> {
  validateMidiScenesPatch(recipe)
  if (original.length !== recipe.osBytes || await hash(original) !== recipe.stockSha256) throw new Error('MIDISC2.0 requires unmodified original OS 1.40C.')
  const result = original.slice()
  for (const row of recipe.writes) {
    if (await hash(original.subarray(row.offset, row.offset + row.bytes)) !== row.guardSha256) throw new Error('MIDISC2.0 stock-site fingerprint differs.')
    let cursor = row.offset
    for (const segment of row.segments) {
      let bytes: Uint8Array
      if ('hex' in segment) bytes = Uint8Array.from(segment.hex.match(/../g)!, value => parseInt(value, 16))
      else {
        bytes = original.subarray(segment.stockOffset, segment.stockOffset + segment.bytes)
        if (await hash(bytes) !== segment.sha256) throw new Error('MIDISC2.0 inherited stock fingerprint differs.')
      }
      result.set(bytes, cursor); cursor += bytes.length
    }
  }
  if (await hash(result) !== recipe.mainSha256) throw new Error('MIDISC2.0 output differs from the pinned author image.')
  return result
}

/** Diagnose composition overlap before allowing a fixed-address release into the remixer. */
export function midiScenesConflicts(original: Uint8Array, composition: Uint8Array, recipe: MidiScenesPatch) {
  validateMidiScenesPatch(recipe)
  if (original.length !== recipe.osBytes || composition.length < recipe.osBytes) throw new Error('Invalid OS extent for MIDISC2.0 compatibility.')
  return recipe.writes.filter(row => original.subarray(row.offset, row.offset + row.bytes).some((byte, index) => composition[row.offset + index] !== byte)).map(row => ({ offset: row.offset, bytes: row.bytes }))
}
