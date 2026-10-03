/**
 * OCTAMOD.LOG v1/v2: the text log the on-device logger writes to the CF card root.
 * The grammar is deliberately strict so an upload can only ever be this log:
 * printable ASCII lines, a fixed header and fixed-width hexadecimal records.
 * Anything else (firmware, samples, project files) fails validation.
 * Specification: sdk/runtime/logging/FORMAT.md. Keep both in step.
 */
export const OT_LOG_NAME = 'OCTAMOD.LOG'
export const OT_LOG_MAX_BYTES = 64 * 1024
export const OT_LOG_LEVELS = ['D', 'I', 'W', 'E', 'F'] as const
export type OtLogLevel = typeof OT_LOG_LEVELS[number]
export type OtLogRecord = { boot: number; seq: number; ticks: number; level: OtLogLevel; tag: string; code: number; a: number; b: number }
export type OtLogSummary = {
  version: 1 | 2
  configuration: string
  source: string
  fx1: string[]
  fx2: string[]
  hidden: string[]
  stockFx2: boolean | null
  build: string
  os: string
  modules: { id: string; version: string }[]
  boots: number[]
  records: number
  dropped: number
  levels: Record<OtLogLevel, number>
  recovered: boolean
  lastFault: OtLogRecord | null
}
export type OtLog = { summary: OtLogSummary; records: OtLogRecord[]; text: string }

const MAGIC = /^# OCTAMOD-LOG v([12])$/
const HEADER = /^# ([a-z0-9]+)=(.*)$/
const RECORD = /^([0-9]{5}) ([0-9A-F]{8}) ([DIWEF]) ([A-Z0-9_]{1,4}) ([0-9A-F]{4}) ([0-9A-F]{8}) ([0-9A-F]{8})$/
const MODULE = /^([a-z0-9][a-z0-9-]{0,47})@([0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.]{1,24})?)$/
const MAX_RECORDS = 4096

function crc32(text: string) {
  let crc = 0xffffffff
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ((~crc) >>> 0).toString(16).toUpperCase().padStart(8, '0')
}

export class OtLogError extends Error {}

function fail(line: number, message: string): never { throw new OtLogError(line ? 'Line ' + line + ': ' + message : message) }

/** Validate and parse a log. Throws OtLogError with a user-facing message. */
export function parseOtLog(input: string | Uint8Array): OtLog {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  if (!bytes.length) fail(0, 'The log file is empty. Reproduce the problem, then copy ' + OT_LOG_NAME + ' again.')
  if (bytes.length > OT_LOG_MAX_BYTES) fail(0, 'The log file is larger than ' + OT_LOG_MAX_BYTES / 1024 + ' KB. Choose ' + OT_LOG_NAME + ' from the card root.')
  for (let index = 0; index < bytes.length; index++) {
    const byte = bytes[index]
    if (byte !== 10 && byte !== 13 && (byte < 32 || byte > 126)) fail(0, 'This is not an ' + OT_LOG_NAME + ' text log. Firmware images, samples and project files are not accepted.')
  }
  const text = new TextDecoder('ascii').decode(bytes)
  const lines = text.split(/\r?\n/)
  const magic = lines[0].match(MAGIC)
  if (!magic) fail(1, 'Choose an OCTAMOD-LOG v1 or v2 file from the card root.')
  const summary: OtLogSummary = { version: Number(magic[1]) as 1 | 2, configuration: '', source: '', fx1: [], fx2: [], hidden: [], stockFx2: null, build: '', os: '', modules: [], boots: [], records: 0, dropped: 0, levels: { D: 0, I: 0, W: 0, E: 0, F: 0 }, recovered: false, lastFault: null }
  const records: OtLogRecord[] = []
  let boot = -1, inHeader = true, sessionRecords = false, complete = false
  const seen = new Set<string>(), sessionHeaders = new Set<string>()
  const required = summary.version === 2 ? ['build', 'os', 'modules', 'configuration', 'source', 'fx1', 'fx2', 'hidden', 'stockfx2'] : ['build', 'os', 'modules']
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index], number = index + 1
    // Fixed-size checkpoints end in LF padding; FAT metadata may still be written.
    if (line === '') continue
    if (complete) fail(number, 'Only padding may follow the completion checksum.')
    const header = line.match(HEADER)
    if (header) {
      const [, key, value] = header
      if (summary.version === 2 && key === 'complete') {
        if (boot < 0 || !/^[0-9A-F]{8}$/.test(value) || crc32(lines.slice(0, index).join('\n') + '\n') !== value) fail(number, 'This checkpoint is incomplete or damaged. Try the other OCTAMOD log file.')
        complete = true
      } else if (key === 'boot') {
        if (!/^[0-9]{1,10}$/.test(value)) fail(number, 'boot must be a decimal counter.')
        if (Number(value) > 0xffffffff) fail(number, 'boot is outside the counter range.')
        if (required.some(key => !seen.has(key))) fail(number, 'The log configuration header is incomplete.')
        boot = Number(value); summary.boots.push(boot); inHeader = false; sessionRecords = false; sessionHeaders.clear()
      } else if (key === 'dropped' || key === 'recovered') {
        if (boot < 0 || sessionRecords || sessionHeaders.has(key)) fail(number, 'Session metadata must appear once, after boot and before records.')
        sessionHeaders.add(key)
        if (key === 'dropped') {
          if (!/^[0-9]{1,10}$/.test(value)) fail(number, 'dropped must be a decimal count.')
          if (Number(value) > 0xffffffff) fail(number, 'dropped is outside the counter range.')
          summary.dropped += Number(value)
        } else {
          if (value !== '1' && value !== '0') fail(number, 'recovered must be 0 or 1.')
          summary.recovered ||= value === '1'
        }
      } else if (!inHeader) {
        fail(number, 'Header "' + key + '" must appear before the first boot.')
      } else {
        if (seen.has(key)) fail(number, 'Duplicate configuration header.')
        seen.add(key)
        if (key === 'build') {
          if (!/^[0-9a-f]{16}$|^unknown$/.test(value)) fail(number, 'build must be 16 lowercase hex digits or "unknown".')
          summary.build = value
        } else if (key === 'os') {
          if (!/^[0-9A-Za-z.]{1,16}$/.test(value)) fail(number, 'os is not a firmware version.')
          summary.os = value
        } else if (key === 'modules') {
          const entries = value ? value.split(';') : []
          if (value.length > 2048) fail(number, 'Module list is too long.')
          if (entries.length > 64) fail(number, 'Too many modules.')
          summary.modules = entries.map(entry => { const match = entry.match(MODULE); if (!match) fail(number, 'Module "' + entry + '" is not id@version.'); return { id: match[1], version: match[2] } })
        } else if (summary.version === 2 && (key === 'configuration' || key === 'source')) {
          if (!/^[0-9a-f]{64}$/.test(value)) fail(number, key + ' must be a SHA-256 fingerprint.')
          summary[key] = value
        } else if (summary.version === 2 && (key === 'fx1' || key === 'fx2' || key === 'hidden')) {
          const keys = value ? value.split(';') : []
          if (value.length > 1024 || keys.length > 32 || keys.some(key => !/^[A-Za-z0-9 _+.-]{1,48}$/.test(key))) fail(number, 'Invalid chooser configuration.')
          summary[key] = keys
        } else if (summary.version === 2 && key === 'stockfx2') {
          if (value !== '0' && value !== '1') fail(number, 'stockfx2 must be 0 or 1.')
          summary.stockFx2 = value === '1'
        } else fail(number, 'Unknown header "' + key + '".')
      }
      continue
    }
    const match = line.match(RECORD)
    if (!match) fail(number, 'Not a log record.')
    if (boot < 0) fail(number, 'Records must follow a "# boot=" line.')
    if (records.length >= MAX_RECORDS) fail(number, 'Too many records.')
    const record: OtLogRecord = { boot, seq: Number(match[1]), ticks: parseInt(match[2], 16), level: match[3] as OtLogLevel, tag: match[4], code: parseInt(match[5], 16), a: parseInt(match[6], 16), b: parseInt(match[7], 16) }
    sessionRecords = true
    records.push(record); summary.levels[record.level]++
    if (record.level === 'F') summary.lastFault = record
  }
  if (new Set(summary.modules.map(item => item.id)).size !== summary.modules.length) fail(0, 'The module list contains a duplicate.')
  if (summary.version === 2 && summary.build !== summary.configuration.slice(0, 16)) fail(0, 'The build and configuration fingerprints disagree.')
  if (summary.version === 2 && !complete) fail(0, 'This checkpoint is incomplete. Try the other OCTAMOD log file.')
  if (!summary.build || !summary.os) fail(0, 'The log header is incomplete (build and os are required).')
  if (!summary.boots.length) fail(0, 'The log contains no boot section.')
  summary.records = records.length
  return { summary, records, text }
}

export function formatOtLogRecord(record: OtLogRecord) {
  const hex = (value: number, width: number) => value.toString(16).toUpperCase().padStart(width, '0')
  return String(record.seq).padStart(5, '0') + ' ' + hex(record.ticks, 8) + ' ' + record.level + ' ' + record.tag + ' ' + hex(record.code, 4) + ' ' + hex(record.a, 8) + ' ' + hex(record.b, 8)
}

/** One line for an inbox or issue: what an author looks at first. */
export function describeOtLog(summary: OtLogSummary) {
  const parts = [summary.records + ' records', summary.boots.length + (summary.boots.length === 1 ? ' boot' : ' boots')]
  if (summary.levels.F) parts.push(summary.levels.F + ' fault' + (summary.levels.F === 1 ? '' : 's'))
  if (summary.levels.E) parts.push(summary.levels.E + ' error' + (summary.levels.E === 1 ? '' : 's'))
  if (summary.levels.W) parts.push(summary.levels.W + ' warning' + (summary.levels.W === 1 ? '' : 's'))
  if (summary.dropped) parts.push(summary.dropped + ' dropped')
  if (summary.recovered) parts.push('recovered after reset')
  return parts.join(' · ')
}
