// Explicit private developer check; never part of visitor builds or npm run check.
// Reads the user's verified firmware in memory and emits hashes/counts only.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { decodeFirmware, encodeFirmware } from '../src/engine/elek.ts'
import { decodeElup } from '../src/engine/elup.ts'
import { composeOs } from '../src/engine/compose-os.ts'
import { defaultChoosers } from '../src/engine/choosers.ts'
import { CATALOG_SOURCE } from '../src/catalog/modules.ts'
import { FIRMWARE_VERSION } from '../src/engine/protocol.ts'
import { inspectBaseFirmware } from '../src/engine/base.ts'
const [file,proofFile,packingFile]=process.argv.slice(2)
if(!file||!proofFile||!packingFile||process.argv.length!==5) throw new Error('Usage: node scripts/verify-utility-native.mjs <own-1.40C.bin> <native-proof.json> <native-packaging-proof.json>')
const sha=b=>createHash('sha256').update(b).digest('hex')
const source=new Uint8Array(readFileSync(file)),stock=decodeFirmware(source),before=sha(stock.mainOs),facts=JSON.parse(readFileSync(proofFile,'utf8'))
const buffer=b=>new Uint8Array(b).buffer
await inspectBaseFirmware(buffer(source),'local-1.40C.bin')
assert.equal(facts.schema,1);assert.equal(facts.revision,CATALOG_SOURCE.revision);assert.equal(facts.staticStock,true);assert.equal(facts.sourceSha256,before)
const visible=['miniverb','tapeecho','euclid','repitch','analog-bassdrum','usb-audio-out-tracks-main-cue','quantizer','previewvol','cc-map']
const key=p=>[...p.ids].sort().join('+')+':'+p.keepStockFx2
const packing=JSON.parse(readFileSync(packingFile,'utf8')),packByKey=new Map(packing.proofs.map(p=>[key(p),p]))
assert.equal(packing.schema,1);assert.equal(packing.revision,CATALOG_SOURCE.revision);assert.equal(packing.sourceUpgradeSha256,sha(source));assert.equal(packing.version,FIRMWARE_VERSION);assert.equal(packByKey.size,8)
const expected=new Set()
for(const [ids,keep] of [[visible,false],[visible,true]])for(let mask=0;mask<2**ids.length;mask++)expected.add(key({ids:ids.filter((_,bit)=>mask>>bit&1),keepStockFx2:keep}))
assert.equal(facts.proofs.length,1024);assert.equal(expected.size,1024)
let built=0,refused=0,packed=0;const seen=new Set()
for(const proof of facts.proofs){
 const identity=key(proof);assert.ok(expected.has(identity)&&!seen.has(identity),'complete unique native profile');seen.add(identity)
 let result,error
 try{result=await composeOs(stock.mainOs,proof.ids,defaultChoosers(proof.ids,proof.keepStockFx2))}catch(e){error=e.message}
 if(proof.error){assert.ok(error,identity+': native refused, browser accepted');refused++;continue}
 assert.equal(error,undefined,identity+': unexpected browser rejection');assert.equal(result.bytes.length,proof.bytes,identity);assert.equal(sha(result.bytes),proof.sha256,identity);built++
 // Native ELEK and ELUP identities for each utility, both together,
 // and both with Repitch, Quantizer and USB; stock FX2 hidden/retained.
 const packProof=packByKey.get(identity)
 if(packProof){
  assert.equal(proof.sha256,packProof.mainSha256)
  const update=encodeFirmware(stock,result.bytes,FIRMWARE_VERSION),container=decodeElup(update).container
  assert.equal(update.length,packProof.bytes);assert.equal(sha(update),packProof.sha256)
  assert.equal(container.length,packProof.containerBytes);assert.equal(sha(container),packProof.containerSha256)
  assert.equal(sha(decodeFirmware(update).mainOs),proof.sha256);packed++
 }
}
const changed=stock.mainOs.slice();changed[100]^=1
for(const id of ['previewvol','cc-map'])await assert.rejects(composeOs(changed,[id],defaultChoosers([id],false)),/original|unmodified/)
const invalid=source.slice();invalid[100]^=1
await assert.rejects(inspectBaseFirmware(buffer(invalid),'changed.bin'),/unmodified/)
await assert.rejects(inspectBaseFirmware(new ArrayBuffer(4),'truncated.bin'),/different size/)
await assert.rejects(composeOs(stock.mainOs,['octakit']),/Unknown module/)
assert.equal(packed,8);assert.equal(sha(stock.mainOs),before);assert.equal(sha(source),'34695b606eb00e1b4dded5fd0c4b66f3a460522a632e47d7416dbd220599e1ad')
console.log(JSON.stringify({selections:1024,byteIdentical:built,matchingRefusals:refused,nativePackagingMatches:packed,rejections:'passed',firmwareWritten:false}))
