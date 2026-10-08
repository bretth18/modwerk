import { describe, expect, it, vi } from 'vitest'
import { decodeFirmware, encodeFirmware, type DecodedFirmware } from './elek'
import { createEngineSession } from './session'
import { FIRMWARE_VERSION, type EngineResponse } from './protocol'

// Exercise the real session/report/packaging boundary with synthetic bytes.
// Stock verification and the composer are covered by their separate tests and
// private native checks; no proprietary firmware enters this test or CI.
vi.mock('./base', () => ({ inspectBaseFirmware: vi.fn().mockResolvedValue({ version: '1.40C' }) }))
vi.mock('./stock-dsp', () => ({ recoverStockDsp: vi.fn().mockResolvedValue([]) }))
vi.mock('./compose-os', () => ({ composeSelection: vi.fn(async (original: Uint8Array) => ({
  bytes: original.slice(), chooser: { fx1: [], fx2: [], hidden: [] },
  runtime: { bytes: 0, reservedBytes: 0 },
})) }))

const synthetic = (): DecodedFirmware => ({
  header: new TextEncoder().encode('ELEK0001     0.00A'),
  mainOs: new TextEncoder().encode('Synthetic local session payload. Synthetic local session payload.'),
  tail: new Uint8Array([0, 0, 91]), seed: 0x2f1349d2,
})

describe('Octatrack firmware boot name', () => {
  it.each([['repitch'], ['midi-scenes'], ['usb-audio-out-tracks-main-cue', 'quantizer']])(
    'uses Elekloader in validation, the build report and all ten update-header bytes for %j', async (...moduleIds) => {
      const original = synthetic(), input = encodeFirmware(original, original.mainOs, 'STOCK')
      const before = input.slice(), replies: EngineResponse[] = []
      const handle = createEngineSession(response => { replies.push(response) })
      await handle({ id: 1, type: 'inspect', name: 'synthetic.bin', buffer: new Uint8Array(input).buffer })
      expect(replies.at(-1)?.type).toBe('inspection')
      for (const keepStockFx2 of [false, true]) {
        await handle({ id: 2, type: 'validate', moduleIds, keepStockFx2 })
        const validated = replies.at(-1)
        expect(validated?.type).toBe('validated')
        if (validated?.type !== 'validated') throw new Error(JSON.stringify(validated))
        expect(validated.report.version).toBe('Elekloader')
        await handle({ id: 3, type: 'build', moduleIds, keepStockFx2 })
        const built = replies.at(-1)
        expect(built?.type).toBe('built')
        if (built?.type !== 'built') throw new Error(JSON.stringify(built))
        expect(FIRMWARE_VERSION).toBe('Elekloader')
        expect(built.report.version).toBe('Elekloader')
        expect(built.report.moduleIds).toEqual(moduleIds)
        if (moduleIds.includes('midi-scenes')) expect(built.report.moduleVersions['midi-scenes']).toBe('0.2.4-experimental')
        const decoded = decodeFirmware(new Uint8Array(built.buffer))
        expect(new TextDecoder().decode(decoded.header.subarray(8))).toBe('Elekloader')
        expect(decoded.header.subarray(0, 8)).toEqual(original.header.subarray(0, 8))
        expect(decoded.mainOs).toEqual(original.mainOs)
        expect(decoded.tail).toEqual(original.tail)
        expect(decoded.seed).toBe(original.seed)
      }
      expect(input).toEqual(before)
    },
  )
})
