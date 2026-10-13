import pkg from './assets/beta-startup.json' with { type: 'json' }
import { loggerHash } from './core-logger.ts'
import { parseColdFireObject } from './coldfire-elf.ts'
import type { CfRuntimeLink } from './coldfire-link.ts'
import { linkColdFireRuntime } from './coldfire-link.ts'
import { OS_LOAD_ADDRESS, type OsWrite } from './os-patches.ts'
import { createStartupAnimationWrites } from './startup-animation.ts'

export const BETA_STARTUP_VERSION = pkg.version
export const BETA_STARTUP_IDENTITY = { version: pkg.version, sourceSha256: pkg.sourceSha256 }
export const BETA_STARTUP_ROM_ADDRESS = 0x400d6b20
export const BETA_STARTUP_ACTIVE_ADDRESS = BETA_STARTUP_ROM_ADDRESS + 76
// Scene-mute helper ends at 0x400d748a; its remaining 0xff run is unreferenced.
export const MIDI_SCENES_STARTUP_ROM_ADDRESS = 0x400d7490

export async function readBetaStartup() {
  if (pkg.schema !== 1 || pkg.kind !== 'modwerk-beta-startup' || pkg.stockRead !== false || pkg.cpu !== '54455' || pkg.bytes < 52 || pkg.bytes > 64 * 1024 || pkg.code.length !== pkg.bytes * 2 || !/^[0-9a-f]+$/.test(pkg.code)) throw new Error('Invalid beta startup package.')
  const bytes = Uint8Array.from({ length: pkg.bytes }, (_, i) => parseInt(pkg.code.slice(i * 2, i * 2 + 2), 16))
  if (await loggerHash(bytes) !== pkg.sha256) throw new Error('Beta startup package checksum mismatch.')
  const object = parseColdFireObject(bytes)
  if (object.sections.some(section => section.type === 8 && section.size)) throw new Error('Beta startup state must be initialized in the loaded image.')
  return { label: 'modwerk-beta-startup', object }
}

/** A persistent zero cave also initializes the active flag before early draws. */
export async function createBetaStartupRom(runtime: CfRuntimeLink, original: Uint8Array, address = BETA_STARTUP_ROM_ADDRESS) {
  if (![BETA_STARTUP_ROM_ADDRESS, MIDI_SCENES_STARTUP_ROM_ADDRESS].includes(address)) throw new Error('Invalid beta startup cave.')
  const gate = pkg.romGate
  if (gate.bytes < 52 || gate.bytes > 4096 || gate.code.length !== gate.bytes * 2 || !/^[0-9a-f]+$/.test(gate.code)) throw new Error('Invalid beta startup ROM gate.')
  const bytes = Uint8Array.from({ length: gate.bytes }, (_, i) => parseInt(gate.code.slice(i * 2, i * 2 + 2), 16))
  if (await loggerHash(bytes) !== gate.sha256) throw new Error('Beta startup ROM gate checksum mismatch.')
  const object = parseColdFireObject(bytes), text = object.sections.find(section => section.name === '.text')
  if (!text || text.size !== 80 || object.sections.some(section => section.flags & 2 && section.name !== '.text' && section.size)) throw new Error('Invalid beta startup ROM layout.')
  const draw = runtime.symbols.get('modwerk_boot_frame_hook')
  if (draw === undefined) throw new Error('Beta startup runtime is missing.')
  const rom = linkColdFireRuntime([{ label: 'startup-rom', object }], address, new Map([['modwerk_boot_frame_hook', draw]]))
  if (rom.symbols.get('modwerk_boot_active') !== address + 76) throw new Error('Invalid beta startup active flag.')
  const cave = address - OS_LOAD_ADDRESS
  if (cave < 0 || cave + rom.bytes.length > original.length || original.subarray(cave, cave + rom.bytes.length).some(byte => byte !== 0)) throw new Error('Beta startup stock guard mismatch: ROM cave')
  const replay = rom.symbols.get('modwerk_boot_rom_replay')!, at = pkg.guards.draw.address - OS_LOAD_ADDRESS
  if (at < 0 || at + 6 > original.length || await loggerHash(original.subarray(at, at + 6)) !== pkg.guards.draw.sha256) throw new Error('Beta startup stock guard mismatch: draw')
  rom.bytes.set(original.subarray(at, at + 6), replay - address)
  return { bytes: rom.bytes, draw: rom.symbols.get('modwerk_boot_draw_gate')! }
}

/** Beta uses two instruction hooks instead of the public graphic-table writes. */
export async function installStartup(runtime: CfRuntimeLink, original: Uint8Array, betaAccess = false, address = BETA_STARTUP_ROM_ADDRESS): Promise<OsWrite[]> {
  if (!betaAccess) return createStartupAnimationWrites()
  const text = runtime.sections.find(section => section.name === '.text')
  if (!text) throw new Error('Beta startup runtime text is missing.')
  const symbol = (name: string, size = 2) => {
    const address = runtime.symbols.get(name)
    if (address === undefined || address % 2 || address < text.address || address + size > text.address + text.size) throw new Error('Invalid beta startup symbol: ' + name)
    return address
  }
  const writes: OsWrite[] = []
  const rom = await createBetaStartupRom(runtime, original, address)
  for (const [key, guard] of Object.entries(pkg.guards)) {
    const at = guard.address - OS_LOAD_ADDRESS
    if (guard.length !== 6 || at < 0 || at + guard.length > original.length || await loggerHash(original.subarray(at, at + guard.length)) !== guard.sha256) throw new Error('Beta startup stock guard mismatch: ' + key)
    const target = key === 'loop' ? symbol('modwerk_boot_loop') : rom.draw
    if (key === 'draw') runtime.bytes.set(original.subarray(at, at + guard.length), symbol('modwerk_boot_replay_draw', guard.length) - text.address)
    const bytes = new Uint8Array(6), view = new DataView(bytes.buffer)
    view.setUint16(0, 0x4ef9); view.setUint32(2, target)
    writes.push({ address: guard.address, guardLength: guard.length, guardSha256: guard.sha256, bytes, note: 'beta startup ' + key })
  }
  const expectedCave = new Uint8Array(rom.bytes.length)
  if (address === MIDI_SCENES_STARTUP_ROM_ADDRESS) expectedCave.fill(0xff)
  writes.push({ address, guardLength: rom.bytes.length, guardSha256: await loggerHash(expectedCave), bytes: rom.bytes, note: 'beta startup persistent draw gate' })
  return writes
}
