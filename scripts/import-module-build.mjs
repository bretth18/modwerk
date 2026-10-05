import { readFile, lstat, realpath, copyFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchOwnerApproval } from '../src/release/approval.ts'
import { parseModuleDocument } from '../src/catalog/module-contract.ts'
import { parseColdFireObject } from '../src/engine/coldfire-elf.ts'
import { PACKAGE_FILES as expected, moduleSourcePaths, compiledModuleVersions } from './module-source.mjs'
import { NOTICE_NAME, renderLicenseNotices } from './license-notices.mjs'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2), folder = args[0] && resolve(args[0]), development = args.includes('--development'), checkOnly = args.includes('--check-only'), verifyExisting = args.includes('--verify-existing')
if (!folder) throw new Error('Usage: node scripts/import-module-build.mjs artifact-directory [--development] [--check-only]')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const json = async path => JSON.parse(await readFile(path, 'utf8'))
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
async function regular(path, parent) { const info = await lstat(path); if (!info.isFile() || info.isSymbolicLink() || info.size > 8*1024*1024 || !(await realpath(path)).startsWith(await realpath(parent) + '/')) throw new Error('Invalid artifact/source file: ' + path) }
await regular(resolve(folder,'module-build.json'),folder)
const report = await json(resolve(folder, 'module-build.json')), catalog = await json(resolve(root, 'sdk/catalog.json'))
if (report.schemaVersion !== 1 || report.kind !== 'source-packages' || report.stockRead !== false || report.nativeRevision !== catalog.sourceRevision || !hash(report.sourceTreeSha256) || !hash(report.compilerSha256)) throw new Error('Invalid stock-free source build record')
if (report.compilerSha256 !== sha(await readFile(resolve(root, 'scripts/build-module-packages.py')))) throw new Error('Artifact compiler differs from this source checkout')
if (report.sourceCommit !== null && !/^[a-f0-9]{40}$/.test(report.sourceCommit)) throw new Error('Invalid source commit')
let approval = null
if (!development) {
  if (!report.sourceCommit) throw new Error('Development builds require --development; they are not approved releases')
  const head = execFileSync('git', ['rev-parse','HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  if (head !== report.sourceCommit) throw new Error('Artifact source commit differs from this checkout')
  // The compiler output is untrusted. Fetch approval independently from GitHub.
  approval = await fetchOwnerApproval(process.env.GITHUB_REPOSITORY ?? '', report.sourceCommit, Number(process.env.OCTAMOD_APPROVER_ID), process.env.GITHUB_TOKEN ?? '')
}
const versions = await compiledModuleVersions(root, catalog)
if (JSON.stringify(Object.keys(report.moduleVersions).sort()) !== JSON.stringify(Object.keys(versions).sort())) throw new Error('Compiled module scope differs from the catalog')
for (const [id,version] of Object.entries(versions)) {
  const doc = parseModuleDocument(await json(resolve(root,'sdk/octabam/modules',id,'octamod.module.json')))
  if (doc.version !== version || report.moduleVersions[id] !== version) throw new Error('Stale compiled module version: ' + id)
}
if (JSON.stringify(Object.keys(report.files).sort()) !== JSON.stringify([...expected].sort()) || !report.sources || typeof report.sources !== 'object' || !Object.keys(report.sources).length) throw new Error('Invalid compiled artifact inventory')
const native = resolve(root,'sdk/octabam')
const actual=await moduleSourcePaths(root)
if(JSON.stringify(actual.sort())!==JSON.stringify(Object.keys(report.sources).sort()))throw new Error('Compiled source inventory is incomplete or stale.')
for (const [path, fingerprint] of Object.entries(report.sources)) {
  if (!/^(modules|platform|tools|dsp|licenses)\/[A-Za-z0-9._/-]+$/.test(path) || path.split('/').some(part => part === '..' || part === '.') || !hash(fingerprint) || /\.(bin|syx|exe|dll|dylib|zip)$/i.test(path)) throw new Error('Invalid source inventory path: ' + path)
  const source = resolve(native,path); await regular(source,native)
  if (sha(await readFile(source)) !== fingerprint) throw new Error('Compiled source is stale: ' + path)
}
if (sha(JSON.stringify(Object.fromEntries(Object.entries(report.sources).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)))) !== report.sourceTreeSha256) throw new Error('Source tree fingerprint differs')
const packages = new Map()
const noticePath = resolve(folder, NOTICE_NAME)
await regular(noticePath, folder)
const noticeBytes = await readFile(noticePath)
if (!report.notices || report.notices.name !== NOTICE_NAME || report.notices.bytes !== noticeBytes.length || report.notices.sha256 !== sha(noticeBytes) || noticeBytes.toString('utf8') !== await renderLicenseNotices(root)) throw new Error('Compiled artifact licence notices are missing, corrupt or stale')
for (const name of expected) {
  const file = resolve(folder,name); await regular(file,folder); const bytes = await readFile(file), entry = report.files[name]
  if (!entry || entry.bytes !== bytes.length || entry.sha256 !== sha(bytes)) throw new Error('Corrupt compiled artifact: ' + name)
  const doc = JSON.parse(bytes)
  if (doc.schema !== 1 || doc.revision !== catalog.sourceRevision || doc.sourceCommit !== report.sourceCommit || JSON.stringify(doc.moduleVersions) !== JSON.stringify(report.moduleVersions)) throw new Error('Compiled artifact provenance differs: ' + name)
  packages.set(name,doc)
}
for (const variant of packages.get('resident-dsp.json').variants) {
  if (variant.stockCopy.words !== 9 || variant.code.slice(variant.stockCopy.destinationOffset*6) !== '000000'.repeat(9)) throw new Error('Compiled receiver must contain only zero placeholders for its stock tail')
  // Native static placement leaves unbound ids on stock's null stub; only the running receiver redirects them.
  if (variant.nullInit !== variant.stockCopy.sourceAddress || variant.nullProc !== variant.stockCopy.sourceAddress + 1) throw new Error('Compiled receiver must keep stock null dispatch entries')
}
const requested = packages.get('requested-packages.json')
for (const pkg of requested.objects) {
  if (!Array.isArray(pkg.stockCopies) || pkg.stockCopies.length !== (pkg.label === 'usbmidi_cfg' ? 4 : 0)) throw new Error('Invalid inherited USB placeholder inventory')
  if (!hash(pkg.sha256) || !/^[a-f0-9]+$/.test(pkg.code) || pkg.code.length !== pkg.bytes * 2 || sha(Buffer.from(pkg.code, 'hex')) !== pkg.sha256) throw new Error('Invalid requested authored object')
  const object = parseColdFireObject(new Uint8Array(Buffer.from(pkg.code, 'hex')))
  for (const copy of pkg.stockCopies) {
    const section = object.sections[copy.section]
    if (!section || copy.bytes !== 23 || !Number.isSafeInteger(copy.offset) || copy.offset < 0 || copy.offset + copy.bytes > section.data.length || !hash(copy.sha256) || section.data.subarray(copy.offset, copy.offset + copy.bytes).some(byte => byte !== 0)) throw new Error('Inherited USB spans must contain only zero placeholders')
  }
}
const utility = packages.get('utility-packages.json')
if(utility.stockRead!==false||utility.kind!=='authored-utility-packages'||utility.compilerSha256!==sha(await readFile(resolve(root,'scripts/build-utility-packages.py')))||JSON.stringify(utility.packages.map(p=>p.id).sort())!==JSON.stringify(['cc-map','previewvol'])) throw new Error('Invalid utility source compiler or scope')
for(const pkg of utility.packages) {
  if(!['cc-map','previewvol'].includes(pkg.id)||pkg.version!==versions[pkg.id]||!hash(pkg.sha256)||!Number.isSafeInteger(pkg.bytes)||pkg.bytes<52||pkg.bytes>65536||!(/^[a-f0-9]+$/).test(pkg.code)||pkg.code.length!==pkg.bytes*2||sha(Buffer.from(pkg.code,'hex'))!==pkg.sha256) throw new Error('Invalid utility authored object')
  parseColdFireObject(new Uint8Array(Buffer.from(pkg.code,'hex')))
  const document=parseModuleDocument(await json(resolve(native,'modules',pkg.id,'octamod.module.json')))
  if(pkg.key!==document.key||pkg.author!==document.author.github||JSON.stringify(Object.keys(pkg.sources).sort())!==JSON.stringify([pkg.id==='cc-map'?'cc_map.s':'previewvol.s','manifest.py'].sort())) throw new Error('Utility identity or native source inventory differs from the catalog')
  for(const [path,fingerprint] of Object.entries(pkg.sources)) if(report.sources['modules/'+pkg.id+'/'+path]!==fingerprint) throw new Error('Utility source provenance differs from the complete source inventory')
}
const side = packages.get('sidechain-package.json')
const sideFolder = resolve(native,'modules/sidechain-compressor')
if(side.kind!=='standalone-sidechain'||side.stockRead!==false||side.compilerSha256!==sha(await readFile(resolve(sideFolder,'tools/compile_package.py')))||JSON.stringify(side.layout)!==JSON.stringify(await json(resolve(sideFolder,'release-layout.json')))||side.layout.id!=='sidechain-compressor'||side.layout.version!==versions['sidechain-compressor']||Object.keys(side.blobs).sort().join(',')!=='coldfire,dspA,dspB') throw new Error('Invalid Sidechain source compiler, layout or scope')
for(const [name,code] of Object.entries(side.blobs)) if(!/^[a-f0-9]+$/.test(code)||!hash(side.blobSha256[name])||sha(Buffer.from(code,'hex'))!==side.blobSha256[name]) throw new Error('Corrupt Sidechain authored object')
// Release automation never sees firmware, so it cannot prove native parity. Publish only packages that
// reproduce the committed, locally parity-verified ones; provenance is the only permitted difference.
if (!development || verifyExisting) for (const [name, doc] of packages) {
  const withoutProvenance = doc => ({ ...doc, sourceCommit: null })
  if (!isDeepStrictEqual(withoutProvenance(doc), withoutProvenance(await json(resolve(root,'src/engine/assets',name))))) throw new Error('Compiled ' + name + ' does not reproduce the committed, parity-verified package. Rebuild locally, verify native parity and commit the result.')
}
if(checkOnly){console.log('All source-package artifacts, complete source inventory and version pins validated ('+(development?'development':'owner-approved')+').');process.exit(0)}
// Validate the complete artifact before touching any frontend file.
for (const name of expected) await copyFile(resolve(folder,name),resolve(root,'src/engine/assets',name))
const frontend = { schemaVersion:1, kind:'source-packages', sourceCommit:report.sourceCommit, nativeRevision:report.nativeRevision, sourceTreeSha256:report.sourceTreeSha256, compilerSha256:report.compilerSha256, moduleVersions:report.moduleVersions, files:report.files, approval, qualification:report.qualification }
await writeFile(resolve(root,'src/engine/assets/module-build.json'), JSON.stringify(frontend,null,2)+'\n')
console.log('Imported source-built artifacts at exact module versions (' + (development ? 'local development; no release approval' : 'owner-approved PR #' + approval.pullRequest) + ').')
