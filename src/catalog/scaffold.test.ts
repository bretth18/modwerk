import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { parseModuleDocument } from './module-contract'

describe('SDK developer scaffolds', () => {
  it('creates coherent DSP and CPU declarations with author attribution and a failing qualification gate', () => {
    const output = mkdtempSync(resolve(tmpdir(), 'octamod-scaffold-test.'))
    try {
      for (const kind of ['dsp', 'coldfire']) {
        const id = 'proof-' + kind
        execFileSync(process.execPath, ['scripts/scaffold-module.mjs', id, '--kind', kind, '--author', 'example-author', '--output', output])
        const folder = resolve(output, id)
        const doc = parseModuleDocument(JSON.parse(readFileSync(resolve(folder, 'octamod.module.json'), 'utf8')))
        expect(doc.id).toBe(id)
        expect(doc.author.github).toBe('example-author')
        expect(doc.tests.hardwareStatus).toBe('untested')
        const native = readFileSync(resolve(folder, 'manifest.py'), 'utf8')
        expect(native).toContain('author="example-author"')
        expect(native).toContain('proof=Proof.UNTESTED')
        expect(native).toContain('modules/' + id + '/verify.py')
        expect(native).not.toContain('verify_template.py')
        for (const file of ['README.md', 'TESTING.md', 'LICENSE', kind === 'dsp' ? 'engine.asm' : 'unit.s']) expect(existsSync(resolve(folder, file))).toBe(true)
        const python = process.platform === 'win32' ? 'python' : 'python3'
        const gate = spawnSync(python, [resolve(folder, 'verify.py')], { encoding: 'utf8' })
        expect(gate.status).not.toBe(0)
        expect(gate.stderr).toContain('Untested development scaffold')
        const retry = spawnSync(process.execPath, ['scripts/scaffold-module.mjs', id, '--author', 'example-author', '--output', output], { encoding: 'utf8' })
        expect(retry.status).not.toBe(0)
        expect(retry.stderr).toContain('refusing to replace')
      }
      const unsafe = spawnSync(process.execPath, ['scripts/scaffold-module.mjs', '../escape', '--author', 'example-author', '--output', output], { encoding: 'utf8' })
      expect(unsafe.status).not.toBe(0)
      expect(existsSync(resolve(output, 'escape'))).toBe(false)
    } finally { rmSync(output, { recursive: true, force: true }) }
  })
})
