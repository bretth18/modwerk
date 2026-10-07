// Reuse reviewed evidence only when all runtime inputs remain byte-identical.
// Git objects and submitted files are read as data; native source is never evaluated.
import { createHash } from 'node:crypto'
import { requireAdditiveSynthPackages } from './synth-release.mjs'
import { execFileSync } from 'node:child_process'
import { readFile, readdir, mkdtemp, mkdir, writeFile, rm, lstat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { loadBuilderPreservation } from './builder-preservation.mjs'
import { parseModuleDocument } from '../src/catalog/module-contract.ts'
import { compareModuleVersions } from '../src/catalog/versions.ts'
import { requireModuleDocumentation } from './module-documentation.mjs'

const infrastructure = [
  'sdk/octabam/platform', 'sdk/octabam/dsp', 'sdk/octabam/tools/build',
  'sdk/octabam/tools/remix', 'src/engine',
  'scripts/build-module-packages.py', 'scripts/module-source.mjs',
]
const git = (root, ...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 })
const text = (root, ...args) => git(root, ...args).toString('utf8')
const ignored = path => /(^|\/)(__pycache__|\.DS_Store)(\/|$)|\.pyc$/.test(path)

function tree(root, commit, prefix) {
  const rows = text(root, 'ls-tree', '-rz', commit, '--', prefix).split('\0').filter(Boolean).map(row => {
    const tab = row.indexOf('\t'), [mode, type, object] = row.slice(0, tab).split(' '), path = row.slice(tab + 1)
    if (ignored(path)) return null
    if (type !== 'blob' || !['100644', '100755'].includes(mode)) throw new Error('Retained evidence requires regular files: ' + path)
    return { object, path }
  }).filter(Boolean)
  const entries = new Map()
  if (!rows.length) return entries
  // Read the whole tree in one process; one git show per file made the static
  // fast path spend most of its time starting Git.
  const blobs = execFileSync('git', ['cat-file', '--batch'], { cwd: root, input: rows.map(row => row.object).join('\n') + '\n', maxBuffer: 32 * 1024 * 1024 })
  let offset = 0
  for (const row of rows) {
    const end = blobs.indexOf(10, offset), header = blobs.toString('ascii', offset, end).split(' '), size = Number(header[2])
    if (end < offset || header[0] !== row.object || header[1] !== 'blob' || !Number.isSafeInteger(size) || size < 0 || end + size + 2 > blobs.length || blobs[end + size + 1] !== 10) throw new Error('Invalid approved Git object: ' + row.path)
    entries.set(row.path, blobs.subarray(end + 1, end + size + 1))
    offset = end + size + 2
  }
  return entries
}
async function currentFiles(folder, prefix = '') {
  const entries = new Map()
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = prefix + entry.name
    if (ignored(path)) continue
    if (entry.isSymbolicLink()) throw new Error('Retained evidence prohibits symlinks: ' + path)
    if (entry.isDirectory()) for (const [childPath, bytes] of await currentFiles(resolve(folder, entry.name), path + '/')) entries.set(childPath, bytes)
    else if (entry.isFile()) entries.set(path, await readFile(resolve(folder, entry.name)))
    else throw new Error('Retained evidence requires regular files: ' + path)
  }
  return entries
}
function runtimeFields(document) {
  // Keep resource/compatibility claims, controls, provenance, build restrictions
  // and test results. The allowlist removes only fields with no runtime effect.
  const { name, version, category, author, presentation, access, license, media, ...runtime } = document
  void name; void version; void category; void author; void presentation; void access; void license; void media
  const { retainedEvidence, summary, ...tests } = runtime.tests
  void retainedEvidence; void summary
  return { ...runtime, controls: document.controls.map(({ doc, ...control }) => { void doc; return control }), tests }
}
function editorial(path, document) {
  // Evidence, runtime data and unknown extensions are protected even inside docs/media.
  // An unmeasured metric has no measurements to freeze in the README. Its
  // unchanged declaration remains protected by runtimeFields; measured reports
  // and the original testing record still require byte-identical evidence.
  const metricReports = [document.resources.storage, document.resources.processing]
    .filter(metric => metric.source !== 'README.md' || metric.method !== 'unmeasured' || metric.value !== null)
    .map(metric => metric.source)
  const reports = new Set([document.tests.report, ...metricReports,
    ...Object.values(document.resources.impact ?? {}).flatMap(value => value?.source ? [value.source] : []),
    ...(document.tests.qualification ? [...document.tests.qualification.cycles.map(c => c.report), document.tests.qualification.memory.report, document.tests.qualification.hardware.report] : []),
    ...(document.tests.releaseWaiver ? [document.tests.releaseWaiver.report] : [])])
  if (reports.has(path)) return false
  return path === 'octamod.module.json' || path === 'README.md' || /^docs\/.*\.md$/i.test(path)
    || /^(LICENSE|LICENCE|COPYING)(\..*)?$/i.test(path)
    || /^media\/.*\.(png|jpg|jpeg|webp|svg|wav|mp3|ogg)$/i.test(path)
}
// Every catalog module other than the retained one, at the evidence commit or
// now. Their package rows and version labels are their own releases, qualified
// on their own; retained evidence freezes its module's package and shared code.
async function otherModuleIds(root, document, commit) {
  const ids = new Set()
  const catalogs = [JSON.parse(await readFile(resolve(root, 'sdk/catalog.json'), 'utf8'))]
  if (commit) catalogs.push(JSON.parse(text(root, 'show', commit + ':sdk/catalog.json')))
  for (const catalog of catalogs) for (const module of catalog.modules) ids.add(module.id)
  ids.delete(document.id)
  return [...ids]
}
function engineAsset(bytes, path, document, previousVersion, addedIds = [], otherIds = []) {
  const value = JSON.parse(bytes.toString('utf8'))
  // Rebuilt package provenance and the version label change for editorial
  // releases. Preserve every byte, address, recipe, limit and test verdict.
  delete value.sourceCommit
  const omitted = [...new Set([...addedIds, ...otherIds])]
  for (const id of omitted) if (value.moduleVersions) delete value.moduleVersions[id]
  if (value.moduleVersions?.[document.id] === document.version) value.moduleVersions[document.id] = previousVersion
  if (path === 'src/engine/assets/module-build.json') {
    delete value.approval
    delete value.sourceTreeSha256
    if (addedIds.length) delete value.compilerSha256
    delete value.files // Derived file hashes; package payloads are checked below.
    // The release independently verifies and stamps owner approval. This
    // provenance changes on every release, without changing runtime inputs.
    delete value.approval
  }
  function visit(item) {
    if (!item || typeof item !== 'object') return
    if ((item.id === document.id || item.moduleId === document.id) && item.version === document.version) item.version = previousVersion
    for (const [key, child] of Object.entries(item)) {
      if (Array.isArray(child)) item[key] = child.filter(row => !row || typeof row !== 'object' || !omitted.includes(row.moduleId ?? row.id) && !(Array.isArray(row.ids) && row.ids.some(id => omitted.includes(id))))
      visit(item[key])
    }
  }
  visit(value)
  return value
}
function sameFiles(previous, current, skip, label, compare = (a, b) => a.equals(b), preserved = () => false) {
  const paths = new Set([...previous.keys(), ...current.keys()])
  for (const path of paths) {
    if (skip(path)) continue
    const before = previous.get(path), after = current.get(path)
    if (!(before && after && compare(before, after, path)) && !preserved(before, after, path)) throw new Error(label + ': runtime, resource or evidence input changed: ' + path + '; full qualification is required')
  }
}

export async function retainedInfrastructureSha256(root, document, previousVersion, commit) {
  const values = {}, otherIds = await otherModuleIds(root, document, commit)
  for (const prefix of infrastructure) {
    let entries
    if (commit) entries = tree(root, commit, prefix)
    else {
      const info = await lstat(resolve(root, prefix))
      if (info.isSymbolicLink()) throw new Error('Infrastructure symlinks are prohibited')
      entries = info.isDirectory() ? new Map([...await currentFiles(resolve(root, prefix))].map(([path, bytes]) => [prefix + '/' + path, bytes])) : new Map([[prefix, await readFile(resolve(root, prefix))]])
    }
    for (const [path, bytes] of entries) {
      if (path.endsWith('.test.ts') || path.startsWith('src/engine/test-fixtures/')) continue
      const canonical = path.startsWith('src/engine/') && path.endsWith('.json') ? JSON.stringify(engineAsset(bytes, path, document, previousVersion, [], otherIds)) : bytes
      values[path] = createHash('sha256').update(canonical).digest('hex')
    }
  }
  return createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(values).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)))).digest('hex')
}

export async function requireRetainedEvidence(root, folder, document, baseline, waivers, qualify, options = {}) {
  const record = document.tests.retainedEvidence
  const label = document.id + '.tests.retainedEvidence'
  const approvedRef = options.approvedRef ?? 'origin/main'
  // A submitted commit is not an approval. It must already belong to the PR's
  // approved base, or origin/main for local generation and release validation.
  try { git(root, 'merge-base', '--is-ancestor', record.commit, approvedRef) }
  catch { throw new Error(label + ': evidence commit must belong to the approved main history; fetch origin/main or pass the exact PR base') }
  const prefix = 'sdk/octabam/modules/' + document.id + '/'
  const files = tree(root, record.commit, prefix)
  const previous = parseModuleDocument(JSON.parse(files.get(prefix + 'octamod.module.json')?.toString('utf8') ?? 'null'))
  if (previous.id !== document.id || previous.version !== record.moduleVersion) throw new Error(label + ': prior module/version does not match the approved commit')
  if (previous.tests.retainedEvidence) throw new Error(label + ': reference the original reviewed evidence commit, not another retained-evidence update')
  const catalog = JSON.parse(text(root, 'show', record.commit + ':sdk/catalog.json'))
  if (!catalog.modules.some(item => item.id === previous.id && item.version === previous.version)) throw new Error(label + ': evidence can only be retained from an already published catalog version')
  if (compareModuleVersions(document.version, previous.version) <= 0) throw new Error(label + ': update requires a greater module version than the tested version')
  if (!isDeepStrictEqual(runtimeFields(previous), runtimeFields(document))) throw new Error(label + ': native declarations, control values, resource claims, compatibility, provenance or test evidence changed; full qualification is required')
  const relative = new Map([...files].map(([path, bytes]) => [path.slice(prefix.length), bytes]))
  sameFiles(relative, await currentFiles(folder), path => editorial(path, previous) && editorial(path, document), label)
  const preservation = await loadBuilderPreservation(root, approvedRef, document.id)
  const otherIds = await otherModuleIds(root, document, record.commit)
  let changedInfrastructure
  for (const path of infrastructure) {
    const before = tree(root, record.commit, path)
    const after = new Map()
    try {
      // File prefixes and directory prefixes share the same comparison.
      const info = await lstat(resolve(root, path))
      if (info.isSymbolicLink()) throw new Error('symlink')
      if (info.isDirectory()) for (const [rel, bytes] of await currentFiles(resolve(root, path))) after.set(path + '/' + rel, bytes)
      else after.set(path, await readFile(resolve(root, path)))
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    try { sameFiles(before, after, file => path === 'src/engine' && (file.endsWith('.test.ts') || file.startsWith('src/engine/test-fixtures/')), label,
      (a, b, file) => path === 'src/engine' && file.endsWith('.json')
        ? isDeepStrictEqual(engineAsset(a, file, document, previous.version, preservation?.addedModuleIds, otherIds), engineAsset(b, file, document, previous.version, preservation?.addedModuleIds, otherIds))
        : a.equals(b), preservation?.matchesFile) } catch(error) { changedInfrastructure ??= error }

  }
  if (changedInfrastructure) {
    // This one reviewed additive extension keeps Euclid's original folder,
    // controls, costs and verdicts frozen. Future shared edits fail closed.
    if (document.id !== 'euclid' || document.version !== '0.1.3-experimental' || previous.version !== '0.1.2-experimental' || record.commit !== 'cb1f0a16a41902fe874b8f307dd3d9065daf6eff') throw changedInfrastructure
    const approval = JSON.parse(await readFile(resolve(root, 'sdk/synth-build-approval.json'), 'utf8'))
    const binding = approval.integration
    if (binding?.retainedModule !== 'euclid@0.1.3-experimental' || binding.evidenceCommit !== record.commit || binding.packageBase !== '1c008deb8edef2fa6b158daab5553615d60fe72f' || binding.previousInfrastructureSha256 !== await retainedInfrastructureSha256(root, document, previous.version, record.commit) || binding.currentInfrastructureSha256 !== await retainedInfrastructureSha256(root, document, previous.version)) throw changedInfrastructure
    try { git(root, 'merge-base', '--is-ancestor', binding.packageBase, approvedRef) } catch { throw changedInfrastructure }
    await requireAdditiveSynthPackages(root, binding.packageBase)
    const synthFolder = resolve(root, 'sdk/octabam/modules/synth'), synth = parseModuleDocument(JSON.parse(await readFile(resolve(synthFolder, 'octamod.module.json'), 'utf8')))
    if (await qualify(synthFolder, synth, baseline, waivers, { root }) !== 'owner-approved-experimental') throw changedInfrastructure
  }
  // Revalidate the original qualification/baseline/owner exception on its exact
  // folder. Never turn historical or waived evidence into a new hardware pass.
  const temporary = await mkdtemp(resolve(tmpdir(), 'octamod-retained-evidence.'))
  try {
    for (const [path, bytes] of relative) {
      await mkdir(dirname(resolve(temporary, path)), { recursive: true })
      await writeFile(resolve(temporary, path), bytes)
    }
    await qualify(temporary, previous, baseline, waivers)
  } finally { await rm(temporary, { recursive: true, force: true }) }
  await requireModuleDocumentation(folder, document, previous.version)
  return 'retained-evidence'
}
