// Explicit local logger integration check, never part of npm check or CI.
// Reads only the owner's original OS. Private intermediate objects can contain
// stock-derived USB descriptors; output MUST stay outside the checkout.
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {createStaticColdFireRuntime} from '../src/engine/coldfire-runtime.ts'
import {installCoreLogger,loggerExternals} from '../src/engine/core-logger.ts'
import {createRuntimeBootstrap} from '../src/engine/bootstrap.ts'
import {defaultChoosers,validateChoosers} from '../src/engine/choosers.ts'
import {resolveSelection} from '../src/catalog/modules.ts'
import {readRequestedObject,requestedFacts,selectedRequestedGroups} from '../src/engine/requested-modules.ts'
import {readColdFirePackage} from '../src/engine/coldfire-package.ts'
const [stockFile,output]=process.argv.slice(2),root=fileURLToPath(new URL('../',import.meta.url))
if(!stockFile||!output||process.argv.length!==4)throw new Error('Usage: node scripts/verify-core-logger-native.mjs original-main-os.bin NEW-private-output-outside-repo')
const out=path.resolve(output)
if(out===root.slice(0,-1)||out.startsWith(root))throw new Error('Private output must stay outside the repository.')
fs.mkdirSync(out,{recursive:false})
const original=fs.readFileSync(stockFile),sha=b=>createHash('sha256').update(b).digest('hex')
assert.equal(sha(original),'164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e')
const pkg=JSON.parse(fs.readFileSync(new URL('../src/engine/assets/core-logger.json',import.meta.url)))
const cf=JSON.parse(fs.readFileSync(new URL('../src/engine/assets/coldfire-packages.json',import.meta.url)))
const variants=[[],['tapeecho'],['euclid'],['tapeecho','euclid'],['analog-bassdrum'],['midi-scenes'],['quantizer'],['usb-audio-out-tracks-main-cue'],['quantizer','usb-audio-out-tracks-main-cue'],['tapeecho','euclid','analog-bassdrum','quantizer','usb-audio-out-tracks-main-cue'],['midi-scenes','quantizer','usb-audio-out-tracks-main-cue'],['tapeecho','euclid','analog-bassdrum','midi-scenes','quantizer','usb-audio-out-tracks-main-cue']]
const proofs=[]
for(const [index,ids] of variants.entries()){
 const dir=path.join(out,String(index));fs.mkdirSync(dir)
 let runtime
 try { runtime=await createStaticColdFireRuntime(ids,original) }
 catch(error) {
  if(!ids.includes('midi-scenes')||!(error instanceof Error)||error.message!=='Requested object version differs from the catalog.')throw error
  proofs.push({moduleIds:ids,refused:error.message})
  console.log(ids.join('+')+': correctly refuses the existing uncompiled MIDI Scenes version.')
  continue
 }
 const rows=[]
 const selected=selectedRequestedGroups(ids)
 for(const module of resolveSelection(ids)){
  if(['tapeecho','euclid'].includes(module.id))rows.push({pkg:cf.packages.find(p=>p.label===module.id),unit:await readColdFirePackage(module.id)})
  for(const p of requestedFacts.objects.filter(p=>p.moduleId===module.id&&p.dram&&selected.some(g=>g.moduleId===p.moduleId)))rows.push({pkg:p,unit:await readRequestedObject(p.label,original)})
 }
 if(selected.some(g=>g.moduleId==='usb-midi'))for(const p of requestedFacts.objects.filter(p=>p.moduleId==='usb-midi'))rows.push({pkg:p,unit:await readRequestedObject(p.label,original)})
 const objs=[]
 for(const [i,{pkg:p,unit}] of rows.entries()){
  const bytes=Buffer.from(p.code,'hex'),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),sections=view.getUint32(32),stride=view.getUint16(46)
  for(const s of unit.object.sections)if(s.type!==8&&s.data.length)bytes.set(s.data,view.getUint32(sections+s.index*stride+16))
  const name=path.join(dir,i+'.o');fs.writeFileSync(name,bytes);objs.push(name)
 }
 const core=path.join(dir,'core.o');fs.writeFileSync(core,Buffer.from(pkg.code,'hex'));objs.push(core)
 const elf=path.join(dir,'runtime.elf'),bin=path.join(dir,'runtime.bin')
 execFileSync('m68k-elf-ld',['-Ttext=0x40a955e0',...Array.from(loggerExternals(runtime.reserveBytes),([k,v])=>'--defsym='+k+'=0x'+v.toString(16)),'-o',elf,...objs],{stdio:'pipe'})
 execFileSync('m68k-elf-objcopy',['-O','binary',elf,bin])
 assert.deepEqual(Buffer.from(runtime.bytes),fs.readFileSync(bin),'native link '+ids.join('+'))
 const nativeSymbols=Object.fromEntries(execFileSync('m68k-elf-nm',[elf],{encoding:'utf8'}).trim().split('\n').map(l=>l.trim().split(/\s+/)).filter(f=>f.length===3).map(f=>[f[2],parseInt(f[0],16)]))
 for(const [name,value] of runtime.symbols)if(!name.includes('::'))assert.equal(nativeSymbols[name],value,name)
 const profile=defaultChoosers(ids),{hidden}=validateChoosers(ids,profile)
 const log=await installCoreLogger(runtime,original,ids,{...profile,hidden})
 const bootstrap=await createRuntimeBootstrap(runtime.bytes,runtime.reserveBytes-8192)
 const proof={moduleIds:ids,coreSource:pkg.sourceSha256,runtimeBytes:runtime.bytes.length,reserveBytes:runtime.reserveBytes,configuration:log.configuration,configurationHash:log.configurationHash,runtimeSha256:sha(runtime.bytes),appendSha256:sha(bootstrap.append),layout:bootstrap.layout}
 proofs.push(proof)
 console.log((ids.join('+')||'core only')+': GNU runtime bytes and symbols match; core configuration installed; staging stays below retained RAM.')
}
fs.writeFileSync(path.join(out,'proofs.json'),JSON.stringify({kind:'core-logger-native-link',coreSource:pkg.sourceSha256,stockSha256:sha(original),proofs},null,2)+'\n')
console.log(proofs.filter(p=>!p.refused).length+' native link cases and '+proofs.filter(p=>p.refused).length+' existing-version refusals passed. This does not replace full-image, browser-worker or hardware qualification.')
