import { readFile, readdir, mkdir, writeFile, copyFile, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { parseModuleDocument } from '../src/catalog/module-contract.ts'
import { compareModuleVersions } from '../src/catalog/versions.ts'
import { resolveModuleFile as file } from '../src/catalog/module-folder.ts'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),modules=resolve(root,'sdk/octabam/modules')
const args=process.argv.slice(2),write=args.includes('--write'),baseIndex=args.indexOf('--base'),base=baseIndex<0?null:args[baseIndex+1]
if(baseIndex>=0&&!base)throw new Error('--base requires a Git commit/ref')
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024})
const baseCommit=base?git('rev-parse','--verify',base+'^{commit}').trim():null
const json=async path=>JSON.parse(await readFile(path,'utf8'))
async function walk(folder){const paths=[];for(const entry of await readdir(folder,{withFileTypes:true})){if(entry.name==='__pycache__')continue;if(entry.isSymbolicLink())throw new Error('Module symlinks are not allowed: '+entry.name);if(entry.isDirectory())paths.push(...(await walk(resolve(folder,entry.name))).map(p=>entry.name+'/'+p));else paths.push(entry.name)}return paths.sort()}
const documents=new Map()
for(const entry of await readdir(modules,{withFileTypes:true})){
 if(entry.name.startsWith('_')||!entry.isDirectory())continue
 const folder=resolve(modules,entry.name);let document
 try{document=parseModuleDocument(await json(resolve(folder,'octamod.module.json')))}catch(error){throw new Error(entry.name+': '+error.message,{cause:error})}
 if(document.id!==entry.name)throw new Error('Module ID must match its folder: '+entry.name)
 for(const path of [document.nativeManifest,'README.md',document.tests.report,document.license.file,document.resources.storage.source,document.resources.processing.source])await file(folder,path)
 for(const path of await walk(folder))if(/\.(bin|syx|exe|dll|so|dylib|zip)$/i.test(path))throw new Error('Prohibited firmware/binary file: '+document.id+'/'+path)
 for(const item of document.media){const target=await file(folder,item.path),bytes=await readFile(target),max=(item.captureType==='audio'?12:5)*1024*1024;if(bytes.length<12||bytes.length>max)throw new Error(item.path+': invalid media size');const image=(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes[0]===255&&bytes[1]===216&&bytes[2]===255||bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP');const audio=(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE'||bytes.toString('ascii',0,4)==='OggS'||bytes.toString('ascii',0,3)==='ID3'||bytes[0]===255&&(bytes[1]&224)===224);if(item.captureType==='audio'?!audio:!image)throw new Error(item.path+': media signature/type differs')}
 if(baseCommit){const prefix='sdk/octabam/modules/'+entry.name+'/';const oldPath=prefix+'octamod.module.json';const existed=git('ls-tree','--name-only',baseCommit,'--',oldPath).trim()===oldPath;const old=existed?parseModuleDocument(JSON.parse(git('show',baseCommit+':'+oldPath))):null;if(old){const changed=(git('diff','--name-only',baseCommit,'--',prefix)+git('ls-files','--others','--exclude-standard','--',prefix)).trim();if(changed&&compareModuleVersions(document.version,old.version)<=0)throw new Error(document.id+': every source, documentation or media update requires a greater module version than '+old.version)}}
 documents.set(document.id,document)
}
const catalog=await json(resolve(root,'sdk/catalog.json'))
if(catalog.schemaVersion!==1||!Array.isArray(catalog.modules)||!/^[a-f0-9]{40}$/.test(catalog.sourceRevision))throw new Error('Invalid SDK catalog pin')
const selected=[],seen=new Set()
for(const item of catalog.modules){const document=documents.get(item.id);if(!document||item.version!==document.version||seen.has(item.id))throw new Error('Catalog must pin each included module exactly once at its declared version: '+item.id);seen.add(item.id);selected.push(document)}
const generated=JSON.stringify({schemaVersion:2,revision:catalog.sourceRevision,modules:selected},null,2)+'\n',target=resolve(root,'src/catalog/module-documents.json')
if(write){await mkdir(dirname(target),{recursive:true});await writeFile(target,generated);const mediaRoot=resolve(root,'public/module-media');await rm(mediaRoot,{recursive:true,force:true});for(const document of selected)for(const item of document.media){const destination=resolve(mediaRoot,document.id,document.version,item.path);await mkdir(dirname(destination),{recursive:true});await copyFile(await file(resolve(modules,document.id),item.path),destination)}}else if(await readFile(target,'utf8')!==generated)throw new Error('Generated catalog is stale. Run npm run modules:generate and include it in the PR.')
console.log('Validated '+documents.size+' module folders; '+selected.length+' version-pinned catalog entries'+(baseCommit?'; version bumps checked against '+baseCommit:'.'))
