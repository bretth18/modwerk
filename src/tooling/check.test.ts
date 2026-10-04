import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const runner = fileURLToPath(new URL('../../scripts/check.mjs', import.meta.url))

function check(failure = '', buildOnly = false) {
  const folder = mkdtempSync(join(tmpdir(), 'octamod-check-test.'))
  const log = join(folder, 'scripts.log')
  const npm = join(folder, 'npm.mjs')
  writeFileSync(npm, `
    import { appendFileSync } from 'node:fs'
    const name = process.argv[3]
    appendFileSync(process.env.CHECK_TEST_LOG, name + '\\n')
    process.exitCode = process.env.CHECK_TEST_FAIL === name ? 1 : 0
  `)
  try {
    const result = spawnSync(process.execPath, [runner, ...(buildOnly ? ['--build'] : [])], {
      encoding: 'utf8',
      env: { ...process.env, npm_execpath: npm, CHECK_TEST_LOG: log, CHECK_TEST_FAIL: failure },
    })
    return { ...result, scripts: readFileSync(log, 'utf8').trim().split('\n') }
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}

it('rejects a stale catalog before generation or any dependent check can run', () => {
  const result = check('modules:check')
  expect(result.status).toBe(1)
  expect(result.scripts).toEqual(['licenses:check', 'machines:check', 'modules:check'])
})

it('keeps every independent check mandatory and waits for all their results', () => {
  for (const failure of ['sdk:check', 'lint', 'test', 'build:bundle', '']) {
    const result = check(failure)
    expect(result.status).toBe(failure ? 1 : 0)
    expect(result.scripts.slice(0, 7)).toEqual(['licenses:check', 'machines:check', 'modules:check', 'elekloader:check', 'licenses:generate', 'machines:generate', 'modules:generate'])
    expect(result.scripts.slice(7).sort()).toEqual(['build:bundle', 'lint', 'sdk:check', 'test', 'typecheck'])
    expect(result.scripts.indexOf('build:bundle')).toBeGreaterThan(result.scripts.indexOf('typecheck'))
  }
})

it('prevents bundling on a type error while finishing the other checks', () => {
  const result = check('typecheck')
  expect(result.status).toBe(1)
  expect(result.scripts).not.toContain('build:bundle')
  expect(result.scripts).toContain('test')
  expect(result.scripts).toContain('lint')
  expect(result.scripts).toContain('sdk:check')
})

it('builds through the same generation, typecheck and bundling gates', () => {
  const result = check('', true)
  expect(result.status).toBe(0)
  expect(result.scripts).toEqual(['licenses:generate', 'machines:generate', 'modules:generate', 'typecheck', 'build:bundle'])
  const failure = check('modules:generate', true)
  expect(failure.status).toBe(1)
  expect(failure.scripts).toEqual(['licenses:generate', 'machines:generate', 'modules:generate'])
})

it('rejects stale licence notices before generation can overwrite them', () => {
  const result = check('licenses:check')
  expect(result.status).toBe(1)
  expect(result.scripts).toEqual(['licenses:check'])
  const failure = check('licenses:generate', true)
  expect(failure.status).toBe(1)
  expect(failure.scripts).toEqual(['licenses:generate'])
})
