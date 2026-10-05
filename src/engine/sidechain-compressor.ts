import packageData from './assets/sidechain-package.json' with { type: 'json' }
import { defaultChoosers } from './choosers.ts'
type Layout = { schema: number; id: string; version: string; osBytes: number; baseSha256: string; imageSha256: string; upstreamRevision: string; authorRevision: string; writes: { offset: number; bytes: number; guardSha256: string; blob?: string; stockCopy?: { offset: number; bytes: number; sha256: string }; edits?: { offset: number; hex: string }[]; clear?: string; set?: string }[]; scope: string }
type SidechainPackage = { layout: Layout; blobs: Record<string,string>; blobSha256: Record<string,string> }
const hash = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)), byte => byte.toString(16).padStart(2,'0')).join('')
const decode = (hex: string) => {
  if (!/^(?:[a-f0-9]{2})+$/.test(hex)) throw new Error('Invalid sidechain source bytes.')
  return Uint8Array.from(hex.match(/../g)!, x => parseInt(x,16))
}
export async function reconstructSidechain(original: Uint8Array, pkg: SidechainPackage = packageData) {
  const { layout, blobs, blobSha256 } = pkg
  if (layout.schema !== 1 || layout.id !== 'sidechain-compressor' || layout.version !== '0.1.0-experimental' || layout.upstreamRevision !== 'f80ecfeabc187a33403588678e707443161afc96' || layout.authorRevision !== 'd3e0801a5f666abc04bc05fc1cb37969d7fb38d0') throw new Error('Invalid pinned sidechain package.')
  if (original.length !== layout.osBytes || await hash(original) !== layout.baseSha256) throw new Error('Sidechain Compressor requires unmodified original OS 1.40C.')
  const result = original.slice()
  let end = 0
  for (const row of layout.writes) {
    if (!Number.isSafeInteger(row.offset) || row.offset < end || !Number.isSafeInteger(row.bytes) || row.bytes < 1 || row.offset + row.bytes > original.length) throw new Error('Invalid sidechain write extent.')
    if (await hash(original.subarray(row.offset,row.offset+row.bytes)) !== row.guardSha256) throw new Error('Sidechain stock-site fingerprint differs.')
    let bytes: Uint8Array
    if (row.blob) {
      bytes = decode(blobs[row.blob])
      if (await hash(bytes) !== blobSha256[row.blob]) throw new Error('Sidechain authored source package differs.')
    } else if (row.stockCopy) {
      const copy = row.stockCopy
      if (!Number.isSafeInteger(copy.offset) || copy.offset < 0 || copy.bytes !== row.bytes || copy.offset + copy.bytes > original.length) throw new Error('Invalid inherited sidechain descriptor extent.')
      bytes = original.slice(copy.offset,copy.offset+copy.bytes)
      if (await hash(bytes) !== copy.sha256) throw new Error('Sidechain inherited descriptor differs.')
      for (const edit of row.edits ?? []) {
        const value = decode(edit.hex)
        if (!Number.isSafeInteger(edit.offset) || edit.offset < 0 || edit.offset + value.length > bytes.length) throw new Error('Invalid sidechain descriptor field.')
        bytes.set(value,edit.offset)
      }
    } else {
      bytes = original.slice(row.offset,row.offset+row.bytes)
      const clear = decode(row.clear!), set = decode(row.set!)
      if (clear.length !== row.bytes || set.length !== row.bytes) throw new Error('Invalid sidechain masked field extent.')
      for (let i=0;i<bytes.length;i++) {
        if (clear[i] & set[i]) throw new Error('Conflicting sidechain field masks.')
        bytes[i] = (bytes[i] & ~clear[i]) | set[i]
      }
    }
    if (bytes.length !== row.bytes) throw new Error('Sidechain source length differs from its placement.')
    result.set(bytes,row.offset); end = row.offset + row.bytes
  }
  if (await hash(result) !== layout.imageSha256) throw new Error('Sidechain output differs from the verified native image.')
  return result
}
export async function composeSidechain(original: Uint8Array) {
  const bytes = await reconstructSidechain(original)
  const chooser = defaultChoosers([],true)
  return { bytes, chooser: { fx1: chooser.fx1, fx2: chooser.fx2.filter(key => key !== 'SPRING REV'), hidden: ['SPRING REV'] }, dsp: [], runtime: { reservedBytes: 0, bytes: 0, stage: 0, stageEnd: 0 }, caveCursor: 0x400d6d86, overflowCursor: 0 }
}
