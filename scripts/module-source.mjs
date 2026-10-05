// Shared by the release importer and the frontend-only release stamp: the module source the compiler
// reads and the packages it produces. Both must describe the same inventory, or one could pass what the
// other refuses.
import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { parseModuleDocument } from '../src/catalog/module-contract.ts'
export const PACKAGE_FILES = ['dsp-packages.json','coldfire-packages.json','resident-dsp.json','rom-packages.json','bootstrap-package.json','menu-recipes.json','descriptor-recipes.json','platform-writes.json','requested-packages.json','utility-packages.json','sidechain-package.json']
export const SOURCE_GROUPS = ['modules','platform','tools','dsp','licenses']
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
async function inventory(folder,prefix) { const files=[];for(const item of await readdir(folder,{withFileTypes:true})){if(item.name==='__pycache__'||item.name.endsWith('.pyc')||item.name==='.DS_Store')continue;if(item.isSymbolicLink())throw new Error('Source symlinks are prohibited.');const path=prefix+'/'+item.name;if(item.isDirectory())files.push(...await inventory(resolve(folder,item.name),path));else if(item.isFile())files.push(path);else throw new Error('Source must be a regular file.')}return files }
/** Relative paths of every SDK source file the compiler reads. */
export async function moduleSourcePaths(root) { const native=resolve(root,'sdk/octabam'),files=[];for(const group of SOURCE_GROUPS)files.push(...await inventory(resolve(native,group),group));return files.sort() }
/** The same SHA-256 tree fingerprint the compiler records as sourceTreeSha256. */
export async function moduleSourceFingerprint(root) {
  const native=resolve(root,'sdk/octabam'),sources={}
  for(const path of (await moduleSourcePaths(root)).sort((a,b)=>a<b?-1:a>b?1:0))sources[path]=sha(await readFile(resolve(native,path)))
  return sha(JSON.stringify(sources))
}

/** Verified firmware package scope. Pending catalog imports remain bound by the full source inventory. */
export async function compiledModuleVersions(root, catalog) {
  const versions = {}, seen = new Set()
  for (const module of catalog.modules) {
    if (!/^[a-z][a-z0-9-]*$/.test(module.id) || seen.has(module.id)) throw new Error('Invalid catalog module id: ' + module.id)
    seen.add(module.id)
    const document = parseModuleDocument(JSON.parse(await readFile(resolve(root, 'sdk/octabam/modules', module.id, 'octamod.module.json'), 'utf8')))
    if (document.id !== module.id || document.version !== module.version) throw new Error('Stale catalog module version: ' + module.id)
    if (document.build?.status !== 'pending') versions[module.id] = module.version
  }
  return versions
}
