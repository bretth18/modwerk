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

  it('rejects what is not a record', () => {
    expect(judgeRecord(null)[0].state).toBe('fail')
    expect(judgeRecord({ schema: 1, kind: 'nope' })[0].state).toBe('fail')
    expect(audit('check').status).toBe(2)
  })
})
