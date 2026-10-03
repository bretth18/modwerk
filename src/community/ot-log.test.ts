/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { describeOtLog, formatOtLogRecord, OT_LOG_MAX_BYTES, OtLogError, parseOtLog } from './ot-log'

// Written by sdk/runtime/logging/tests/host_test.c; the device pads it to 32 KiB.
const fixture = readFileSync(new URL('../../sdk/runtime/logging/tests/expected.log', import.meta.url), 'utf8')
const minimal = '# OCTAMOD-LOG v1\n# build=unknown\n# os=1.40C\n# modules=\n# boot=1\n00000 0000000A I BOOT 0001 00000000 00000000\n'

describe('OCTAMOD.LOG v1/v2', () => {
  it('parses the C writer output, padded exactly as the device writes it', () => {
    const padded = fixture + '\n'.repeat(32768 - fixture.length)
    const { summary, records } = parseOtLog(new TextEncoder().encode(padded))
    expect(summary).toMatchObject({ build: '0123456789abcdef', os: '1.40C', boots: [1, 2], dropped: 44, recovered: true, records: 259 })
    expect(summary.modules).toEqual([{ id: 'repitch', version: '0.1.0' }, { id: 'miniverb', version: '0.1.2' }])
    expect(summary.levels).toMatchObject({ F: 1, E: 1 })
    expect(summary.lastFault).toMatchObject({ boot: 1, tag: 'FLT', code: 3, a: 0x4000406a, b: 0x2700 })
    expect(records.find(record => record.tag === 'LOG')).toMatchObject({ level: 'W', code: 0xbad })
    expect(records.filter(record => record.boot === 2).map(record => record.tag)).toEqual(['BOOT', 'CARD', 'DSP'])
    expect(describeOtLog(summary)).toBe('259 records · 2 boots · 1 fault · 1 error · 6 warnings · 44 dropped · recovered after reset')
  })
  it('carries exact device configuration independently of a browser image hash', () => {
    const { summary } = parseOtLog(fixture)
    expect(summary).toMatchObject({ version: 2, configuration: '0123456789abcdef'.repeat(4), source: 'a'.repeat(64), stockFx2: true })
    expect(summary.fx1).toEqual(['FILTER', 'REPITCH'])
    expect(summary.fx2).toEqual(['MINIVERB', 'DELAY'])
    expect(summary.hidden).toEqual([])
    expect(parseOtLog(minimal).summary.version).toBe(1)
  })
  it('rejects incomplete, torn and edited v2 checkpoints', () => {
    for (const damaged of [
      fixture.slice(0, fixture.indexOf('# complete=')),
      fixture.replace('0000002A', '0000002B'),
      fixture.replace('# fx1=FILTER', '# fx1=CHORUS'),
      fixture.replace('# complete=', '# os=1.40C\n# complete='),
      fixture + '00000 00000000 I BOOT 0001 00000000 00000000\n',
    ]) expect(() => parseOtLog(damaged)).toThrow(OtLogError)
    expect(parseOtLog(fixture.replace(/\n/g, '\r\n')).summary.records).toBe(259)
  })
  it('refuses duplicate identity headers and module ids in older logs too', () => {
    expect(() => parseOtLog(minimal.replace('# os=', '# build=unknown\n# os='))).toThrow(OtLogError)
    expect(() => parseOtLog(minimal.replace('# modules=', '# modules=x@1.0.0;x@1.0.1'))).toThrow(OtLogError)
    expect(() => parseOtLog(minimal.replace('# boot=1', '# boot=4294967296'))).toThrow(OtLogError)
  })
  it('round-trips records through the shared text form', () => {
    for (const line of fixture.split('\n').filter(line => line && !line.startsWith('#'))) {
      const record = parseOtLog(minimal.replace(/\n0.*\n$/, '\n' + line + '\n')).records[0]
      expect(formatOtLogRecord(record)).toBe(line)
    }
  })
  it('rejects anything that is not the log, including firmware-like bytes', () => {
    const reject = (value: string | Uint8Array) => expect(() => parseOtLog(value)).toThrow(OtLogError)
    reject('')
    reject(new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0, 1, 2]))
    reject(minimal.replace('\n', '\u0000\n'))
    reject('# OCTAMOD-LOG v2\n')
    reject('hello\n' + minimal)
    reject(minimal.replace('I BOOT', 'X BOOT'))
    reject(minimal.replace('I BOOT', 'I boot'))
    reject(minimal.replace('# boot=1\n', ''))
    reject(minimal.replace('# os=1.40C\n', ''))
    reject(minimal + '# build=0123456789abcdef\n')
    reject(minimal.replace('# modules=', '# modules=Not A Module'))
    reject(minimal + '# extra=1\n')
    reject(minimal + 'x'.repeat(OT_LOG_MAX_BYTES))
  })
  it('accepts CRLF line endings from card readers that rewrite text', () => {
    expect(parseOtLog(minimal.replace(/\n/g, '\r\n')).summary.records).toBe(1)
  })
})
