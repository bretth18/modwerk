// Consume a completed actual-snapshot proof; never repair inputs or synthesize a pass.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdir, lstat, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BROWSER_PRESERVATION_PATH, BROWSER_PARITY_PATH, browserProtectedInputs, browserProtectedInputsSha256, validateBrowserPreservationBinding } from './browser-infrastructure-preservation.mjs'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
export async function generateBrowserPreservationBinding(root, approvedRef, reportBytes) {
  const report = JSON.parse(reportBytes.toString('utf8'))
  assert.equal(reportBytes.toString('utf8'), JSON.stringify(report, null, 2) + '\n', 'Use the complete canonical runner report')
  const before = await browserProtectedInputs(root, report.beforeCommit), after = await browserProtectedInputs(root, report.afterCommit)
  const changes = Object.fromEntries([...new Set([...Object.keys(before), ...Object.keys(after)])].sort().filter(path => before[path] !== after[path]).map(path => [path, { before: before[path] ?? null, after: after[path] ?? null }]))
  const record = { schemaVersion: 1, retainedModule: 'tapeecho@0.1.3-experimental', evidenceCommit: '32ac46b0c7e8c11e48ebc41674695e033142b46e', evidenceModuleVersion: '0.1.2-experimental', approvedMain: report.beforeCommit, validatedCommit: report.afterCommit, originalOsSha256: report.originalOsSha256, changes,
    protectedInputHashes: after, protectedInputsSha256: browserProtectedInputsSha256(after), approvedProtectedInputsSha256: browserProtectedInputsSha256(before), proof: { reportSha256: sha(reportBytes), runnerSha256: report.runnerSha256 } }
  const document = JSON.parse(await readFile(resolve(root, 'sdk/octabam/modules/tapeecho/octamod.module.json'), 'utf8'))
  await validateBrowserPreservationBinding(root, approvedRef, document, record, reportBytes)
  return record
}
export async function writeBrowserPreservationBinding(root, approvedRef, reportBytes) {
  // Validate every output and live/Git/runner hash before either artifact exists.
  const record = await generateBrowserPreservationBinding(root, approvedRef, reportBytes)
  const targets = [resolve(root, BROWSER_PARITY_PATH), resolve(root, BROWSER_PRESERVATION_PATH)]
  for (const path of targets) {
    try { await lstat(path); throw new Error('Preservation artifact already exists; review it instead of overwriting') } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  assert.equal(execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'src', 'sdk', 'scripts', 'package.json', 'package-lock.json', 'vite.config.ts'], { cwd: root, encoding: 'utf8' }).trim(), '', 'Commit all build inputs before generation')
  await mkdir(dirname(targets[0]), { recursive: true })
  const created = []
  try {
    await writeFile(targets[0], reportBytes, { flag: 'wx' }); created.push(targets[0])
    await writeFile(targets[1], JSON.stringify(record, null, 2) + '\n', { flag: 'wx' }); created.push(targets[1])
  } catch (error) { for (const path of created) await rm(path); throw error }
  return record
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [root, approvedRef, report] = process.argv.slice(2)
  assert.ok(root && approvedRef && report && process.argv.length === 5, 'Usage: node scripts/generate-browser-preservation.mjs INTEGRATED_ROOT APPROVED_MAIN STOCK_FREE_REPORT')
  await writeBrowserPreservationBinding(resolve(root), approvedRef, await readFile(report))
  console.log('Exact executed-worker binding generated; original evidence and hardware limits unchanged.')
}
