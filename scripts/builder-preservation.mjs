// A builder extension can retain earlier module evidence only when the old
// source and all old package payloads remain unchanged and native before/after
// builds match. The record binds exact shared-source bytes, never a hardware pass.
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const json = async path => JSON.parse(await readFile(path, 'utf8'))
export async function loadBuilderPreservation(root, approvedRef, moduleId) {
  const folder = resolve(root, 'sdk/builder-preservation')
  let names
  try { names = await readdir(folder) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
  const catalog = await json(resolve(root, 'sdk/catalog.json'))
  for (const name of names.filter(name => name.endsWith('.json')).sort()) {
    const record = await json(resolve(folder, name))
    if (!Array.isArray(record.moduleIds) || !record.moduleIds.includes(moduleId)) continue
    const fail = () => { throw new Error('Invalid or stale builder preservation record: ' + name) }
    if (record.schemaVersion !== 1 || !/^[a-f0-9]{40}$/.test(record.baseCommit) || !hash(record.originalOsSha256) || !Array.isArray(record.addedModuleIds) || !record.addedModuleIds.length || !record.changes || typeof record.changes !== 'object' || Array.isArray(record.changes) || !Object.keys(record.changes).length || !Array.isArray(record.selections)) fail()
    if (new Set(record.moduleIds).size !== record.moduleIds.length || new Set(record.addedModuleIds).size !== record.addedModuleIds.length) fail()
    try { execFileSync('git', ['merge-base', '--is-ancestor', record.baseCommit, approvedRef], { cwd: root, stdio: 'ignore' }) } catch { fail() }
    const previous = JSON.parse(execFileSync('git', ['show', record.baseCommit + ':sdk/catalog.json'], { cwd: root, encoding: 'utf8' }))
    const added = catalog.modules.filter(module => !previous.modules.some(old => old.id === module.id)).map(module => module.id)
    if (JSON.stringify(added) !== JSON.stringify(record.addedModuleIds) || record.moduleIds.some(id => added.includes(id) || !previous.modules.some(module => module.id === id))) fail()
    for (const [path, change] of Object.entries(record.changes)) {
      if (!/^(src\/engine\/.+\.ts|sdk\/octabam\/tools\/remix\/.+\.py|scripts\/build-module-packages\.py)$/.test(path) || path.includes('..') || !change || typeof change !== 'object' || !hash(change.after) || !(change.before === null || hash(change.before))) fail()
      const current = await readFile(resolve(root, path)).catch(() => null)
      if (!current || sha(current) !== change.after) fail()
      let original = null
      try { original = execFileSync('git', ['show', record.baseCommit + ':' + path], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }) } catch { /* A new shared helper has no earlier source. */ }
      if ((original ? sha(original) : null) !== change.before) fail()
    }
    const keys = new Set()
    for (const row of record.selections) {
      if (!row || !row.before || !row.after || typeof row.before !== 'object' || typeof row.after !== 'object' || !Array.isArray(row.moduleIds) || !row.moduleIds.length || new Set(row.moduleIds).size !== row.moduleIds.length || row.moduleIds.some(id => !record.moduleIds.includes(id)) || typeof row.keepStockFx2 !== 'boolean') fail()
      const key = [...row.moduleIds].sort().join('+') + ':' + row.keepStockFx2
      if (keys.has(key)) fail(); keys.add(key)
      if (row.before.refused !== undefined) {
        if (typeof row.before.refused !== 'string' || !row.before.refused || row.before.refused !== row.after.refused || row.before.osSha256 !== undefined || row.after.osSha256 !== undefined || row.before.bytes !== undefined || row.after.bytes !== undefined) fail()
      } else if (row.after.refused !== undefined || !hash(row.before.osSha256) || row.before.osSha256 !== row.after.osSha256 || !Number.isSafeInteger(row.before.bytes) || row.before.bytes <= 0 || row.before.bytes !== row.after.bytes) fail()
    }
    for (const id of record.moduleIds) for (const stock of [false, true]) if (!keys.has(id + ':' + stock)) fail()
    if (record.selections.length < 2 * record.moduleIds.length + 2 || !record.moduleIds.includes(moduleId)) fail()
    return { addedModuleIds: added, matchesFile(before, after, path) {
      const change = record.changes[path]
      return !!change && (before ? sha(before) : null) === change.before && (after ? sha(after) : null) === change.after
    } }
  }
  return null
}
