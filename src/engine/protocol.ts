import type { FirmwareInspection } from './base'
export type BuildReport = {
  version: string; revision: string; sourceCommit: string | null; sourceTreeSha256: string; moduleIds: string[]; moduleVersions: Record<string,string>; keepStockFx2: boolean
  osBytes: number; runtimeBytes: number; fx1Rows: number; fx2Rows: number
  // Stock FX2 effects left out of this build's FX2 menu; FX1 keeps every stock effect.
  omittedStockFx2: string[]
}
export type BuildProgress = 'composing' | 'packing' | 'verifying'
export type EngineRequest =
  | { id: number; type: 'inspect'; buffer: ArrayBuffer; name: string }
  | { id: number; type: 'validate' | 'build'; moduleIds: string[]; keepStockFx2: boolean }
  | { id: number; type: 'clear' }
export type EngineResponse =
  | { id: number; type: 'inspection'; inspection: FirmwareInspection }
  | { id: number; type: 'validated'; report: BuildReport }
  | { id: number; type: 'progress'; phase: BuildProgress }
  | { id: number; type: 'built'; buffer: ArrayBuffer; report: BuildReport; sha256: string }
  | { id: number; type: 'cleared' }
  | { id: number; type: 'error'; message: string }
// Native byte-parity and rejection checks also passed through this worker
// in the actual browser. See docs/VERIFICATION.md for the supported profiles.
export const ENGINE_AVAILABLE = true
// The owner approved downloads after loader-free native and browser parity verification.
// The four requested modules passed renewed native and actual-browser parity and rejection checks.
export const DOWNLOADS_ENABLED = true
// The dynamic DSP loader (stock effects and modules uploaded on demand) has not been proven on hardware.
// Off: stock DSP code stays built in and modules use the space of stock effects left off both menus.
export const DSP_LOADER = false
export const FIRMWARE_VERSION = 'OCTAMOD79'
