import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { materializeModuleObject, type CompiledElemodPlan } from './module-object'
import type { LinkDevice } from './elemod'

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const base = 0x40000000
function fixture() {
  const stock = Uint8Array.from({ length: 1024 }, (_, i) => i % 2 ? 0x71 : 0x4e)
  const view = new DataView(stock.buffer)
  view.setUint16(0x100, 0x41f9); view.setUint32(0x102, base + 0x100); view.setUint16(0x106, 0x4e75)
  view.setUint16(0x200, 0x4eb9); view.setUint32(0x202, base + 0x100)
  const device: LinkDevice = { key: 'test-machine', machine: 'digitakt', name: 'Synthetic', mainLoad: base,
    releases: [{ version: '1.0', syxSha256: 'a'.repeat(64), mainSha256: sha(stock), mainLength: stock.length }],
    areas: { ddr: [0x41000000, 0x41001000], sram: [0x50000000, 0x50001000] }, ddr: [0x41000000, 0x41001000], sramCode: [0x50000000, 0x50001000], fastTable: '', protected: [] }
  const plan: CompiledElemodPlan = { schemaVersion: 1, machine: 'digitakt', id: 'proof', version: '1.0', release: '1.0',
    module: { elemod: 2, id: 'proof', version: '1.0', target: { device: device.key, os: '1.0', syx_sha256: 'a'.repeat(64) },
      sections: { '.run': { parts: [['hex', '4e754e754e754e75']] } }, symbols: { handler: ['.run', 0], r_40000100: ['.run', 2] }, sites: [], contribute: [] },
    sites: [{ addr: '0x40000200', len: 6, stockSha256: sha(stock.subarray(0x200, 0x206)), op: 'keep2', target: 'handler' }], derive: null }
  return { stock, device, plan }
}
function fastPlan(plan: CompiledElemodPlan) {
  plan.sites = []
  plan.derive = { kind: 'fast_audio', note: 'Synthetic', release: '1.0', releases: ['1.0'], block: ['0x40000100', '0x40000108'], sram: ['0x50000000', '0x50001000'], callSites: [{ addr: '0x40000200', len: 6, stockSha256: fixture().plan.sites[0].stockSha256, target: '0x40000100' }] }
  return plan
}

function resumeFixture() {
  const { stock, device, plan } = fixture()
  plan.id = 'core'
  plan.module = { ...plan.module, id: 'core', sections: { '.boot': { parts: [['hex', '4e75']] }, '.run': { parts: [['hex', '0000000000004ef9000000004e75']] } },
    symbols: { mw_resume_settings: ['.run', 0], mw_hook_settings: ['.run', 12], mw_continue_settings: ['abs', base + 0x26] }, relocs: [] }
  plan.sites = [{ addr: '0x40000020', len: 6, stockSha256: sha(stock.subarray(0x20, 0x26)), op: 'jsr', target: 'mw_hook_settings' }]
  plan.stockResumes = [{ symbol: 'mw_resume_settings', ...plan.sites[0] }]
  return { stock, device, plan }
}

describe('local compiled module materialization', () => {
  it('fills kept opcode words from verified local stock without changing the source recipe', async () => {
    const { stock, device, plan } = fixture(), before = JSON.stringify(plan)
    const result = await materializeModuleObject(plan, stock, [device])
    expect(result.sites).toEqual([{ addr: '0x40000200', len: 6, stock_sha256: plan.sites[0].stockSha256, new: '4eb900000000', kind: 'code', relocs: [[2, 'abs32', 'sym:handler', 0]] }])
    expect(JSON.stringify(plan)).toBe(before)
  })
  it('rejects changed stock, changed patch guards, mismatched versions and out-of-image recipes', async () => {
    const { stock, device, plan } = fixture()
    const changed = stock.slice(); changed[0] ^= 1
    await expect(materializeModuleObject(plan, changed, [device])).rejects.toThrow('known image')
    await expect(materializeModuleObject({ ...plan, version: '2.0' }, stock, [device])).rejects.toThrow('identity mismatch')
    await expect(materializeModuleObject({ ...plan, sites: [{ ...plan.sites[0], stockSha256: 'b'.repeat(64) }] }, stock, [device])).rejects.toThrow('guard')
    await expect(materializeModuleObject({ ...plan, sites: [{ ...plan.sites[0], addr: '0x50000000' }] }, stock, [device])).rejects.toThrow('outside')
  })
  it('plans SRAM copies, fixups and call stubs locally', async () => {
    const { stock, device, plan } = fixture()
    const result = await materializeModuleObject(fastPlan(plan), stock, [device])
    expect(result.contribute).toEqual([
      { to: 'fa_copies', order: 0, data: '40000100500000000000000800000000', relocs: [], claims: [] },
      { to: 'fa_fixups', order: 0, data: '5000000250000000', relocs: [], claims: [[0x40000102, 0x40000106]] },
    ])
    expect(result.sites).toMatchObject([{ relocs: [[2, 'abs32', 'sym:r_40000100', 0]] }])
  })
  it('refuses branches outside a copied block and an unbudgeted SRAM destination', async () => {
    const { stock, device, plan } = fixture(), view = new DataView(stock.buffer)
    fastPlan(plan)
    view.setUint16(0x100, 0x6000); view.setUint16(0x102, 0x200)
    device.releases[0].mainSha256 = sha(stock)
    await expect(materializeModuleObject(plan, stock, [device])).rejects.toThrow('branch leaves')
    plan.derive!.sram = ['0x51000000', '0x51001000']
    await expect(materializeModuleObject(plan, stock, [device])).rejects.toThrow('SRAM budget')
  })

  it('fills a guarded core resume only in local memory and preserves its own continuation', async () => {
    const { stock, device, plan } = resumeFixture(), before = JSON.stringify(plan)
    const result = await materializeModuleObject(plan, stock, [device])
    expect(result.sections).toMatchObject({ '.run': { len: 14, parts: [['hex', '4e714e714e714ef9000000004e75']] } })
    expect(JSON.stringify(plan)).toBe(before)
  })
  it('rejects missing continuation bindings, changed placeholders and overlapping relocations', async () => {
    for (const change of ['binding', 'placeholder', 'relocation']) {
      const { stock, device, plan } = resumeFixture()
      if (change === 'binding') plan.module.symbols = { mw_resume_settings: ['.run', 0], mw_hook_settings: ['.run', 12] }
      if (change === 'placeholder') plan.module.sections = { '.boot': { parts: [['hex', '4e75']] }, '.run': { parts: [['hex', '0001000000004ef9000000004e75']] } }
      if (change === 'relocation') plan.module.relocs = [['.run', 2, 'abs32', 'abs', 1]]
      await expect(materializeModuleObject(plan, stock, [device])).rejects.toThrow(change === 'binding' ? 'binding' : change === 'placeholder' ? 'placeholder' : 'relocation')
    }
  })
  it('rejects PC-relative, control-flow and incomplete copied instructions', async () => {
    for (const opcode of ['41fa00024e71', '4eb940000100', '4e7141f94000']) {
      const { stock, device, plan } = resumeFixture()
      stock.set(Buffer.from(opcode, 'hex'), 0x20)
      device.releases[0].mainSha256 = sha(stock)
      plan.sites[0].stockSha256 = sha(stock.subarray(0x20, 0x26))
      plan.stockResumes![0].stockSha256 = plan.sites[0].stockSha256
      await expect(materializeModuleObject(plan, stock, [device])).rejects.toThrow('cannot be copied')
    }
  })
  it('rejects a resume for a module, a duplicate placeholder and a changed copy guard', async () => {
    const { stock, device, plan } = resumeFixture()
    plan.id = 'proof'; plan.module.id = 'proof'
    await expect(materializeModuleObject(plan, stock, [device])).rejects.toThrow('belong to a core')
    plan.id = 'core'; plan.module.id = 'core'
    plan.stockResumes!.push({ ...plan.stockResumes![0] })
    await expect(materializeModuleObject(plan, stock, [device])).rejects.toThrow('placeholder')
    plan.stockResumes!.pop()
    plan.stockResumes![0].stockSha256 = 'b'.repeat(64)
    await expect(materializeModuleObject(plan, stock, [device])).rejects.toThrow('binding')
  })
  it('guards stock helper addresses and bytes before materializing the core', async () => {
    const { stock, device, plan } = resumeFixture()
    plan.module.symbols = { ...(plan.module.symbols as Record<string, unknown>), mw_stock_allocate: ['abs', base + 0x40] }
    plan.stockRoutineBindings = { mw_stock_allocate: { addr: '0x40000040', len: 8, stockSha256: sha(stock.subarray(0x40, 0x48)) } }
    await expect(materializeModuleObject(plan, stock, [device])).resolves.toHaveProperty('sections')
    plan.stockRoutineBindings.mw_stock_allocate.addr = '0x40000042'
    await expect(materializeModuleObject(plan, stock, [device])).rejects.toThrow('helper binding')
    plan.stockRoutineBindings.mw_stock_allocate.addr = '0x40000040'
    plan.stockRoutineBindings.mw_stock_allocate.stockSha256 = 'b'.repeat(64)
    await expect(materializeModuleObject(plan, stock, [device])).rejects.toThrow('guard')
  })
})
