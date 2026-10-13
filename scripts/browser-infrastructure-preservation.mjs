// One owner-reviewed legacy-worker preservation binding, never new hardware evidence.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, readdir, lstat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { PACKAGE_FILES } from './module-source.mjs'
import { engineAsset, otherModuleIds } from './engine-asset.mjs'

export const BROWSER_PRESERVATION_PATH = 'sdk/browser-infrastructure-preservation/tapeecho-usb-integration.json'
export const BROWSER_PARITY_PATH = 'sdk/browser-infrastructure-preservation/tapeecho-usb-integration-proof.json'
export const BROWSER_PARITY_RUNNER = 'scripts/verify-tapeecho-browser-parity.mjs'
const evidence = '32ac46b0c7e8c11e48ebc41674695e033142b46e'
const originalOs = '34695b606eb00e1b4dded5fd0c4b66f3a460522a632e47d7416dbd220599e1ad'
const prefixes = ['sdk/octabam/platform', 'sdk/octabam/dsp', 'sdk/octabam/tools/build', 'sdk/octabam/tools/remix', 'src/engine', 'scripts/build-module-packages.py', 'scripts/module-source.mjs']
const allowed = ['src/engine/client.ts', 'src/engine/protocol.ts', 'src/engine/session.ts', 'src/engine/elekloader/digi-build.ts',
  ...['machine-build', 'module-set', 'octatrack-base', 'octatrack-link', 'selftest', 'upload-session', 'upload-usb', 'upload-wire'].map(name => 'src/engine/elekloader/' + name + '.ts'),
  ...['octatrack-base-fills.json', 'octatrack-base-sources.json', 'octatrack-base.elemod', 'octatrack-module-packages.json'].map(name => 'src/engine/assets/' + name)].sort()
const profiles = [['tapeecho'], ['tapeecho', 'repitch'], ['tapeecho', 'tapehead'], ['tapeecho', 'miniverb', 'euclid', 'repitch'], ['tapeecho', 'sidechain-compressor', 'analog-bassdrum'], ['tapeecho', 'miniverb', 'euclid', 'repitch', 'tapehead', 'sidechain-compressor']]
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const commit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value)
const object = value => !!value && typeof value === 'object' && !Array.isArray(value)
const keys = (value, expected) => object(value) && isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort())
const sorted = value => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
export const browserProtectedInputsSha256 = value => sha(JSON.stringify(sorted(value)) + '\n')
const git = (root, ...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
const ignored = path => /(^|\/)(__pycache__|\.DS_Store)(\/|$)|\.pyc$/.test(path) || path.endsWith('.test.ts') || path.startsWith('src/engine/test-fixtures/')
const fail = () => { throw new Error('Invalid or stale Tape Echo browser preservation binding; full qualification is required') }

// The existing retention scope is preserved, including its test/cache exclusions.
// Raw hashes here deliberately do not replace retainedInfrastructureSha256's JSON normalization.
export async function browserProtectedInputs(root, ref) {
  const out = {}
  if (ref) {
    const rows = git(root, 'ls-tree', '-rz', ref, '--', ...prefixes).toString().split('\0').filter(Boolean).map(row => {
      const tab = row.indexOf('\t'), [mode, type, id] = row.slice(0, tab).split(' '), path = row.slice(tab + 1)
      if (ignored(path)) return null
      if (type !== 'blob' || !['100644', '100755'].includes(mode)) fail()
      return { id, path }
    }).filter(Boolean)
    if (!rows.length) fail()
    const blobs = execFileSync('git', ['cat-file', '--batch'], { cwd: root, input: rows.map(row => row.id).join('\n') + '\n', maxBuffer: 32 * 1024 * 1024 })
    let offset = 0
    for (const row of rows) {
      const end = blobs.indexOf(10, offset), header = blobs.toString('ascii', offset, end).split(' '), size = Number(header[2])
      if (end < offset || header[0] !== row.id || header[1] !== 'blob' || !Number.isSafeInteger(size) || size < 0 || end + size + 2 > blobs.length || blobs[end + size + 1] !== 10) fail()
      out[row.path] = sha(blobs.subarray(end + 1, end + size + 1)); offset = end + size + 2
    }
  } else {
    async function walk(path) {
      if (ignored(path)) return
      const info = await lstat(resolve(root, path))
      if (info.isSymbolicLink()) fail()
      if (info.isDirectory()) for (const entry of await readdir(resolve(root, path))) await walk(path + '/' + entry)
      else if (info.isFile()) out[path] = sha(await readFile(resolve(root, path)))
      else fail()
    }
    for (const prefix of prefixes) await walk(prefix)
  }
  return sorted(out)
}
async function fixedBytes(root, path) {
  const parts = path.split('/')
  for (let i = 1; i < parts.length; i++) {
    const parent = await lstat(resolve(root, ...parts.slice(0, i)))
    if (!parent.isDirectory() || parent.isSymbolicLink()) fail()
  }
  const info = await lstat(resolve(root, path)); if (!info.isFile() || info.isSymbolicLink()) fail()
  return readFile(resolve(root, path))
}
function canonicalJson(bytes) {
  // Canonical pretty JSON also rejects duplicate keys without silently accepting the last value.
  const value = JSON.parse(bytes.toString('utf8'))
  if (bytes.toString('utf8') !== JSON.stringify(value, null, 2) + '\n') fail()
  return value
}
async function fixedJson(root, path) {
  const bytes = await fixedBytes(root, path)
  return { bytes, value: canonicalJson(bytes) }
}
// JSON.parse keeps the last of two equal keys, which would hide an ambiguous file.
function hasDuplicateKeys(source) {
  const stack = []
  for (const [token] of source.matchAll(/"(?:[^"\\]|\\.)*"|[{}[\],:]|[^\s"{}[\],:]+/g)) {
    const top = stack[stack.length - 1]
    if (token === '{') stack.push({ keys: new Set(), key: true })
    else if (token === '[') stack.push(null)
    else if (token === '}' || token === ']') stack.pop()
    else if (token === ',' && top) top.key = true
    else if (top?.key && token[0] === '"') { if (top.keys.has(token)) return true; top.keys.add(token); top.key = false }
  }
  return false
}
// Release import/stamping changes only provenance already excluded by retained
// evidence. Pin all package contents and qualification fields to the actual
// validated Git bytes; derived manifest hashes must match the live files. Another
// module's own release may also add or change its rows in these shared packages:
// they are not Tape Echo inputs, so the comparison ignores them exactly as the
// retained-evidence comparison does, and every other byte must still match.
async function publicationInputs(root, validatedCommit, validated, current, document) {
  const result = { ...current }, head = git(root, 'rev-parse', 'HEAD').toString().trim(), others = await otherModuleIds(root, document, validatedCommit)
  for (const name of [...PACKAGE_FILES, 'module-build.json', 'analog-bd-composition-proofs.json']) {
    const path = 'src/engine/assets/' + name
    if (current[path] === validated[path]) continue
    if (!current[path] || !validated[path]) fail()
    const expectedBytes = git(root, 'show', validatedCommit + ':' + path), liveBytes = await fixedBytes(root, path)
    const live = name === 'module-build.json' ? canonicalJson(liveBytes) : JSON.parse(liveBytes.toString('utf8')), same = bytes => JSON.stringify(engineAsset(bytes, path, document, document.version, [], others))
    if (live.sourceCommit !== head && live.sourceCommit !== JSON.parse(expectedBytes.toString('utf8')).sourceCommit) fail() // stamped now, or unchanged
    if (name === 'module-build.json') {
      if (!keys(live.files, PACKAGE_FILES) || live.approval !== null && (!object(live.approval) || live.approval.sourceCommit !== head)) fail()
      for (const file of PACKAGE_FILES) {
        const bytes = await fixedBytes(root, 'src/engine/assets/' + file), entry = live.files[file]
        if (!keys(entry, ['bytes', 'sha256']) || entry.bytes !== bytes.length || entry.sha256 !== sha(bytes)) fail()
      }
    } else {
      // Preserve Python's original numeric-key ordering as well as payload bytes
      // for a pure provenance stamp; only another module's rows may reorder them.
      const expectedLine = /^ {2}"sourceCommit": (null|"[a-f0-9]{40}"),$/m.exec(expectedBytes.toString('utf8'))?.[0]
      const sourceLine = '  "sourceCommit": ' + JSON.stringify(head) + ','
      if (expectedLine && liveBytes.toString('utf8').replace(sourceLine, expectedLine) === expectedBytes.toString('utf8')) { result[path] = validated[path]; continue }
      if (hasDuplicateKeys(liveBytes.toString('utf8'))) fail()
    }
    if (same(liveBytes) !== same(expectedBytes)) fail()
    result[path] = validated[path]
  }
  return sorted(result)
}
function image(value) {
  return keys(value, ['bytes', 'sha256', 'reportSha256']) && Number.isSafeInteger(value.bytes) && value.bytes > 0 && hash(value.sha256) && hash(value.reportSha256)
}
function parity(value, record) {
  if (!keys(value, ['schemaVersion', 'method', 'beforeCommit', 'afterCommit', 'moduleVersion', 'originalOsSha256', 'runnerSha256', 'hardware', 'inputUnchanged', 'bundles', 'selections', 'completeUpgrade', 'guards']) || value.schemaVersion !== 1 || value.method !== 'executed-legacy-worker-parity' || value.beforeCommit !== record.approvedMain || value.afterCommit !== record.validatedCommit || value.moduleVersion !== '0.1.3-experimental' || value.originalOsSha256 !== originalOs || value.runnerSha256 !== record.proof.runnerSha256 || value.hardware !== false || value.inputUnchanged !== true) fail()
  if (!keys(value.bundles, ['before', 'after']) || !hash(value.bundles.before) || !hash(value.bundles.after) || !Array.isArray(value.selections) || value.selections.length !== 24) fail()
  const wanted = new Set(profiles.flatMap(ids => [false, true].flatMap(stock => [false, true].map(beta => ids.join('+') + ':' + stock + ':' + beta))))
  for (const row of value.selections) {
    if (!keys(row, ['moduleIds', 'keepStockFx2', 'betaAccess', 'before', 'after']) || !Array.isArray(row.moduleIds) || typeof row.keepStockFx2 !== 'boolean' || typeof row.betaAccess !== 'boolean' || !image(row.before) || !image(row.after) || !isDeepStrictEqual(row.before, row.after)) fail()
    if (!wanted.delete(row.moduleIds.join('+') + ':' + row.keepStockFx2 + ':' + row.betaAccess)) fail()
  }
  if (wanted.size || !keys(value.completeUpgrade, ['before', 'after']) || !image(value.completeUpgrade.before) || !image(value.completeUpgrade.after) || !isDeepStrictEqual(value.completeUpgrade.before, value.completeUpgrade.after)) fail()
  const guards = { clearRefused: true, modifiedUpgradeRefused: true, failedInspectionLeavesNoBase: true }
  if (!keys(value.guards, ['before', 'after']) || !isDeepStrictEqual(value.guards.before, guards) || !isDeepStrictEqual(value.guards.after, guards)) fail()
}

export async function validateBrowserPreservationBinding(root, approvedRef, document, record, reportBytes) {
  const retained = document.tests?.retainedEvidence
  if (document.id !== 'tapeecho' || document.version !== '0.1.3-experimental' || retained?.commit !== evidence || retained.moduleVersion !== '0.1.2-experimental') fail()
  try {
    if (!keys(record, ['schemaVersion', 'retainedModule', 'evidenceCommit', 'evidenceModuleVersion', 'approvedMain', 'validatedCommit', 'originalOsSha256', 'changes', 'protectedInputHashes', 'protectedInputsSha256', 'approvedProtectedInputsSha256', 'proof']) || record.schemaVersion !== 1 || record.retainedModule !== 'tapeecho@0.1.3-experimental' || record.evidenceCommit !== evidence || record.evidenceModuleVersion !== retained.moduleVersion || record.originalOsSha256 !== originalOs || !commit(record.approvedMain) || !commit(record.validatedCommit) || record.approvedMain === record.validatedCommit || !keys(record.proof, ['reportSha256', 'runnerSha256']) || !hash(record.proof.reportSha256) || !hash(record.proof.runnerSha256)) fail()
    // The original evidence and reviewed main are approved history. A proof snapshot
    // must be an actual ancestor of this candidate, never a prospective overlay.
    git(root, 'merge-base', '--is-ancestor', evidence, record.approvedMain)
    git(root, 'merge-base', '--is-ancestor', record.approvedMain, approvedRef)
    git(root, 'merge-base', '--is-ancestor', record.approvedMain, record.validatedCommit)
    git(root, 'merge-base', '--is-ancestor', record.validatedCommit, 'HEAD')
    const before = await browserProtectedInputs(root, record.approvedMain), validated = await browserProtectedInputs(root, record.validatedCommit), current = await publicationInputs(root, record.validatedCommit, validated, await browserProtectedInputs(root), document)
    if (!object(record.protectedInputHashes) || Object.values(record.protectedInputHashes).some(value => !hash(value)) || !isDeepStrictEqual(sorted(record.protectedInputHashes), current) || !isDeepStrictEqual(validated, current) || record.protectedInputsSha256 !== browserProtectedInputsSha256(current) || record.approvedProtectedInputsSha256 !== browserProtectedInputsSha256(before) || !keys(record.changes, allowed)) fail()
    const changed = [...new Set([...Object.keys(before), ...Object.keys(current)])].filter(path => before[path] !== current[path]).sort()
    if (!isDeepStrictEqual(changed, allowed)) fail()
    for (const path of allowed) if (!keys(record.changes[path], ['before', 'after']) || record.changes[path].before !== (before[path] ?? null) || record.changes[path].after !== current[path]) fail()
    if (sha(await fixedBytes(root, BROWSER_PARITY_RUNNER)) !== record.proof.runnerSha256 || sha(git(root, 'show', record.validatedCommit + ':' + BROWSER_PARITY_RUNNER)) !== record.proof.runnerSha256 || sha(reportBytes) !== record.proof.reportSha256) fail()
    parity(canonicalJson(reportBytes), record)
    return { matchesFile(beforeBytes, afterBytes, path) {
      const change = record.changes[path]
      return !!change && (beforeBytes ? sha(beforeBytes) : null) === change.before && (afterBytes ? sha(afterBytes) : null) === change.after
    } }
  } catch { fail() }
}

export async function loadBrowserInfrastructurePreservation(root, approvedRef, document) {
  const retained = document.tests?.retainedEvidence
  if (document.id !== 'tapeecho' || document.version !== '0.1.3-experimental' || retained?.commit !== evidence || retained.moduleVersion !== '0.1.2-experimental') return null
  try { await lstat(resolve(root, BROWSER_PRESERVATION_PATH)) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
  try {
    const { value: record } = await fixedJson(root, BROWSER_PRESERVATION_PATH)
    return await validateBrowserPreservationBinding(root, approvedRef, document, record, await fixedBytes(root, BROWSER_PARITY_PATH))
  } catch { fail() }
}
