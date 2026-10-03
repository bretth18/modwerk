/**
 * Structured issue reports, shared by the report form and the Worker so both
 * enforce the same rules. With this many modules and configurations a free-text
 * report rarely reproduces; every report therefore carries the configuration it
 * was built from and, when the device can write one, an OCTAMOD.LOG.
 */
import { MODULES } from '../catalog/modules'

/** Catalog id of the on-device logger. While it is not in the catalog no build can write a log. */
export const LOGGER_MODULE_ID = 'octamod-log'
export const loggerInCatalog = (ids: readonly string[] = MODULES.map(module => module.id)) => ids.includes(LOGGER_MODULE_ID)

export const OT_MODELS = { mk2: 'Octatrack MKII', mk1: 'Octatrack MKI', unknown: 'Not sure' } as const
export const FLASH_STATES = { flashed: 'Running an Octamod build', 'not-flashed': 'Not flashed yet (website/build problem)', stock: 'Back on the stock OS' } as const
export const LOG_MISSING_REASONS = {
  'logger-not-in-build': 'My build does not include the OCTAMOD logger',
  'device-does-not-boot': 'The Octatrack does not boot',
  'card-unreadable': 'The card or OCTAMOD.LOG cannot be read',
  'not-flashed': 'The problem happens before flashing',
  other: 'Other reason',
} as const
export type OtModel = keyof typeof OT_MODELS
export type FlashState = keyof typeof FLASH_STATES
export type LogMissingReason = keyof typeof LOG_MISSING_REASONS
export type IssueContext = {
  model: OtModel
  flash: FlashState
  os: string
  modules: { id: string; version: string }[]
  keepStockFx2: boolean | null
  /** SHA-256 of the image this browser built; never the image itself. */
  build: string
}
export type LogMissing = { reason: LogMissingReason; note: string }

const MODULE_ID = /^[a-z0-9][a-z0-9-]{0,47}$/, VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.]{1,24})?$/

export class IssueInputError extends Error {}
function fail(message: string): never { throw new IssueInputError(message) }
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

export function validateIssueContext(value: unknown): IssueContext {
  if (!isRecord(value)) fail('Report context is missing.')
  const { model, flash, os, modules, keepStockFx2, build } = value
  if (typeof model !== 'string' || !(model in OT_MODELS)) fail('Choose your Octatrack model.')
  if (typeof flash !== 'string' || !(flash in FLASH_STATES)) fail('Choose what the Octatrack is running.')
  if (typeof os !== 'string' || !/^[0-9A-Za-z.]{1,16}$/.test(os)) fail('The base OS version is unreadable.')
  if (!Array.isArray(modules) || modules.length > 64) fail('The configuration module list is unreadable.')
  const seen = new Set<string>()
  const list = modules.map(item => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.version !== 'string' || !MODULE_ID.test(item.id) || !VERSION.test(item.version) || seen.has(item.id)) fail('The configuration module list is unreadable.')
    seen.add(item.id)
    return { id: item.id, version: item.version }
  })
  if (keepStockFx2 !== null && typeof keepStockFx2 !== 'boolean') fail('The FX2 chooser setting is unreadable.')
  if (typeof build !== 'string' || !/^(?:[0-9a-f]{64})?$/.test(build)) fail('The build fingerprint is unreadable.')
  return { model: model as OtModel, flash: flash as FlashState, os, modules: list, keepStockFx2, build }
}

/** A log is required unless the reporter says why there is none; the reason must fit the report. */
export function validateLogMissing(value: unknown, context: IssueContext): LogMissing {
  if (!isRecord(value) || typeof value.reason !== 'string' || !(value.reason in LOG_MISSING_REASONS)) fail('Attach OCTAMOD.LOG, or choose why you cannot.')
  const reason = value.reason as LogMissingReason
  const note = typeof value.note === 'string' ? value.note.trim() : ''
  if (note.length > 500) fail('Keep the reason under 500 characters.')
  if (reason === 'other' && note.length < 10) fail('Describe in a few words why you cannot attach OCTAMOD.LOG.')
  if (reason === 'logger-not-in-build' && context.modules.some(item => item.id === LOGGER_MODULE_ID)) fail('Your configuration includes the OCTAMOD logger. Attach OCTAMOD.LOG from the card.')
  if (reason === 'not-flashed' && context.flash === 'flashed') fail('You said the Octatrack runs an Octamod build. Attach OCTAMOD.LOG, or choose another reason.')
  return { reason, note }
}
