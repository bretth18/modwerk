// Read-only qualification checks. Never import/evaluate submitted native source.
import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { requireModuleQualificationForPublication } from '../src/catalog/module-contract.ts'
import { compareModuleVersions } from '../src/catalog/versions.ts'
import { requireModuleDocumentation } from './module-documentation.mjs'

export const BASELINE_PATH = 'sdk/module-qualification-baseline.json'
export const WAIVERS_PATH = 'sdk/module-release-waivers.json'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
async function inventory(folder, prefix='') {
  const files=[]
  for(const entry of await readdir(folder,{withFileTypes:true})) {
    if(entry.name==='__pycache__'||entry.name.endsWith('.pyc')||entry.name==='.DS_Store') continue
    const path=prefix+entry.name
    if(entry.isSymbolicLink()) throw new Error(path+': module symlinks are prohibited')
    if(entry.isDirectory()) files.push(...await inventory(resolve(folder,entry.name),path+'/'))
    else if(entry.isFile()) files.push(path)
    else throw new Error(path+': expected a regular module file')
  }
  return files.sort()
}
async function fingerprint(folder, paths) {
  const hashes={}
  for(const path of paths) hashes[path]=sha(await readFile(resolve(folder,path)))
  return sha(JSON.stringify(hashes))
}
export async function moduleFolderSha256(folder) { return fingerprint(folder,await inventory(folder)) }
export function qualificationReports(document) {
  const q=document.tests.qualification
  return q?[...new Set([...q.cycles.map(c=>c.report),q.memory.report,q.hardware.report])]:document.tests.releaseWaiver?[document.tests.releaseWaiver.report]:[]
}
export async function moduleNativeSourceSha256(folder, document) {
  const reports=new Set(qualificationReports(document))
  const paths=(await inventory(folder)).filter(path=>!['octamod.module.json','qualification.example.json'].includes(path)&&!path.startsWith('media/')&&!/\.md$/i.test(path)&&!/(^|\/)(LICENSE|LICENCE|COPYING)(\.|$)/i.test(path)&&!reports.has(path))
  return fingerprint(folder,paths)
}
export function parseQualificationBaseline(value) {
  if(!value||value.schemaVersion!==1||value.recorded!=='2026-10-02'||!Array.isArray(value.modules)||Object.keys(value).some(key=>!['schemaVersion','recorded','modules'].includes(key))) throw new Error('Invalid frozen module qualification baseline')
  const result=new Map()
  for(const entry of value.modules) {
    if(!entry||Object.keys(entry).sort().join(',')!=='folderSha256,id,version'||typeof entry.id!=='string'||!/^[a-z][a-z0-9-]*$/.test(entry.id)||typeof entry.version!=='string'||!(/^[a-f0-9]{64}$/).test(entry.folderSha256)||result.has(entry.id)) throw new Error('Invalid or duplicate qualification baseline entry')
    compareModuleVersions(entry.version,entry.version)
    result.set(entry.id,entry)
  }
  return result
}
// The owner's 2 October exception is limited to these exact releases. It is
// separate from the frozen baseline and cannot be extended to another version.
export function parseReleaseWaivers(value) {
  if(!value||value.schemaVersion!==1||value.approvedBy!=='repeat98'||value.approvedOn!=='2026-10-02'||JSON.stringify(value.waived)!==JSON.stringify(['hardware-stress','chip-worst-case-cycles'])||!Array.isArray(value.modules)||value.modules.length!==2||Object.keys(value).some(k=>!['schemaVersion','approvedBy','approvedOn','waived','reason','modules'].includes(k))||typeof value.reason!=='string'||!value.reason.trim()) throw new Error('Invalid owner release waiver')
  const records=new Map()
  for(const entry of value.modules) {
    if(!entry||!['cc-map','previewvol'].includes(entry.id)||entry.version!=='0.1.2-experimental'||records.has(entry.id)||Object.keys(entry).sort().join(',')!=='folderSha256,id,sourceSha256,version'||![entry.folderSha256,entry.sourceSha256].every(h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h))) throw new Error('Release waivers cover only the two exact owner-approved utility versions')
    records.set(entry.id,entry)
  }
  return records
}
export async function requireFolderQualification(folder, document, baseline, waivers=new Map()) {
  const existing=baseline.get(document.id)
  if(existing?.version===document.version&&existing.folderSha256===await moduleFolderSha256(folder)) return 'retained'
  const waiver=waivers.get(document.id), declaration=document.tests.releaseWaiver
  if(waiver?.version===document.version&&declaration) {
    if(declaration.moduleVersion!==document.version||declaration.sourceSha256!==waiver.sourceSha256||await moduleNativeSourceSha256(folder,document)!==waiver.sourceSha256||await moduleFolderSha256(folder)!==waiver.folderSha256) throw new Error(document.id+': owner waiver does not cover this exact source and complete module folder')
    if(document.tests.hardwareStatus!=='untested'||document.tests.qualification||document.build||document.resources.processing.value!==null||document.resources.processing.method!=='unmeasured') throw new Error(document.id+': owner-waived hardware and chip timing must remain explicitly untested/unmeasured')
    const report=JSON.parse(await readFile(resolve(folder,declaration.report),'utf8'))
    if(report.schemaVersion!==1||report.id!==document.id||report.moduleVersion!==document.version||report.sourceSha256!==waiver.sourceSha256||report.imageSha256!==declaration.imageSha256||report.hardwareStatus!=='untested'||report.chipWorstCaseCycles!==null||report.nativeBrowserParity?.status!=='passed'||report.nativeBrowserParity.selections!==1024||report.nativeBrowserParity.exactImages!==522||report.nativeBrowserParity.matchingRefusals!==502||report.nativePackaging?.status!=='passed'||report.nativePackaging.exactContainersAndUpgrades!==8||report.rejections?.status!=='passed'||!report.memory?.romBytes) throw new Error(document.id+': incomplete or stale software verification report')
    await requireModuleDocumentation(folder,document)
    return 'owner-waived'
  }
  requireModuleQualificationForPublication(document)
  if(document.tests.qualification.sourceSha256!==await moduleNativeSourceSha256(folder,document)) throw new Error(document.id+': qualification source SHA-256 differs from current native source; remeasure and retest this source')
  for(const path of qualificationReports(document)) {
    const report=await readFile(resolve(folder,path),'utf8')
    if(!report.trim()) throw new Error(document.id+': qualification report is empty: '+path)
  }
  await requireModuleDocumentation(folder,document)
  return 'qualified'
}
