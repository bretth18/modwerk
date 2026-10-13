import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, rmdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, it } from 'vitest'
import { verifyImportedFile } from '../../scripts/sdk-imports.mjs'

const original = Buffer.from('Original imported bytes\n')
const checksum = createHash('sha256').update(original).digest('hex')
function fixture(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'modwerk-imports.'))
  try { run(root) } finally { rmSync(root, { recursive: true, force: true }) }
}

it('allows local guide edits without rewriting their import history', () => fixture(root => {
  for (const name of ['README.md', 'TESTING.md', 'CPU.md']) {
    const path = join(root, name)
    writeFileSync(path, 'Local instructions with an audio preview.\n')
    expect(verifyImportedFile(path, checksum, root)).toBe(true)
  }
}))

it('still rejects changes to code, licences, upstream guides and archived snapshots', () => fixture(root => {
  for (const name of ['manifest.py', 'engine.s', 'LICENSE', 'LICENSE.md', 'AGENTS.md', 'upstream/README.md', 'archive/README.md', 'media/engine.py']) {
    const path = join(root, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, original)
    expect(verifyImportedFile(path, checksum, root)).toBe(false)
    writeFileSync(path, 'Changed bytes')
    expect(() => verifyImportedFile(path, checksum, root)).toThrow('checksum mismatch')
  }
}))

it('does not treat an archived or platform README as a local module guide', () => fixture(root => {
  const path = join(root, 'README.md')
  writeFileSync(path, 'Changed archive or platform guide')
  expect(() => verifyImportedFile(path, checksum, join(root, 'live-module'))).toThrow('checksum mismatch')
  expect(() => verifyImportedFile(path, checksum)).toThrow('checksum mismatch')
}))

it('requires regular, readable UTF-8 guides and valid recorded checksums', () => fixture(root => {
  const path = join(root, 'README.md')
  expect(() => verifyImportedFile(path, checksum, root)).toThrow('regular file')
  mkdirSync(path)
  expect(() => verifyImportedFile(path, checksum, root)).toThrow('regular file')
  rmdirSync(path)
  writeFileSync(path, Buffer.from([0xff]))
  expect(() => verifyImportedFile(path, checksum, root)).toThrow()
  writeFileSync(path, 'Local guide')
  expect(() => verifyImportedFile(path, 'invalid', root)).toThrow('Invalid recorded')
}))

it.skipIf(process.platform === 'win32')('rejects symlinked guides', () => fixture(root => {
  const target = join(root, 'original.txt'), path = join(root, 'README.md')
  writeFileSync(target, original)
  symlinkSync(target, path)
  expect(() => verifyImportedFile(path, checksum, root)).toThrow('regular file')
}))
