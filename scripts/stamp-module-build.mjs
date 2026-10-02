// Release without a module rebuild. The workflow runs this only when no module source, compiler or package
// changed since the last successful release, which reproduced the committed packages from this same source.
// Re-check that identity here, then record this commit's owner-merge approval for the frontend.
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchOwnerApproval } from '../src/release/approval.ts'
import { PACKAGE_FILES, moduleSourceFingerprint, compiledModuleVersions } from './module-source.mjs'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), assets = resolve(root, 'src/engine/assets')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const json = async path => JSON.parse(await readFile(path, 'utf8'))
const record = await json(resolve(assets, 'module-build.json')), catalog = await json(resolve(root, 'sdk/catalog.json'))
if (record.schemaVersion !== 1 || record.kind !== 'source-packages' || record.nativeRevision !== catalog.sourceRevision) throw new Error('Invalid committed module build record.')
if (record.compilerSha256 !== sha(await readFile(resolve(root, 'scripts/build-module-packages.py')))) throw new Error('The module compiler changed; rebuild the packages.')
if ((await json(resolve(assets,'utility-packages.json'))).compilerSha256 !== sha(await readFile(resolve(root,'scripts/build-utility-packages.py')))) throw new Error('The utility compiler changed; rebuild the packages.')
if (await moduleSourceFingerprint(root) !== record.sourceTreeSha256) throw new Error('Module source changed; rebuild the packages.')
const versions = await compiledModuleVersions(root, catalog)
if (JSON.stringify(Object.entries(record.moduleVersions ?? {}).sort()) !== JSON.stringify(Object.entries(versions).sort())) throw new Error('Committed packages do not match the catalog versions.')
for (const name of PACKAGE_FILES) {
  const bytes = await readFile(resolve(assets, name)), entry = record.files?.[name]
  if (!entry || entry.bytes !== bytes.length || entry.sha256 !== sha(bytes)) throw new Error('Committed package ' + name + ' differs from its build record.')
}
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const approval = await fetchOwnerApproval(process.env.GITHUB_REPOSITORY ?? '', head, Number(process.env.OCTAMOD_APPROVER_ID), process.env.GITHUB_TOKEN ?? '')
await writeFile(resolve(assets, 'module-build.json'), JSON.stringify({ ...record, sourceCommit: head, approval }, null, 2) + '\n')
console.log('Committed packages match module source ' + record.sourceTreeSha256.slice(0, 12) + '; owner-approved PR #' + approval.pullRequest + ' at ' + head + '.')
