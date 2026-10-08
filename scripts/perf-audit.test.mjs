import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { judgeRecord, selfTest, templateRecord } from './perf-audit-analysis.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const audit = (...args) => spawnSync(process.execPath, ['scripts/perf-audit.mjs', ...args], { cwd: root, encoding: 'utf8' })

describe('perf audit', () => {
  it('proves its judgement on known-good and known-bad records', () => {
    for (const row of selfTest()) expect(row.ok, row.name + ': ' + row.detail).toBe(true)
    expect(audit('selftest').status).toBe(0)
  })

  it('refuses the unfilled template and says what to run', () => {
    const dir = mkdtempSync(join(tmpdir(), 'perf-audit-'))
    try {
      const file = join(dir, 'performance.json')
      writeFileSync(file, audit('template', 'coldfire').stdout)
      const result = audit('check', file)
      expect(result.status).toBe(1)
      expect(result.stdout).toContain('cfmeter.py')
      expect(judgeRecord(templateRecord('dsp')).filter(line => line.state === 'fail').length).toBe(3)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  const dspRecord = (measured, stock = {}) => ({
    ...templateRecord('dsp'), module: 'budget-demo', version: '0.1.0',
    cycles: { unit: 'instructions/sample', static: 924, measured, instancesPerCore: 2, method: 'Matched DSP-host worst case on both cores, null overhead removed' },
    stock: { comparator: 'DARK REV', comparatorWorst: 193.25, dearestWorst: 293.375, stockSha256: 'a'.repeat(64), justification: '', ...stock },
    stress: { instancesPerCore: 2, tracks: 8, lfosPerTrack: 3, lockedSlots: 15, seconds: 30, guard: true, dirty: true, clobbers: 0, hangs: 0 },
  })
  const stockRow = (record, options) => judgeRecord(record, options).find(row => row.name === 'stock benchmark')
  const justification = 'Stereo reverb with pitch-shifted feedback, antialias filters and smoothed controls.'

  it('rejects Shimmer-level cost even with a justification and passing load checks', () => {
    const record = dspRecord(806.625, { justification, ownerAcceptance: 'pending first-release review' })
    expect(judgeRecord(record).filter(row => row.state === 'fail').map(row => row.name)).toEqual(['stock benchmark'])
    expect(stockRow(record).detail).toContain('stock DSP cost ceiling')
    expect(stockRow(record).fix).toContain('optimize the FX')
    const dir = mkdtempSync(join(tmpdir(), 'perf-audit-'))
    try {
      const file = join(dir, 'performance.json')
      writeFileSync(file, JSON.stringify(record))
      const result = audit('check', file, '--ratio-fail', '100')
      expect(result.status).toBe(1)
      expect(result.stdout).toContain('a written justification does not waive the budget')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('accepts the stock ceiling and rejects a cost just above it', () => {
    expect(stockRow(dspRecord(293.375)).state).not.toBe('fail')
    expect(stockRow(dspRecord(293.4375, { justification })).state).toBe('fail')
  })

  it('cannot excuse excess per-instance cost by supporting fewer instances', () => {
    const record = dspRecord(806.625, { justification })
    record.cycles.instancesPerCore = 1
    expect(stockRow(record).state).toBe('fail')
    expect(stockRow(record, { ratioFail: 100 }).state).toBe('fail')
  })

  it('allows a justified expensive counterpart ratio within the worst stock cost', () => {
    const record = dspRecord(280, { comparator: 'FILTER', comparatorWorst: 50 })
    expect(stockRow(record).state).toBe('fail')
    expect(stockRow({ ...record, stock: { ...record.stock, justification } }).state).toBe('note')
  })

  it('rejects what is not a record', () => {
    expect(judgeRecord(null)[0].state).toBe('fail')
    expect(judgeRecord({ schema: 1, kind: 'nope' })[0].state).toBe('fail')
    expect(audit('check').status).toBe(2)
  })
})
