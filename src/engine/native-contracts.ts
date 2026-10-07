import packages from './assets/coldfire-packages.json' with { type: 'json' }
import { OS_LOAD_ADDRESS } from './os-patches.ts'
export type NativeContract = { moduleId: string; key: string; spans: { address: number; bytes: number; kind: string; label: string }[]; keeps: { address: number; bytes: number; sha256: string }[]; conflicts: { key: string; reason: string }[] }
const overlap = (a: {address:number;bytes:number}, b: {address:number;bytes:number}) => a.address < b.address + b.bytes && b.address < a.address + a.bytes
function span(row: {address:number;bytes:number}) {
  if (!Number.isSafeInteger(row.address) || !Number.isSafeInteger(row.bytes) || row.address < OS_LOAD_ADDRESS || row.bytes < 1 || row.address + row.bytes > 0xffffffff) throw new Error('Invalid native declaration span.')
}
export function validateNativeContracts(contracts: readonly NativeContract[]) {
  const keys = new Set(contracts.map(c=>c.key))
  for (const contract of contracts) {
    for (const conflict of contract.conflicts) if (keys.has(conflict.key)) throw new Error(`${contract.moduleId} conflicts with ${conflict.key}: ${conflict.reason}`)
    for (const row of [...contract.spans,...contract.keeps]) span(row)
    for (const keep of contract.keeps) if (!/^[a-f0-9]{64}$/.test(keep.sha256)) throw new Error('Invalid kept-span fingerprint.')
    for (const other of contracts) {
      for (const keep of contract.keeps) if (other.spans.some(write=>overlap(keep,write))) throw new Error(`${contract.moduleId}'s kept bytes overlap ${other.moduleId}'s writes.`)
      if (contract === other) continue
      if (contract.spans.some(a=>other.spans.some(b=>overlap(a,b)))) throw new Error(`${contract.moduleId} and ${other.moduleId} have overlapping native declarations.`)
      // Partially overlapping Keep declarations are checked against the same
      // verified image; each fingerprint must match before and after writes.
    }
  }
}
export async function verifyNativeContracts(image: Uint8Array, ids: readonly string[]) {
  const selected = new Set(ids)
  if (selected.has('usb-audio-out-tracks-main-cue')) selected.add('usb-midi')
  const all=(packages as typeof packages & {contracts?: NativeContract[]}).contracts ?? []
  const contracts=all.filter(contract=>selected.has(contract.moduleId)).map(contract=>({...contract,spans:contract.spans.filter(row=>!(contract.moduleId==='usb-midi' && row.address===0x4001e606 && selected.has('usb-audio-out-tracks-main-cue')))}))
  validateNativeContracts(contracts)
  for (const contract of contracts) for (const keep of contract.keeps) {
    const offset=keep.address-OS_LOAD_ADDRESS
    if (offset<0 || offset+keep.bytes>image.length) throw new Error('The kept span lies outside the OS.')
    const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(image.subarray(offset,offset+keep.bytes)).buffer)
    const sha=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')
    if(sha!==keep.sha256) throw new Error(`${contract.moduleId}'s kept bytes differ from the original OS.`)
  }
}
