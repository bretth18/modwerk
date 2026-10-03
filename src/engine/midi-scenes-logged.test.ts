import { describe, expect, it } from 'vitest'
import arena from './assets/platform-writes.json'
import { extendMidiScenesArena, MIDI_SCENES_LOGGER_BASE, MIDI_SCENES_LOGGER_GUARD_BYTES, MIDI_SCENES_RESERVE_BYTES } from './midi-scenes-logged'
import { createStaticColdFireRuntime, PLATFORM_RUNTIME_BASE } from './coldfire-runtime'
import { createPlatformOsWrites } from './platform-writes'
import { runtimeStageLayout, PLATFORM_RESERVE_BYTES } from './bootstrap'
import { LOGGER_RETAINED_BYTES, LOGGER_RESERVE_BYTES, loggerExternals } from './core-logger'
import { OS_LOAD_ADDRESS } from './os-patches'

describe('standalone MIDI Scenes with the core logger', () => {
  it('links and stages the logger in the top reserve without touching the author bottom reserve', async () => {
    const runtime = await createStaticColdFireRuntime([], undefined, MIDI_SCENES_LOGGER_BASE)
    expect(runtime.base).toBe(0x46025de0 - LOGGER_RESERVE_BYTES)
    expect(runtime.base).toBeGreaterThan(PLATFORM_RUNTIME_BASE + MIDI_SCENES_RESERVE_BYTES)
    expect(runtime.reserveBytes).toBe(LOGGER_RESERVE_BYTES)
    expect(runtime.sections.find(section => section.name === '.text')?.address).toBe(MIDI_SCENES_LOGGER_BASE)
    expect(runtime.symbols.get('olog_idle_hook')).toBeGreaterThanOrEqual(MIDI_SCENES_LOGGER_BASE)
    const retained = loggerExternals(runtime.reserveBytes, runtime.base).get('octamod_log_retained')!
    expect(runtimeStageLayout(runtime.bytes.length, 8192, runtime.reserveBytes - LOGGER_RETAINED_BYTES, runtime.base).stageEnd).toBeLessThanOrEqual(retained)
    expect(() => loggerExternals(runtime.reserveBytes, runtime.base + 1)).toThrow('base')
  })

  it('shrinks the page counts while preserving all author base pointers and rejects changed geometry', async () => {
    // Only numerical arena geometry, never a firmware fixture.
    const author = new Uint8Array(arena.osBytes), view = new DataView(author.buffer)
    const delta = MIDI_SCENES_RESERVE_BYTES - PLATFORM_RESERVE_BYTES
    for (const row of arena.arena) view.setUint32(row.address - OS_LOAD_ADDRESS, row.note.startsWith('arena base') ? row.value + delta : row.note === 'arena clear length' ? row.value - delta : row.value - delta / 6144)
    const runtime = await createStaticColdFireRuntime([], undefined, MIDI_SCENES_LOGGER_BASE)
    const plan = createPlatformOsWrites(runtime, [], { loader: false, reserveBytes: MIDI_SCENES_RESERVE_BYTES + MIDI_SCENES_LOGGER_GUARD_BYTES + LOGGER_RESERVE_BYTES, runtimeBase: runtime.base })
    const before = author.slice()
    const adjusted = await extendMidiScenesArena(author, plan)
    expect(author.every((value, index) => value === before[index])).toBe(true)
    expect(adjusted).toHaveLength(5)
    expect(adjusted.some(write => write.note.startsWith('arena base'))).toBe(false)
    expect(adjusted.filter(write => write.guardSha256 !== plan.find(row => row.address === write.address)?.guardSha256)).toHaveLength(4)
    expect(adjusted.at(-1)).toEqual(plan.at(-1))
    const count = adjusted.find(write => write.note === 'page count')!
    expect(new DataView(count.bytes.buffer).getUint32(0)).toBe(14602 - 12 - 1 - 16)
    const clear = adjusted.find(write => write.note === 'arena clear length')!
    const sampleEnd = PLATFORM_RUNTIME_BASE + MIDI_SCENES_RESERVE_BYTES + new DataView(clear.bytes.buffer).getUint32(0)
    expect(sampleEnd + MIDI_SCENES_LOGGER_GUARD_BYTES).toBe(MIDI_SCENES_LOGGER_BASE)
    // The terminal free-list word belongs in the gap, never in logger code.
    expect(sampleEnd + 4).toBeLessThan(MIDI_SCENES_LOGGER_BASE)
    const unguarded = createPlatformOsWrites(runtime, [], { loader: false, reserveBytes: MIDI_SCENES_RESERVE_BYTES + LOGGER_RESERVE_BYTES, runtimeBase: runtime.base })
    await expect(extendMidiScenesArena(author, unguarded)).rejects.toThrow('logger guard page')
    author[arena.arena.find(row => row.note === 'page count')!.address - OS_LOAD_ADDRESS] ^= 1
    await expect(extendMidiScenesArena(author, plan)).rejects.toThrow('geometry differs')
  })
})
