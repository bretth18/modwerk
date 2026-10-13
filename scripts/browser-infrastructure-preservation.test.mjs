import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, renameSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { BROWSER_PRESERVATION_PATH, BROWSER_PARITY_PATH, browserProtectedInputs, browserProtectedInputsSha256, loadBrowserInfrastructurePreservation } from './browser-infrastructure-preservation.mjs'
import { generateBrowserPreservationBinding, writeBrowserPreservationBinding } from './generate-browser-preservation.mjs'
import { PACKAGE_FILES } from './module-source.mjs'
import { matchedParityImages, parityImage, parityReportSha256 } from './verify-tapeecho-browser-parity.mjs'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const evidence = '32ac46b0c7e8c11e48ebc41674695e033142b46e'
const os = '34695b606eb00e1b4dded5fd0c4b66f3a460522a632e47d7416dbd220599e1ad'
const document = { id: 'tapeecho', version: '0.1.3-experimental', tests: { retainedEvidence: { commit: evidence, moduleVersion: '0.1.2-experimental' } } }
const allowed = ['src/engine/client.ts', 'src/engine/protocol.ts', 'src/engine/session.ts', 'src/engine/elekloader/digi-build.ts',
  ...['machine-build', 'module-set', 'octatrack-base', 'octatrack-link', 'selftest', 'upload-session', 'upload-usb', 'upload-wire'].map(name => 'src/engine/elekloader/' + name + '.ts'),
  ...['octatrack-base-fills.json', 'octatrack-base-sources.json', 'octatrack-base.elemod', 'octatrack-module-packages.json'].map(name => 'src/engine/assets/' + name)].sort()
const profiles = [['tapeecho'], ['tapeecho', 'repitch'], ['tapeecho', 'tapehead'], ['tapeecho', 'miniverb', 'euclid', 'repitch'], ['tapeecho', 'sidechain-compressor', 'analog-bassdrum'], ['tapeecho', 'miniverb', 'euclid', 'repitch', 'tapehead', 'sidechain-compressor']]
async function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'modwerk-browser-proof.'))
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  const write = (path, value) => { mkdirSync(resolve(root, path, '..'), { recursive: true }); writeFileSync(resolve(root, path), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n') }
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid')
  // Read-only alternates reuse the real original evidence ancestor without copying repo objects.
  const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim()
  write('.git/objects/info/alternates', resolve(common, 'objects') + '\n')
  git('symbolic-ref', 'HEAD', 'refs/heads/main'); git('update-ref', 'refs/heads/main', evidence)
  for (const path of ['sdk/octabam/platform/fixture.txt', 'sdk/octabam/dsp/fixture.txt', 'sdk/octabam/tools/build/fixture.txt', 'sdk/octabam/tools/remix/fixture.txt', 'scripts/build-module-packages.py', 'scripts/module-source.mjs', 'src/engine/assets/legacy-packages.json', ...allowed.filter(path => ['client.ts', 'protocol.ts', 'session.ts', 'digi-build.ts'].includes(path.split('/').at(-1)))]) write(path, 'approved:' + path)
  for (const name of PACKAGE_FILES) write('src/engine/assets/' + name, { schema: 1, sourceCommit: null, code: 'synthetic authored bytes', moduleVersions: { tapeecho: document.version }, rows: [{ moduleId: 'tapeecho', bytes: 'authored' }] })
  write('sdk/catalog.json', { modules: [{ id: 'tapeecho' }, { id: 'foreign' }] })
  write('src/engine/assets/analog-bd-composition-proofs.json', { moduleSourceTreeSha256: 'a'.repeat(64), placements: 'authored' })
  // Python preserves insertion order for integer-looking keys; JS would reorder them.
  write('src/engine/assets/menu-recipes.json', '{\n  "schema": 1,\n  "sourceCommit": null,\n  "labels": {\n    "7": "---",\n    "6": "LADR"\n  }\n}\n')
  const packageFiles = () => Object.fromEntries(PACKAGE_FILES.map(name => { const bytes = readFileSync(resolve(root, 'src/engine/assets/' + name)); return [name, { bytes: bytes.length, sha256: sha(bytes) }] }))
  write('src/engine/assets/module-build.json', { sourceCommit: null, approval: null, files: packageFiles(), qualification: { hardware: false } })
  write('sdk/octabam/modules/tapeecho/octamod.module.json', document)
  git('add', '.'); git('commit', '-qm', 'Synthetic approved main')
  const base = git('rev-parse', 'HEAD'), before = await browserProtectedInputs(root, base)
  for (const path of allowed) write(path, 'candidate:' + path)
  write('scripts/verify-tapeecho-browser-parity.mjs', 'synthetic test runner')
  git('add', '.'); git('commit', '-qm', 'Synthetic integrated candidate')
  const candidate = git('rev-parse', 'HEAD'), after = await browserProtectedInputs(root, candidate)
  const image = { bytes: 100, sha256: 'a'.repeat(64), reportSha256: 'b'.repeat(64) }
  const guards = { clearRefused: true, modifiedUpgradeRefused: true, failedInspectionLeavesNoBase: true }
  const proof = { schemaVersion: 1, method: 'executed-legacy-worker-parity', beforeCommit: base, afterCommit: candidate, moduleVersion: document.version, originalOsSha256: os, runnerSha256: sha('synthetic test runner'), hardware: false, inputUnchanged: true, bundles: { before: 'd'.repeat(64), after: 'e'.repeat(64) },
    selections: profiles.flatMap(moduleIds => [false, true].flatMap(keepStockFx2 => [false, true].map(betaAccess => ({ moduleIds, keepStockFx2, betaAccess, before: { ...image }, after: { ...image } })))),
    completeUpgrade: { before: { ...image }, after: { ...image } }, guards: { before: { ...guards }, after: { ...guards } } }
  const record = { schemaVersion: 1, retainedModule: 'tapeecho@' + document.version, evidenceCommit: evidence, evidenceModuleVersion: document.tests.retainedEvidence.moduleVersion, approvedMain: base, validatedCommit: candidate, originalOsSha256: os,
    changes: Object.fromEntries(allowed.map(path => [path, { before: before[path] ?? null, after: after[path] }])), protectedInputHashes: after, protectedInputsSha256: browserProtectedInputsSha256(after), approvedProtectedInputsSha256: browserProtectedInputsSha256(before), proof: { reportSha256: '', runnerSha256: proof.runnerSha256 } }
  const save = () => { write(BROWSER_PARITY_PATH, proof); record.proof.reportSha256 = sha(JSON.stringify(proof, null, 2) + '\n'); write(BROWSER_PRESERVATION_PATH, record) }
  save()
  const publish = (importPackages = true) => {
    if (importPackages) for (const name of PACKAGE_FILES) {
      const path = 'src/engine/assets/' + name, bytes = readFileSync(resolve(root, path), 'utf8')
      write(path, bytes.replace('  "sourceCommit": null,', '  "sourceCommit": ' + JSON.stringify(candidate) + ','))
    }
    const path = 'src/engine/assets/module-build.json', value = JSON.parse(readFileSync(resolve(root, path)))
    write(path, { ...value, sourceCommit: candidate, approval: { kind: 'github-pr-merge', sourceCommit: candidate }, files: packageFiles() })
  }
  return { root, base, candidate, record, proof, write, save, git, publish, packageFiles, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}
describe('one exact Tape Echo browser infrastructure binding', () => {
  it('accepts only reviewed source transitions, retaining every unchanged protected input', async () => {
    const f = await fixture()
    try {
      const result = await loadBrowserInfrastructurePreservation(f.root, f.base, document)
      expect(result.matchesFile(Buffer.from('approved:src/engine/client.ts'), Buffer.from('candidate:src/engine/client.ts'), 'src/engine/client.ts')).toBe(true)
      expect(result.matchesFile(null, Buffer.from('candidate:src/engine/elekloader/module-set.ts'), 'src/engine/elekloader/module-set.ts')).toBe(true)
      expect(result.matchesFile(null, Buffer.from('arbitrary'), 'src/engine/extra.ts')).toBe(false)
      expect(result.matchesFile(Buffer.from('approved:src/engine/client.ts'), Buffer.from('later'), 'src/engine/client.ts')).toBe(false)
    } finally { f.cleanup() }
  })
  it.each([true, false])('accepts exact package provenance import or stamping (%s)', async importPackages => {
    const f = await fixture()
    try { f.publish(importPackages); expect(await loadBrowserInfrastructurePreservation(f.root, f.base, document)).not.toBeNull() } finally { f.cleanup() }
  })
  it.each(['payload', 'version', 'foreign commit', 'manifest hash', 'qualification', 'approval commit', 'duplicate key'])('rejects changed publication %s', async mutation => {
    const f = await fixture()
    try {
      f.publish()
      const packagePath = 'src/engine/assets/dsp-packages.json', buildPath = 'src/engine/assets/module-build.json'
      const pkg = JSON.parse(readFileSync(resolve(f.root, packagePath))), build = JSON.parse(readFileSync(resolve(f.root, buildPath)))
      if (mutation === 'payload') pkg.code += 'changed'
      if (mutation === 'version') pkg.moduleVersions.tapeecho = '0.1.4-experimental'
      if (mutation === 'foreign commit') pkg.sourceCommit = 'f'.repeat(40)
      f.write(packagePath, pkg); build.files = f.packageFiles()
      if (mutation === 'manifest hash') build.files['dsp-packages.json'].sha256 = 'f'.repeat(64)
      if (mutation === 'qualification') build.qualification.hardware = true
      if (mutation === 'approval commit') build.approval.sourceCommit = 'f'.repeat(40)
      f.write(buildPath, build)
      if (mutation === 'duplicate key') f.write(packagePath, JSON.stringify(pkg, null, 2).replace('"schema": 1,', '"schema": 1,\n  "schema": 1,') + '\n')
      await expect(loadBrowserInfrastructurePreservation(f.root, f.base, document)).rejects.toThrow('Invalid or stale')
    } finally { f.cleanup() }
  })
  // Another module's release adds its own rows to the shared packages; those are not Tape Echo inputs.
  const foreignRelease = (f, change = () => {}) => {
    f.publish()
    const packagePath = 'src/engine/assets/dsp-packages.json', buildPath = 'src/engine/assets/module-build.json', proofsPath = 'src/engine/assets/analog-bd-composition-proofs.json'
    const pkg = JSON.parse(readFileSync(resolve(f.root, packagePath))), build = JSON.parse(readFileSync(resolve(f.root, buildPath)))
    pkg.moduleVersions.foreign = '1.0.0'; pkg.rows.push({ moduleId: 'foreign', bytes: 'new' }); change(pkg)
    f.write(packagePath, pkg)
    f.write(proofsPath, { moduleSourceTreeSha256: 'c'.repeat(64), placements: 'authored' })
    f.write(buildPath, { ...build, sourceTreeSha256: 'd'.repeat(64), files: f.packageFiles() })
    return pkg
  }
  it("accepts another module's own rows, versions and source-tree identity in the shared packages", async () => {
    const f = await fixture()
    try { foreignRelease(f); expect(await loadBrowserInfrastructurePreservation(f.root, f.base, document)).not.toBeNull() } finally { f.cleanup() }
  })
  it.each([
    ['a Tape Echo row', pkg => { pkg.rows[0].bytes = 'changed' }],
    ['the shared payload', pkg => { pkg.code += 'changed' }],
    ['a foreign provenance commit', pkg => { pkg.sourceCommit = 'f'.repeat(40) }],
    ['the Tape Echo version label', pkg => { pkg.moduleVersions.tapeecho = '0.1.4-experimental' }],
  ])("still rejects another module's release that also changes %s", async (_, change) => {
    const f = await fixture()
    try {
      foreignRelease(f, change)
      f.write('src/engine/assets/module-build.json', { ...JSON.parse(readFileSync(resolve(f.root, 'src/engine/assets/module-build.json'))), files: f.packageFiles() })
      await expect(loadBrowserInfrastructurePreservation(f.root, f.base, document)).rejects.toThrow('Invalid or stale')
    } finally { f.cleanup() }
  })
  it("rejects another module's release with a duplicate JSON key", async () => {
    const f = await fixture()
    try {
      const pkg = foreignRelease(f), path = 'src/engine/assets/dsp-packages.json'
      f.write(path, JSON.stringify(pkg, null, 2).replace('"schema": 1,', '"schema": 1,\n  "schema": 1,') + '\n')
      f.write('src/engine/assets/module-build.json', { ...JSON.parse(readFileSync(resolve(f.root, 'src/engine/assets/module-build.json'))), files: f.packageFiles() })
      await expect(loadBrowserInfrastructurePreservation(f.root, f.base, document)).rejects.toThrow('Invalid or stale')
    } finally { f.cleanup() }
  })
  it('rejects a changed shared compiler or Tape Echo build field beside another module\'s release', async () => {
    const f = await fixture()
    try {
      foreignRelease(f)
      const path = 'src/engine/assets/module-build.json'
      f.write(path, { ...JSON.parse(readFileSync(resolve(f.root, path))), compilerSha256: 'e'.repeat(64) })
      await expect(loadBrowserInfrastructurePreservation(f.root, f.base, document)).rejects.toThrow('Invalid or stale')
    } finally { f.cleanup() }
  })
  it('leaves the original fail-closed path active without a real binding', async () => {
    const f = await fixture()
    try { rmSync(resolve(f.root, BROWSER_PRESERVATION_PATH)); expect(await loadBrowserInfrastructurePreservation(f.root, f.base, document)).toBeNull() } finally { f.cleanup() }
  })
  it.each([
    { ...document, id: 'euclid' }, { ...document, version: '0.1.4-experimental' },
    { ...document, tests: { retainedEvidence: { commit: evidence, moduleVersion: '0.1.3-experimental' } } },
    { ...document, tests: { retainedEvidence: { commit: 'f'.repeat(40), moduleVersion: '0.1.2-experimental' } } },
  ])('cannot confer retention on an unrelated identity %j', async value => {
    const f = await fixture()
    try { expect(await loadBrowserInfrastructurePreservation(f.root, f.base, value)).toBeNull() } finally { f.cleanup() }
  })
  for (const [name, mutate] of [
    ['a symlinked runner', f => { rmSync(resolve(f.root, 'scripts/verify-tapeecho-browser-parity.mjs')); symlinkSync(resolve(f.root, 'src/engine/client.ts'), resolve(f.root, 'scripts/verify-tapeecho-browser-parity.mjs')) }],
    ['a changed checked-in runner', f => f.write('scripts/verify-tapeecho-browser-parity.mjs', 'later runner')],
    ['one changed source byte', f => f.write('src/engine/client.ts', 'later')],
    ['an unchanged legacy package edit', f => f.write('src/engine/assets/legacy-packages.json', 'later')],
    ['an unchanged DSP input edit', f => f.write('sdk/octabam/dsp/fixture.txt', 'later')],
    ['an unlisted new protected input', f => f.write('src/engine/extra.ts', 'new')],
    ['a missing protected input', f => rmSync(resolve(f.root, 'src/engine/session.ts'))],
    ['a source symlink', f => { rmSync(resolve(f.root, 'src/engine/session.ts')); symlinkSync(resolve(f.root, 'src/engine/client.ts'), resolve(f.root, 'src/engine/session.ts')) }],
    ['a symlinked proof', f => { renameSync(resolve(f.root, BROWSER_PARITY_PATH), resolve(f.root, 'proof-backup.json')); symlinkSync(resolve(f.root, 'proof-backup.json'), resolve(f.root, BROWSER_PARITY_PATH)) }],
    ['a prospective rather than actual proof commit', f => { f.record.validatedCommit = 'f'.repeat(40); f.proof.afterCommit = f.record.validatedCommit }],
    ['an unapproved main snapshot', f => { f.record.approvedMain = f.candidate; f.record.validatedCommit = f.base; f.proof.beforeCommit = f.candidate; f.proof.afterCommit = f.base }],
    ['a wrong original OS', f => { f.record.originalOsSha256 = 'f'.repeat(64) }],
    ['a wrong proof version', f => { f.proof.moduleVersion = '0.1.2-experimental' }],
    ['a falsely asserted hardware pass', f => { f.proof.hardware = true }],
    ['input mutation during the proof', f => { f.proof.inputUnchanged = false }],
    ['a missing stock/beta matrix case', f => { f.proof.selections.pop() }],
    ['a duplicate matrix case', f => { f.proof.selections[1] = f.proof.selections[0] }],
    ['a changed composed MAIN', f => { f.proof.selections[0].after.sha256 = 'f'.repeat(64) }],
    ['a changed validation report', f => { f.proof.selections[0].after.reportSha256 = 'f'.repeat(64) }],
    ['a changed complete upgrade', f => { f.proof.completeUpgrade.after.bytes++ }],
    ['a failed clear/source guard', f => { f.proof.guards.after.failedInspectionLeavesNoBase = false }],
    ['an unsafe scope extension', f => { f.record.changes['sdk/octabam/dsp/fixture.txt'] = { before: 'a'.repeat(64), after: 'b'.repeat(64) } }],
    ['a omitted complete-input entry', f => { delete f.record.protectedInputHashes['src/engine/session.ts'] }],
    ['an arbitrary record extension', f => { f.record.allowPrefix = 'src/engine/' }],
    ['arbitrary proof content', f => { f.proof.message = 'raw error' }],
  ]) it('refuses ' + name, async () => {
    const f = await fixture()
    try { mutate(f); f.save(); await expect(loadBrowserInfrastructurePreservation(f.root, f.base, document)).rejects.toThrow('Invalid or stale') } finally { f.cleanup() }
  })
  it('does not accept rehashing a live mutation without the actual validated commit', async () => {
    const f = await fixture()
    try {
      f.write('src/engine/client.ts', 'later'); f.record.protectedInputHashes = await browserProtectedInputs(f.root)
      f.record.protectedInputsSha256 = browserProtectedInputsSha256(f.record.protectedInputHashes)
      f.record.changes['src/engine/client.ts'].after = f.record.protectedInputHashes['src/engine/client.ts']; f.save()
      await expect(loadBrowserInfrastructurePreservation(f.root, f.base, document)).rejects.toThrow('Invalid or stale')
    } finally { f.cleanup() }
  })
  it('rejects duplicate JSON keys', async () => {
    const f = await fixture()
    try { f.write(BROWSER_PRESERVATION_PATH, JSON.stringify(f.record, null, 2).replace('"schemaVersion": 1,', '"schemaVersion": 1,\n  "schemaVersion": 1,') + '\n'); await expect(loadBrowserInfrastructurePreservation(f.root, f.base, document)).rejects.toThrow('Invalid or stale') } finally { f.cleanup() }
  })
})

describe('actual-worker report adapter and validation-first generation', () => {
  it('hashes report key order consistently without dropping version or provenance', () => {
    expect(parityReportSha256({ version: '0.1.3', sourceCommit: 'original' })).toBe(parityReportSha256({ sourceCommit: 'original', version: '0.1.3' }))
    expect(parityReportSha256({ version: '0.1.3', sourceCommit: 'original' })).not.toBe(parityReportSha256({ version: '0.1.3', sourceCommit: 'changed' }))
    expect(parityReportSha256({ version: '0.1.3' })).not.toBe(parityReportSha256({ version: '0.1.2' }))
  })
  it('refuses actual byte or report differences before producing a matched pair', () => {
    const original = parityImage(Buffer.from('authored synthetic output'), { version: '0.1.3' })
    expect(() => matchedParityImages(original, parityImage(Buffer.from('changed synthetic output'), { version: '0.1.3' }))).toThrow('preservation refused')
    expect(() => matchedParityImages(original, parityImage(Buffer.from('authored synthetic output'), { version: '0.1.2' }))).toThrow('preservation refused')
    expect(matchedParityImages(original, { ...original })).toEqual({ before: original, after: original })
  })
  it('constructs an exact binding solely from the actual Git snapshots and complete proof', async () => {
    const f = await fixture()
    try { expect(await generateBrowserPreservationBinding(f.root, f.base, Buffer.from(JSON.stringify(f.proof, null, 2) + '\n'))).toEqual(f.record) } finally { f.cleanup() }
  })
  it('writes validated artifacts once and refuses replacing them', async () => {
    const f = await fixture()
    try {
      rmSync(resolve(f.root, BROWSER_PRESERVATION_PATH)); rmSync(resolve(f.root, BROWSER_PARITY_PATH))
      const bytes = Buffer.from(JSON.stringify(f.proof, null, 2) + '\n')
      await writeBrowserPreservationBinding(f.root, f.base, bytes)
      expect(await loadBrowserInfrastructurePreservation(f.root, f.base, document)).not.toBeNull()
      await expect(writeBrowserPreservationBinding(f.root, f.base, bytes)).rejects.toThrow('already exists')
    } finally { f.cleanup() }
  })
  it('writes no binding for a failed worker comparison', async () => {
    const f = await fixture()
    try {
      rmSync(resolve(f.root, BROWSER_PRESERVATION_PATH)); rmSync(resolve(f.root, BROWSER_PARITY_PATH))
      f.proof.completeUpgrade.after.sha256 = 'f'.repeat(64)
      await expect(writeBrowserPreservationBinding(f.root, f.base, Buffer.from(JSON.stringify(f.proof, null, 2) + '\n'))).rejects.toThrow('Invalid or stale')
      expect(existsSync(resolve(f.root, BROWSER_PRESERVATION_PATH))).toBe(false)
      expect(existsSync(resolve(f.root, BROWSER_PARITY_PATH))).toBe(false)
    } finally { f.cleanup() }
  })
  it('refuses dirty catalogue inputs outside the protected hash prefixes', async () => {
    const f = await fixture()
    try {
      rmSync(resolve(f.root, BROWSER_PRESERVATION_PATH)); rmSync(resolve(f.root, BROWSER_PARITY_PATH))
      f.write('src/catalog/module-documents.json', 'uncommitted catalogue')
      await expect(writeBrowserPreservationBinding(f.root, f.base, Buffer.from(JSON.stringify(f.proof, null, 2) + '\n'))).rejects.toThrow('Commit all build inputs')
      expect(existsSync(resolve(f.root, BROWSER_PRESERVATION_PATH))).toBe(false)
    } finally { f.cleanup() }
  })
  it('rejects rehashing an altered runner while its validated Git version differs', async () => {
    const f = await fixture()
    try {
      f.write('scripts/verify-tapeecho-browser-parity.mjs', 'altered runner')
      f.proof.runnerSha256 = sha('altered runner'); f.record.proof.runnerSha256 = f.proof.runnerSha256; f.save()
      await expect(loadBrowserInfrastructurePreservation(f.root, f.base, document)).rejects.toThrow('Invalid or stale')
    } finally { f.cleanup() }
  })
})
