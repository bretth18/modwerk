import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { loadBuilderPreservation } from './builder-preservation.mjs'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'modwerk-builder-proof.'))
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  const write = (path, value) => { mkdirSync(resolve(root, path, '..'), { recursive: true }); writeFileSync(resolve(root, path), typeof value === 'string' ? value : JSON.stringify(value)) }
  const catalog = ids => ({ modules: ids.map(id => ({ id })) })
  write('sdk/catalog.json', catalog(['old', 'other']))
  write('src/engine/fixture.ts', 'old builder')
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid'); git('add', '.'); git('commit', '-qm', 'Approved fixture')
  const base = git('rev-parse', 'HEAD')
  write('sdk/catalog.json', catalog(['old', 'other', 'new']))
  write('src/engine/fixture.ts', 'extended builder')
  const image = { bytes: 100, osSha256: 'a'.repeat(64) }
  const record = { schemaVersion: 1, baseCommit: base, originalOsSha256: 'b'.repeat(64), addedModuleIds: ['new'], moduleIds: ['old', 'other'], changes: { 'src/engine/fixture.ts': { before: sha('old builder'), after: sha('extended builder') } }, selections: ['old', 'other', 'old+other'].flatMap(ids => [false, true].map(keepStockFx2 => ({ moduleIds: ids.split('+'), keepStockFx2, before: { ...image }, after: { ...image } }))) }
  const save = () => write('sdk/builder-preservation/new.json', record)
  save()
  return { root, base, record, write, save, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}
describe('exact builder preservation records', () => {
  it('covers only exact source transitions and named additive modules', async () => {
    const f = fixture()
    try {
      const proof = await loadBuilderPreservation(f.root, f.base, 'old')
      expect(proof.addedModuleIds).toEqual(['new'])
      expect(proof.matchesFile(Buffer.from('old builder'), Buffer.from('extended builder'), 'src/engine/fixture.ts')).toBe(true)
      expect(proof.matchesFile(Buffer.from('old builder'), Buffer.from('another builder'), 'src/engine/fixture.ts')).toBe(false)
      expect(proof.matchesFile(null, Buffer.from('extended builder'), 'src/engine/unreviewed.ts')).toBe(false)
      expect(await loadBuilderPreservation(f.root, f.base, 'uncovered')).toBeNull()
    } finally { f.cleanup() }
  })
  for (const [name, change] of [
    ['a later source edit', f => f.write('src/engine/fixture.ts', 'later edit')],
    ['a changed native image', f => { f.record.selections[0].after.osSha256 = 'c'.repeat(64) }],
    ['a missing stock-mode case', f => { f.record.selections.splice(0, 1) }],
    ['an undeclared added module', f => f.write('sdk/catalog.json', { modules: [{ id: 'old' }, { id: 'other' }, { id: 'new' }, { id: 'extra' }] })],
    ['a missing native result', f => { delete f.record.selections[0].before }],
    ['an unsafe source path', f => { f.record.changes['../outside.ts'] = f.record.changes['src/engine/fixture.ts'] }],
    ['duplicate coverage', f => { f.record.selections[1] = f.record.selections[0] }],
    ['a refused build replacing a successful image', f => { f.record.selections[0].after = { refused: 'collision' } }],
  ]) it('refuses ' + name, async () => {
    const f = fixture()
    try { change(f); f.save(); await expect(loadBuilderPreservation(f.root, f.base, 'old')).rejects.toThrow('Invalid or stale') } finally { f.cleanup() }
  })
})
