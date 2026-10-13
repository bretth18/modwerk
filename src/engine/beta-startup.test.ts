import { describe, expect, it } from 'vitest'
import { readBetaStartup, installStartup } from './beta-startup'
import { createStaticColdFireRuntime } from './coldfire-runtime'
import { createRuntimeBootstrap } from './bootstrap'
import { LOGGER_RETAINED_BYTES } from './core-logger'
import { createStartupAnimationWrites } from './startup-animation'
import { parseColdFireObject } from './coldfire-elf'
import pkg from './assets/beta-startup.json'

describe('beta docking startup', () => {
  it('adds the authored object only to beta builds and stays inside the existing reservation', async () => {
    for (const ids of [[], ['repitch'], ['tapeecho', 'euclid']]) {
      const publicRuntime = await createStaticColdFireRuntime(ids)
      const beta = await createStaticColdFireRuntime(ids, undefined, undefined, undefined, true)
      expect(publicRuntime.units).not.toContain('modwerk-beta-startup')
      expect(beta.units).toContain('modwerk-beta-startup')
      expect(beta.reserveBytes).toBe(publicRuntime.reserveBytes)
      expect(beta.symbols.has('modwerk_boot_run')).toBe(true)
      const bootstrap = await createRuntimeBootstrap(beta.bytes, beta.reserveBytes - LOGGER_RETAINED_BYTES, undefined, beta)
      expect(bootstrap.layout.stageEnd).toBeLessThanOrEqual(bootstrap.layout.ceiling)
      expect(await installStartup(publicRuntime, new Uint8Array(), false)).toEqual(createStartupAnimationWrites())
    }
  })

  it('keeps the shipped stock replay empty and refuses missing hooks and changed stock', async () => {
    const { object } = await readBetaStartup()
    expect(object.sections.filter(section => section.type === 8).every(section => section.size === 0)).toBe(true)
    const replay = object.symbols.find(symbol => symbol.name === 'modwerk_boot_replay_draw')!
    expect([...object.sections[replay.section].data.subarray(replay.value, replay.value + 6)]).toEqual(Array(6).fill(0))
    const rom = parseColdFireObject(Uint8Array.from({ length: pkg.romGate.bytes }, (_, i) => parseInt(pkg.romGate.code.slice(i * 2, i * 2 + 2), 16)))
    const romReplay = rom.symbols.find(symbol => symbol.name === 'modwerk_boot_rom_replay')!
    expect([...rom.sections[romReplay.section].data.subarray(romReplay.value, romReplay.value + 6)]).toEqual(Array(6).fill(0))
    expect(rom.symbols.find(symbol => symbol.name === 'modwerk_boot_active')?.value).toBe(76)
    expect(rom.sections.find(section => section.name === '.text')!.size % 4).toBe(0)
    const runtime = await createStaticColdFireRuntime([], undefined, undefined, undefined, true)
    await expect(installStartup(runtime, new Uint8Array(1112560), true)).rejects.toThrow('stock guard mismatch')
  })
})
