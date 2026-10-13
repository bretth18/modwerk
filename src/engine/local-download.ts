// SPDX-License-Identifier: GPL-3.0-or-later
// Node tooling bundles this entry with Vite; the same session also serves the browser worker.
import { createEngineSession } from './session'
import type { EngineResponse } from './protocol'
import type { UsbAudioConfiguration } from '../config/usb-audio'

export async function buildOctatrack(stock: Uint8Array, name: string, moduleIds: string[], keepStockFx2: boolean, usbAudio?: UsbAudioConfiguration) {
  let result: EngineResponse | undefined
  const handle = createEngineSession(response => { if (response.type !== 'progress') result = response })
  await handle({ id: 1, type: 'inspect', name, buffer: new Uint8Array(stock).buffer })
  if (result?.type !== 'inspection') throw new Error(result?.type === 'error' ? result.message : 'Stock firmware inspection failed.')
  // The local public-release API does not grant beta membership.
  result = undefined
  await handle({ id: 2, type: 'build', moduleIds, keepStockFx2, usbAudio })
  const built = result as EngineResponse | undefined
  if (built?.type !== 'built') throw new Error(built?.type === 'error' ? built.message : 'Firmware composition failed.')
  return { data: new Uint8Array(built.buffer), sha256: built.sha256, report: built.report }
}
