// Local-only executed legacy-worker proof. Firmware stays in memory; only hashes leave it.
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, rm, lstat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { build } from 'vite'
import { browserProtectedInputs } from './browser-infrastructure-preservation.mjs'
export const parityProfiles = [['tapeecho'], ['tapeecho', 'repitch'], ['tapeecho', 'tapehead'], ['tapeecho', 'miniverb', 'euclid', 'repitch'], ['tapeecho', 'sidechain-compressor', 'analog-bassdrum'], ['tapeecho', 'miniverb', 'euclid', 'repitch', 'tapehead', 'sidechain-compressor']]
const originalOs = '34695b606eb00e1b4dded5fd0c4b66f3a460522a632e47d7416dbd220599e1ad'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
// Key order alone is canonicalized; no provenance, version or resource field is removed.
export const parityReportSha256 = value => hash(JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item))
export function parityImage(bytes, report) { return { bytes: bytes.byteLength, sha256: hash(bytes), reportSha256: parityReportSha256(report) } }
export function matchedParityImages(before, after) {
  assert.deepEqual(after, before, 'Actual worker report or output changed; preservation refused')
  return { before, after }
}
async function snapshot(root, expected) {
  assert.match(expected, /^[a-f0-9]{40}$/)
  assert.equal(git(root, 'rev-parse', 'HEAD'), expected, 'Use the exact committed snapshot')
  assert.equal(git(root, 'status', '--porcelain', '--untracked-files=all', '--', 'src', 'sdk', 'scripts', 'package.json', 'package-lock.json', 'vite.config.ts'), '', 'Commit all build inputs before the proof')
  assert.deepEqual(await browserProtectedInputs(root), await browserProtectedInputs(root, expected), 'Protected files differ from the commit')
  const doc = JSON.parse(await readFile(resolve(root, 'sdk/octabam/modules/tapeecho/octamod.module.json'), 'utf8'))
  assert.equal(doc.version, '0.1.3-experimental', 'Never relabel an older module proof')
  return expected
}
export async function verifyTapeEchoBrowserParity({ beforeRoot, beforeCommit, afterRoot, afterCommit, firmware }) {
  await snapshot(beforeRoot, beforeCommit); await snapshot(afterRoot, afterCommit)
  git(afterRoot, 'merge-base', '--is-ancestor', beforeCommit, afterCommit)
  const runner = fileURLToPath(import.meta.url), runnerSha256 = hash(await readFile(runner))
  assert.equal(hash(await readFile(resolve(afterRoot, 'scripts/verify-tapeecho-browser-parity.mjs'))), runnerSha256)
  assert.equal(hash(Buffer.from(execFileSync('git', ['show', afterCommit + ':scripts/verify-tapeecho-browser-parity.mjs'], { cwd: afterRoot }))), runnerSha256, 'Runner must be committed in the validated snapshot')
  const stock = new Uint8Array(await readFile(firmware))
  assert.equal(hash(stock), originalOs, 'Only the exact private original OS1.40C is supported')
  const temporary = await mkdtemp(resolve(tmpdir(), 'modwerk-legacy-worker-parity.'))
  try {
    const engines = []
    for (const [name, root] of [['before', beforeRoot], ['after', afterRoot]]) {
      const entry = resolve(temporary, name + '.mjs')
      await writeFile(entry, ['session.ts', 'compose-os.ts', 'elek.ts'].map((path, i) => 'export { ' + ['createEngineSession', 'composeSelection', 'decodeFirmware'][i] + ' } from ' + JSON.stringify(resolve(root, 'src/engine', path)) + ';').join('\n'))
      // No metadata overlay, plugin, alternate composer or mocked encoder.
      const bundled = await build({ configFile: false, root, logLevel: 'error', build: { ssr: entry, write: false, minify: false, sourcemap: false } })
      const chunks = bundled.output.filter(item => item.type === 'chunk')
      assert.equal(chunks.length, 1); assert.equal(chunks[0].imports.length, 0); assert.equal(chunks[0].dynamicImports.length, 0)
      const module = await import('data:text/javascript;base64,' + Buffer.from(chunks[0].code).toString('base64'))
      const replies = [], handle = module.createEngineSession(value => replies.push(value)); let id = 0
      const run = async request => { const requestId = ++id; await handle({ id: requestId, ...request }); const value = replies.findLast(value => value.id === requestId && value.type !== 'progress'); assert.ok(value); return value }
      assert.equal((await run({ type: 'inspect', buffer: stock.slice().buffer, name: 'OCTATRACK_OS1.40C.bin' })).type, 'inspection')
      engines.push({ name, module, run, bundle: hash(chunks[0].code) })
      console.log('Bundled committed ' + name + ' worker')
    }
    const report = { schemaVersion: 1, method: 'executed-legacy-worker-parity', beforeCommit, afterCommit, moduleVersion: '0.1.3-experimental', originalOsSha256: originalOs, runnerSha256, hardware: false, inputUnchanged: true, bundles: { before: engines[0].bundle, after: engines[1].bundle }, selections: [], completeUpgrade: null, guards: {} }
    const mainOs = engines[0].module.decodeFirmware(stock).mainOs
    for (const moduleIds of parityProfiles) for (const keepStockFx2 of [false, true]) for (const betaAccess of [false, true]) {
      const images = [], reports = []
      for (const engine of engines) {
        const validated = await engine.run({ type: 'validate', moduleIds, keepStockFx2, betaAccess })
        assert.equal(validated.type, 'validated', 'Every reviewed matrix selection must still validate')
        const composed = await engine.module.composeSelection(mainOs.slice(), moduleIds, keepStockFx2, undefined, betaAccess)
        images.push(parityImage(composed.bytes, validated.report)); reports.push({ report: validated.report, chooser: composed.chooser, runtime: composed.runtime })
      }
      assert.deepEqual(reports[1], reports[0], 'Validation, chooser or resource results changed')
      report.selections.push({ moduleIds, keepStockFx2, betaAccess, ...matchedParityImages(images[0], images[1]) })
      assert.equal(hash(stock), originalOs)
    }
    const upgrades = []
    for (const engine of engines) {
      console.log('Packing committed ' + engine.name + ' worker upgrade')
      const built = await engine.run({ type: 'build', moduleIds: ['tapeecho'], keepStockFx2: false, betaAccess: false })
      assert.equal(built.type, 'built'); assert.equal(hash(new Uint8Array(built.buffer)), built.sha256)
      upgrades.push(parityImage(new Uint8Array(built.buffer), built.report))
      await engine.run({ type: 'clear' })
      const cleared = await engine.run({ type: 'build', moduleIds: ['tapeecho'], keepStockFx2: false })
      assert.equal(cleared.type, 'error'); assert.match(cleared.message, /verify your base firmware/)
      const malformed = stock.slice(); malformed[malformed.length - 1] ^= 1
      const invalid = await engine.run({ type: 'inspect', buffer: malformed.buffer, name: 'OCTATRACK_OS1.40C.bin' })
      assert.equal(invalid.type, 'error'); assert.match(invalid.message, /original OS 1.40C/)
      const afterInvalid = await engine.run({ type: 'build', moduleIds: ['tapeecho'], keepStockFx2: false })
      assert.equal(afterInvalid.type, 'error'); assert.match(afterInvalid.message, /verify your base firmware/)
      report.guards[engine.name] = { clearRefused: true, modifiedUpgradeRefused: true, failedInspectionLeavesNoBase: true }
    }
    report.completeUpgrade = matchedParityImages(upgrades[0], upgrades[1])
    assert.equal(hash(stock), originalOs)
    // Check again after execution: no raced source change may be recorded as a pass.
    await snapshot(beforeRoot, beforeCommit); await snapshot(afterRoot, afterCommit)
    assert.equal(hash(await readFile(runner)), runnerSha256)
    return report
  } finally { await rm(temporary, { recursive: true, force: true }) }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [beforeRoot, beforeCommit, afterRoot, afterCommit, firmware, output] = process.argv.slice(2)
  assert.ok(beforeRoot && beforeCommit && afterRoot && afterCommit && firmware && output && process.argv.length === 8, 'Usage: node scripts/verify-tapeecho-browser-parity.mjs BEFORE_ROOT BEFORE_COMMIT AFTER_ROOT AFTER_COMMIT PRIVATE_OS_BIN STOCK_FREE_REPORT')
  try { await lstat(output); throw new Error('Proof output already exists; use a fresh path') } catch (error) { if (error.code !== 'ENOENT') throw error }
  const report = await verifyTapeEchoBrowserParity({ beforeRoot: resolve(beforeRoot), beforeCommit, afterRoot: resolve(afterRoot), afterCommit, firmware })
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  console.log('Executed parity passed; stock-free report saved. No hardware evidence.')
}
