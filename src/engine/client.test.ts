import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFirmwareClient, FirmwareBuildError } from './client'
import type { EngineRequest, EngineResponse } from './protocol'
import type { SelectionConflict } from '../catalog/selection-conflicts'

afterEach(() => vi.unstubAllGlobals())
describe('worker failure details', () => {
  it('keeps verified conflict fixes across the worker boundary', async () => {
    const conflict: SelectionConflict = { id: 'build-placement-space', title: 'This selection needs more menu and patch space', description: 'Mute Modes code does not fit.', moduleIds: ['mute-modes'], fixes: [{ label: 'Remove Euclid + Mute Modes', removeIds: ['euclid', 'mute-modes'] }] }
    vi.stubGlobal('Worker', class {
      onmessage?: (event: { data: EngineResponse }) => void
      postMessage(request: EngineRequest) { this.onmessage?.({ data: { id: request.id, type: 'error', message: conflict.description, conflict: structuredClone(conflict) } }) }
      terminate() {}
    })
    const client = createFirmwareClient()
    const error = await client.validate(['euclid', 'mute-modes'], false).catch(error => error)
    expect(error).toBeInstanceOf(FirmwareBuildError)
    expect(error.conflict).toEqual(conflict)
    expect(error.message).toBe(conflict.description)
    client.dispose()
  })
})
