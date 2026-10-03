/**
 * OCTAMOD.LOG v1: the text log the on-device logger writes to the CF card root.
 * The grammar is deliberately strict so an upload can only ever be this log:
 * printable ASCII lines, a fixed header and fixed-width hexadecimal records.
 * Anything else (firmware, samples, project files) fails validation.
 * Specification: sdk/drafts/octamod-log/FORMAT.md. Keep both in step.
 */
export const OT_LOG_NAME = 'OCTAMOD.LOG'
export const OT_LOG_MAX_BYTES = 64 * 1024
export const OT_LOG_LEVELS = ['D', 'I', 'W', 'E', 'F'] as const
export type OtLogLevel = typeof OT_LOG_LEVELS[number]
export type OtLogRecord = { boot: number; seq: number; ticks: number; level: OtLogLevel; tag: string; code: number; a: number; b: number }
export type OtLogSummary = {
  version: 1
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

const MAGIC = '# OCTAMOD-LOG v1'
const HEADER = /^# ([a-z]+)=(.*)$/
const RECORD = /^([0-9]{5}) ([0-9A-F]{8}) ([DIWEF]) ([A-Z0-9_]{1,4}) ([0-9A-F]{4}) ([0-9A-F]{8}) ([0-9A-F]{8})$/
const MODULE = /^([a-z0-9][a-z0-9-]{0,47})@([0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.]{1,24})?)$/
const MAX_RECORDS = 4096

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
  if (lines[0] !== MAGIC) fail(1, 'The file does not start with "' + MAGIC + '". Choose ' + OT_LOG_NAME + ' from the card root.')
  const summary: OtLogSummary = { version: 1, build: '', os: '', modules: [], boots: [], records: 0, dropped: 0, levels: { D: 0, I: 0, W: 0, E: 0, F: 0 }, recovered: false, lastFault: null }
  const records: OtLogRecord[] = []
  let boot = -1, inHeader = true
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index], number = index + 1
    // The device pads the file to a fixed size so it never reallocates clusters.
    if (line === '') continue
    const header = line.match(HEADER)
    if (header) {
      const [, key, value] = header
      if (key === 'boot') {
        if (!/^[0-9]{1,10}$/.test(value)) fail(number, 'boot must be a decimal counter.')
        boot = Number(value); summary.boots.push(boot); inHeader = false
      } else if (key === 'dropped') {
        if (!/^[0-9]{1,10}$/.test(value)) fail(number, 'dropped must be a decimal count.')
        summary.dropped += Number(value)
      } else if (key === 'recovered') {
        if (value !== '1' && value !== '0') fail(number, 'recovered must be 0 or 1.')
        summary.recovered ||= value === '1'
      } else if (!inHeader) {
        fail(number, 'Header "' + key + '" must appear before the first boot.')
      } else if (key === 'build') {
        if (!/^[0-9a-f]{16}$|^unknown$/.test(value)) fail(number, 'build must be 16 lowercase hex digits or "unknown".')
        summary.build = value
      } else if (key === 'os') {
        if (!/^[0-9A-Za-z.]{1,16}$/.test(value)) fail(number, 'os is not a firmware version.')
        summary.os = value
      } else if (key === 'modules') {
        const entries = value ? value.split(';') : []
        if (entries.length > 64) fail(number, 'Too many modules.')
        summary.modules = entries.map(entry => { const match = entry.match(MODULE); if (!match) fail(number, 'Module "' + entry + '" is not id@version.'); return { id: match[1], version: match[2] } })
      } else fail(number, 'Unknown header "' + key + '".')
      continue
    }
    const match = line.match(RECORD)
    if (!match) fail(number, 'Not a log record.')
    if (boot < 0) fail(number, 'Records must follow a "# boot=" line.')
    if (records.length >= MAX_RECORDS) fail(number, 'Too many records.')
    const record: OtLogRecord = { boot, seq: Number(match[1]), ticks: parseInt(match[2], 16), level: match[3] as OtLogLevel, tag: match[4], code: parseInt(match[5], 16), a: parseInt(match[6], 16), b: parseInt(match[7], 16) }
    records.push(record); summary.levels[record.level]++
    if (record.level === 'F') summary.lastFault = record
  }
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
