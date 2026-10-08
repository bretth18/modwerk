import { describe, expect, it } from 'vitest'
import { authorizeAuthorUpdate, type AuthorChange } from './author-updates'
const registry = { schemaVersion: 1 as const, accounts: { irpina: 264014615 } }, author = { login: 'irpina', id: 264014615, type: 'User' }
const folder = 'sdk/digitakt/modules/digihealth', document = { id: 'digihealth', machine: 'digitakt', version: '1.1.0-experimental', author: { github: 'irpina' }, maintainers: ['irpina'], license: { spdx: 'MIT' }, source: { repository: 'https://github.com/irpina/digihealth', revision: 'c'.repeat(40) } }, next = { ...document, version: '1.1.1-experimental' }
const modules = [{ folder, document }]
const pin = { id: 'digihealth', device: 'digitakt-mk1', os: '1.54', version: document.version, file: 'digihealth.elemod', sha256: 'old', license: 'MIT', author: 'irpina', requires: ['core'], source: { repo: 'irpina/digihealth', commit: document.source.revision, path: 'digihealth.elemod' } }
const other = { ...pin, id: 'digislicer', file: 'digislicer.elemod' }
const catalog = { schema: 1, kind: 'elekloader-catalog', revision: 'a'.repeat(40), cores: [{ id: 'core', file: 'core.elemod' }], mods: [pin, other] }
const lock = { schema: 1, kind: 'elekloader-kit-lock', kit: { files: { 'index.ts': 'fixed' } }, catalog: { revision: catalog.revision, sha256: 'old', cores: 1, mods: 2 } }
const artifact = { elemod: 2, id: 'digihealth', version: pin.version, license: 'MIT', author: 'irpina', target: { device: pin.device, os: pin.os, section3_sha256: 'stock' }, sections: { '.run': { parts: [['hex', 'old']] } } }
const vendor = { catalog, lock, artifacts: { 'digihealth.elemod': artifact } }
const change = (path: string, before: unknown, after: unknown): AuthorChange => ({ path, before: JSON.stringify(before), after: JSON.stringify(after), regular: true })
function edits() {
  return [change(folder + '/modwerk.module.json', document, next), change(folder + '/source.c', 'old', 'new'),
    change('vendor/elekloader/catalog/catalog.json', catalog, { ...catalog, revision: 'b'.repeat(40), mods: [{ ...pin, version: next.version, sha256: 'new' }, other] }),
    change('vendor/elekloader/elekloader.lock.json', lock, { ...lock, catalog: { ...lock.catalog, revision: 'b'.repeat(40), sha256: 'new' } }),
    change('vendor/elekloader/catalog/digihealth.elemod', artifact, { ...artifact, version: next.version, sections: { '.run': { parts: [['hex', 'new']] } } })]
}
describe('authored Digi packages', () => {
  it('permits the author package and matching catalog/lock, with common kit and other modules frozen', () => expect(authorizeAuthorUpdate(registry, author, modules, edits(), vendor)).toMatchObject({ vendorPackages: true, modules: ['digitakt-digihealth'] }))
  it('rejects relabelling a version without shipping its package', () => expect(() => authorizeAuthorUpdate(registry, author, modules, edits().slice(0, -1), vendor)).toThrow('updated elekloader package'))
  it('requires every approved OS variant rather than updating one while serving another old version', () => {
    const variant = { ...pin, os: '1.53', file: 'digihealth-153.elemod' }
    const original = { ...catalog, mods: [pin, variant, other] }
    const changed = edits().map(edit => edit.path.endsWith('/catalog.json') ? change(edit.path, original, { ...original, revision: 'b'.repeat(40), mods: [{ ...pin, version: next.version, sha256: 'new' }, variant, other] }) : edit)
    expect(() => authorizeAuthorUpdate(registry, author, modules, changed, { ...vendor, catalog: original })).toThrow('every approved OS package')
  })
  it('does not let a package for one module cover another touched module', () => {
    const second = { folder: 'sdk/digitakt/modules/another', document: { ...document, id: 'another' } }
    const changed = [...edits(), change(second.folder + '/modwerk.module.json', second.document, { ...second.document, version: next.version })]
    expect(() => authorizeAuthorUpdate(registry, author, [...modules, second], changed, vendor)).toThrow('Every released Digi module')
  })
  it('rejects floating or mismatched package source pins', () => {
    for (const source of [{ repo: pin.source.repo, tag: 'v1.1' }, { ...pin.source, commit: 'd'.repeat(40) }, { ...pin.source, repo: 'attacker/fork' }]) {
      const changed = edits().map(edit => edit.path.endsWith('/catalog.json') ? change(edit.path, catalog, { ...catalog, revision: 'b'.repeat(40), mods: [{ ...pin, version: next.version, source }, other] }) : edit)
      expect(() => authorizeAuthorUpdate(registry, author, modules, changed, vendor)).toThrow('exact updated module source commit')
    }
  })
  it('rejects a changed core, kit, other module, stock target or package owner', () => {
    for (const [path, after] of [
      ['vendor/elekloader/catalog/catalog.json', { ...catalog, mods: [{ ...pin, version: next.version }, { ...other, sha256: 'tampered' }] }],
      ['vendor/elekloader/elekloader.lock.json', { ...lock, kit: { files: { 'index.ts': 'tampered' } } }],
      ['vendor/elekloader/catalog/digihealth.elemod', { ...artifact, version: next.version, target: { ...artifact.target, os: 'unknown' } }],
      ['vendor/elekloader/catalog/digihealth.elemod', { ...artifact, version: next.version, author: 'attacker' }],
    ] as const) expect(() => authorizeAuthorUpdate(registry, author, modules, edits().map(edit => edit.path === path ? { ...edit, after: JSON.stringify(after) } : edit), vendor)).toThrow()
  })
})
