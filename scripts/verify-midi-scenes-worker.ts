// Explicit private developer verification. Never part of visitor builds or application checks.
import { MODULES } from '../src/catalog/modules'
import { decodeFirmware } from '../src/engine/elek'
import type { EngineRequest, EngineResponse } from '../src/engine/protocol'
const worker = new Worker(new URL('../src/engine/firmware.worker.ts', import.meta.url), { type: 'module' })
const result = document.querySelector<HTMLPreElement>('#result')!
let next = 0
function request(body: Omit<Extract<EngineRequest, {type:'inspect'}>, 'id'> | Omit<Extract<EngineRequest, {type:'build'|'validate'}>, 'id'> | {type:'clear'}): Promise<EngineResponse> {
  const id = ++next
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { worker.removeEventListener('message', listener); reject(new Error('Worker timeout')) }, 30000)
    const listener = (event: MessageEvent<EngineResponse>) => {
      if(event.data.id !== id || event.data.type === 'progress') return
      clearTimeout(timeout); worker.removeEventListener('message', listener); resolve(event.data)
    }
    worker.addEventListener('message', listener)
    worker.postMessage({...body,id})
  })
}
const sha = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)), b=>b.toString(16).padStart(2,'0')).join('')
const assert = (passed: boolean, message: string) => { if(!passed) throw new Error(message) }
document.querySelector<HTMLInputElement>('#firmware')!.onchange = async event => {
  try {
    result.textContent = 'Verifying shared worker…'
    const file = (event.target as HTMLInputElement).files![0], original = new Uint8Array(await file.arrayBuffer())
    const inputSha = await sha(original)
    assert(inputSha === '34695b606eb00e1b4dded5fd0c4b66f3a460522a632e47d7416dbd220599e1ad', 'Original local 1.40C update required')
    const inspect = () => request({type:'inspect',name:file.name,buffer:original.slice().buffer})
    assert((await inspect()).type === 'inspection','Inspection failed')
    const expected = 'd7c792e0ec9b28e1b674e92526b2fa9a8a8279655dbd66a7b59495e5d5c54007'
    let mainSha = '', builtReport
    for(const keepStockFx2 of [false,true]) {
      const validated = await request({type:'validate',moduleIds:['midi-scenes'],keepStockFx2})
      assert(validated.type === 'validated', JSON.stringify(validated))
      const built = await request({type:'build',moduleIds:['midi-scenes'],keepStockFx2})
      if(built.type !== 'built') throw new Error(JSON.stringify(built))
      mainSha = await sha(decodeFirmware(new Uint8Array(built.buffer)).mainOs)
      assert(built.sha256 === expected && await sha(new Uint8Array(built.buffer)) === expected, 'Native update mismatch')
      assert(mainSha === 'debb24090cada4be00bc70880136f14e813b0d3a9018b516f922d33671bd9b87', 'Native MAIN mismatch')
      assert(built.report.version === 'MIDISC2.0' && built.report.moduleVersions['midi-scenes'] === '0.2.4-experimental', 'Release version mismatch')
      assert(built.report.runtimeBytes === 0, 'Unexpected generic runtime overlay')
      builtReport = built.report
    }
    let mixedSelectionsRefused = 0
    for(const companion of MODULES.filter(m=>m.id !== 'midi-scenes')) {
      const refused = await request({type:'build',moduleIds:['midi-scenes',companion.id],keepStockFx2:false})
      assert(refused.type === 'error', 'Mixed build accepted: '+companion.id)
      mixedSelectionsRefused++
    }
    const changed = original.slice(); changed[100] ^= 1
    const changedResult = await request({type:'inspect',name:file.name,buffer:changed.buffer})
    assert(changedResult.type === 'error', 'Changed base accepted')
    assert((await request({type:'build',moduleIds:['midi-scenes'],keepStockFx2:false})).type === 'error', 'Stale base retained after failed inspection')
    const truncated = await request({type:'inspect',name:file.name,buffer:original.slice(0,-4).buffer})
    assert(truncated.type === 'error', 'Truncated base accepted')
    assert((await inspect()).type === 'inspection', 'Reinspection failed')
    await request({type:'clear'})
    assert((await request({type:'build',moduleIds:['midi-scenes'],keepStockFx2:false})).type === 'error','Clear retained firmware')
    assert(await sha(original) === inputSha, 'Input changed')
    result.textContent = JSON.stringify({status:'passed',mainSha256:mainSha,updateSha256:expected,mixedSelectionsRefused,changedBaseRefused:true,truncatedBaseRefused:true,failedInspectionClearsBase:true,clearRefusesBuild:true,originalUnchanged:true,stockMenuOptionsEquivalent:true,firmwareSaved:false,firmwareUploaded:false,report:builtReport},null,2)
  } catch(error) { result.textContent = JSON.stringify({status:'failed',message:error instanceof Error?error.message:String(error)}) }
}
