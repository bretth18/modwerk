// SPDX-License-Identifier: GPL-3.0-or-later
// Materialize CI-compiled, source-only recipes using the owner's own stock image.
// FAST AUDIO planning follows irpina/digihealth build.py (GPL-2.0-or-later).
import type { ElemodBuildSpec, ElemodSite } from '../../catalog/module-contract-v3.ts'
import { FPU, ILLEGAL, LINEF, PCREL, decodeColdFire, readerAt, type Flow } from './coldfire-isa.ts'
import { LINK_DEVICES, ModError, parseElemod, type LinkDevice } from './elemod.ts'
import { sha256Hex } from './hash.ts'

export type CompiledElemodPlan = {
  schemaVersion: 1; machine: string; id: string; version: string; release: string
  module: Record<string, unknown>; sites: ElemodSite[]; derive: ElemodBuildSpec['derive']
  stockResumes?: { symbol: string; addr: string; len: number; stockSha256: string }[]
  stockRoutineBindings?: Record<string, { addr: string; len: number; stockSha256: string }>
}
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
const words = (...values: number[]) => { const bytes = new Uint8Array(values.length * 4), view = new DataView(bytes.buffer); values.forEach((value, i) => view.setUint32(i * 4, value)); return hex(bytes) }
const address = (text: string) => { if (!/^0x[0-9a-f]{8}$/i.test(text)) throw new ModError('Invalid recipe address'); return Number(text) }

/** Returns an elemod document in local memory only; it must never enter an upload or CI. */
export async function materializeModuleObject(plan: CompiledElemodPlan, stock: Uint8Array, devices: readonly LinkDevice[] = LINK_DEVICES): Promise<Record<string, unknown>> {
  if (plan.schemaVersion !== 1) throw new ModError('Unsupported compiled recipe')
  const parsed = parseElemod(plan.module, plan.id, devices)
  if (parsed.format !== 2 || parsed.id !== plan.id || parsed.version !== plan.version || parsed.release.version !== plan.release || parsed.device.machine !== plan.machine || parsed.sites.length) throw new ModError('Compiled recipe identity mismatch')
  if (stock.length !== parsed.release.mainLength || await sha256Hex(stock) !== parsed.release.mainSha256) throw new ModError('The stock main OS is not the known image')
  const base = parsed.device.mainLoad, view = new DataView(stock.buffer, stock.byteOffset, stock.byteLength)
  const guarded = async (site: { addr: string; len: number; stockSha256: string }) => {
    const offset = address(site.addr) - base
    if (!Number.isSafeInteger(site.len) || site.len <= 0 || offset < 0 || offset + site.len > stock.length) throw new ModError('Recipe patch is outside the image')
    if (await sha256Hex(stock.subarray(offset, offset + site.len)) !== site.stockSha256) throw new ModError('Recipe stock guard does not match')
    return offset
  }
  if (plan.stockRoutineBindings) {
    if (parsed.id !== 'core' || !parsed.sections['.boot']) throw new ModError('Stock helper bindings belong to a core')
    for (const [symbol, binding] of Object.entries(plan.stockRoutineBindings)) {
      const definition = parsed.symbols.get(symbol)
      if (!/^mw_stock_[a-z_]+$/.test(symbol) || !Number.isSafeInteger(binding.len) || binding.len < 2 || binding.len > 256 || !definition || definition[0] !== 'abs' || definition[1] !== address(binding.addr)) throw new ModError('Stock helper binding changed')
      await guarded(binding)
    }
  }
  const sites: Record<string, unknown>[] = []
  const makeSite = async (site: ElemodSite) => {
    const offset = await guarded(site), bytes = new Uint8Array(site.len), patch = new DataView(bytes.buffer)
    let operand = 2
    if (site.op === 'ptr') { if (site.len !== 4) throw new ModError('Pointer patch needs four bytes'); operand = 0 }
    else if (site.op === 'keep2') {
      if (site.len !== 6) throw new ModError('keep2 patch needs six bytes')
      const opcode = view.getUint16(offset)
      if (![0x4eb9, 0x4ef9].includes(opcode) && (opcode & 0xf1ff) !== 0x41f9) throw new ModError('keep2 needs an absolute call, jump or address load')
      patch.setUint16(0, opcode)
    } else {
      if (!['jsr', 'jmp'].includes(site.op) || site.len < 6 || site.len % 2) throw new ModError('Invalid call or jump patch')
      patch.setUint16(0, site.op === 'jsr' ? 0x4eb9 : 0x4ef9)
      for (let at = 6; at < site.len; at += 2) patch.setUint16(at, 0x4e71)
    }
    if (typeof site.target !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(site.target)) throw new ModError('Invalid recipe symbol')
    sites.push({ addr: site.addr, len: site.len, stock_sha256: site.stockSha256, new: hex(bytes), kind: site.op === 'ptr' ? 'data' : 'code', relocs: [[operand, 'abs32', 'sym:' + site.target, 0]] })
  }
  for (const site of plan.sites) await makeSite(site)
  const contribute = [...((plan.module.contribute ?? []) as Record<string, unknown>[])]
  const derive = plan.derive
  if (derive) {
    if (derive.kind !== 'fast_audio' || !derive.releases.includes(plan.release) || parsed.device.machine !== 'digitakt') throw new ModError('Unsupported local derivation')
    const lo = address(derive.block[0]), hi = address(derive.block[1]), dst = address(derive.sram[0]), end = address(derive.sram[1])
    const length = Math.ceil((hi - lo) / 4) * 4
    if (lo < base || hi <= lo || lo % 2 || hi % 2 || hi > base + stock.length || dst + length > end || !Object.values(parsed.device.areas).some(([start, limit]) => start <= dst && end <= limit)) throw new ModError('FAST AUDIO block is outside its image or SRAM budget')
    contribute.push({ to: 'fa_copies', order: 0, data: words(lo, dst, length, 0), relocs: [], claims: [] })
    let previous: Flow | undefined, at = lo
    while (at < hi) {
      const instruction = decodeColdFire(readerAt(stock, base)(at), at)
      const bad = instruction.flags & (ILLEGAL | LINEF | FPU)
      const padding = bad && instruction.length === 2 && view.getUint16(at - base) === 0 && previous && ['rts', 'rte', 'bra', 'jmp'].includes(previous)
      if (bad && !padding || at + instruction.length > hi) throw new ModError('FAST AUDIO block has an unsupported instruction')
      if (instruction.flags & PCREL) {
        const target = at + 2 + view.getInt16(at - base + 2)
        if (target < lo || target >= hi) throw new ModError('FAST AUDIO PC-relative reference leaves its block')
      }
      if (instruction.target !== undefined && instruction.flow !== 'jsr' && (instruction.target < lo || instruction.target >= hi)) throw new ModError('FAST AUDIO branch leaves its block')
      for (let offset = 2; offset < instruction.length - 3; offset += 2) {
        const value = view.getUint32(at - base + offset)
        if (lo <= value && value < hi) contribute.push({ to: 'fa_fixups', order: 0, data: words(dst + at - lo + offset, dst + value - lo), relocs: [], claims: [[at + offset, at + offset + 4]] })
      }
      previous = instruction.flow; at += instruction.length
    }
    for (const site of derive.callSites) {
      const offset = await guarded(site), target = address(site.target)
      if (target < lo || target >= hi || view.getUint32(offset + 2) !== target) throw new ModError('FAST AUDIO call target is outside its block or changed')
      await makeSite({ ...site, op: 'keep2', target: 'r_' + target.toString(16).padStart(8, '0') })
    }
  }
  let sections = plan.module.sections
  if (plan.stockResumes?.length) {
    if (parsed.id !== 'core' || !parsed.sections['.boot']) throw new ModError('Stock resumes belong to a core')
    const section = parsed.sections['.run']
    if (!section || !('parts' in section) || section.parts.some(part => part.kind !== 'hex')) throw new ModError('Stock resume needs source-only run bytes')
    const run = new Uint8Array(section.length)
    let end = 0
    for (const part of section.parts) if (part.kind === 'hex') { run.set(part.bytes, end); end += part.bytes.length }
    const ranges: [number, number][] = []
    for (const resume of plan.stockResumes) {
      if (!/^mw_resume_(settings|render_in|render_out)$/.test(resume.symbol) || !Number.isSafeInteger(resume.len) || resume.len < 6 || resume.len > 32 || resume.len % 2) throw new ModError('Invalid stock resume')
      const definition = parsed.symbols.get(resume.symbol), continuation = parsed.symbols.get(resume.symbol.replace('resume', 'continue'))
      const site = plan.sites.find(site => site.addr === resume.addr && site.len === resume.len && site.stockSha256 === resume.stockSha256 && site.target === resume.symbol.replace('resume', 'hook'))
      if (!definition || definition[0] !== '.run' || !continuation || continuation[0] !== 'abs' || continuation[1] !== address(resume.addr) + resume.len || !site) throw new ModError('Stock resume binding changed')
      const offset = definition[1], limit = offset + resume.len
      if (offset < 0 || limit > run.length || offset % 2 || run.subarray(offset, limit).some(byte => byte !== 0) || ranges.some(([lo, hi]) => lo < limit && offset < hi)) throw new ModError('Stock resume placeholder changed')
      if (parsed.relocs.some(reloc => reloc.section === '.run' && reloc.offset < limit && offset < reloc.offset + (reloc.type === 'pc16' ? 2 : 4))) throw new ModError('Stock resume overlaps a relocation')
      const source = await guarded(resume)
      let at = address(resume.addr)
      while (at < address(resume.addr) + resume.len) {
        const instruction = decodeColdFire(readerAt(stock, base)(at), at)
        if (instruction.flags & (ILLEGAL | LINEF | FPU | PCREL) || instruction.flow !== 'none' || at + instruction.length > address(resume.addr) + resume.len) throw new ModError('Stock resume contains an instruction that cannot be copied')
        at += instruction.length
      }
      run.set(stock.subarray(source, source + resume.len), offset)
      ranges.push([offset, limit])
    }
    sections = { ...(plan.module.sections as Record<string, unknown>), '.run': { align: section.align, len: run.length, parts: [['hex', hex(run)]] } }
  }
  const module = { ...plan.module, sections, sites, contribute }
  parseElemod(module, plan.id, devices)
  return module
}
