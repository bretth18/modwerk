// Keep the pinned standalone MIDI Scenes code and its 12-page reservation intact.
// The core logger takes the top 16 pages, separated from the sample arena by
// one guard page. All MIDI Scenes base pointers stay intact.
import recipe from '../../sdk/octabam/modules/midi-scenes/recipe.json' with { type: 'json' }
import arena from './assets/platform-writes.json' with { type: 'json' }
import { reconstructMidiScenes, type MidiScenesPatch } from './midi-scenes-patch.ts'
import { defaultChoosers } from './choosers.ts'
import { createStaticColdFireRuntime, PLATFORM_RUNTIME_BASE } from './coldfire-runtime.ts'
import { createRuntimeBootstrap, PLATFORM_RESERVE_BYTES } from './bootstrap.ts'
import { installCoreLogger, loggerHash, LOGGER_RETAINED_BYTES, LOGGER_RESERVE_BYTES } from './core-logger.ts'
import { createPlatformOsWrites } from './platform-writes.ts'
import { applyGuardedOsWrites, OS_LOAD_ADDRESS, type OsWrite } from './os-patches.ts'

export const MIDI_SCENES_RESERVE_BYTES = 12 * 6144
export const MIDI_SCENES_LOGGER_BASE = 0x46025de0 - LOGGER_RESERVE_BYTES
// Arena initialization clears a trailing free-list word at the sample boundary.
// Without this whole-page gap it overwrites the logger's first instruction.
export const MIDI_SCENES_LOGGER_GUARD_BYTES = 6144

/** Check the author's arena geometry before extending it; reject any changed layout. */
export async function extendMidiScenesArena(author: Uint8Array, writes: readonly OsWrite[]) {
  const delta = MIDI_SCENES_RESERVE_BYTES - PLATFORM_RESERVE_BYTES
  const adjusted = await Promise.all(writes.map(async write => {
    const row = arena.arena.find(row => row.address === write.address)
    if (!row) return write
    // Two author base operands are ROM pointers to its initializer, and other
    // scene code assumes the existing bottom reserve. Preserve all base writes.
    if (row.note.startsWith('arena base')) return null
    const expected = row.note === 'arena clear length' ? row.value - delta
      : ['page count', 'free-list fill limit', 'recorder page cap'].includes(row.note) ? row.value - delta / 6144
      : NaN
    const at = row.address - OS_LOAD_ADDRESS
    if (at < 0 || at + 4 > author.length || !Number.isInteger(expected) || new DataView(author.buffer, author.byteOffset, author.byteLength).getUint32(at) !== expected) throw new Error('MIDI Scenes arena geometry differs from the pinned release.')
    return { ...write, guardSha256: await loggerHash(author.subarray(at, at + row.length)) }
  }))
  const clear = adjusted.find(write => write?.note === 'arena clear length')
  if (!clear || PLATFORM_RUNTIME_BASE + MIDI_SCENES_RESERVE_BYTES
    + new DataView(clear.bytes.buffer, clear.bytes.byteOffset, clear.bytes.byteLength).getUint32(0)
    + MIDI_SCENES_LOGGER_GUARD_BYTES > MIDI_SCENES_LOGGER_BASE) throw new Error('The MIDI Scenes sample arena overlaps the logger guard page.')
  return adjusted.filter((write): write is OsWrite => write !== null)
}

export async function composeLoggedMidiScenes(original: Uint8Array) {
  const author = await reconstructMidiScenes(original, recipe as MidiScenesPatch)
  // Do not ask the legacy native module inventory to load the standalone image.
  const runtime = await createStaticColdFireRuntime([], original, MIDI_SCENES_LOGGER_BASE)
  const chooser = defaultChoosers([], true), reservedBytes = MIDI_SCENES_RESERVE_BYTES + MIDI_SCENES_LOGGER_GUARD_BYTES + runtime.reserveBytes
  const logging = await installCoreLogger(runtime, original, ['midi-scenes'], { ...chooser, hidden: [] })
  const plan = createPlatformOsWrites(runtime, [], { loader: false, reserveBytes: reservedBytes, runtimeBase: runtime.base })
  const writes = await extendMidiScenesArena(author, plan)
  const patched = await applyGuardedOsWrites(author, [...writes, ...logging.writes])
  const bootstrap = await createRuntimeBootstrap(runtime.bytes, runtime.reserveBytes - LOGGER_RETAINED_BYTES, runtime.base)
  const bytes = new Uint8Array(patched.length + bootstrap.append.length)
  bytes.set(patched); bytes.set(bootstrap.append, patched.length)
  return { bytes, chooser: { ...chooser, hidden: [] }, dsp: [], runtime: { reservedBytes, bytes: runtime.bytes.length, stage: bootstrap.layout.stage, stageEnd: bootstrap.layout.stageEnd }, caveCursor: 0, overflowCursor: 0 }
}
