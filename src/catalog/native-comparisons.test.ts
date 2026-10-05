import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import stock from '../engine/assets/stock-dsp-metadata.json'
import { comparisonPool, coverageSelections, selectionKey } from '../../scripts/module-coverage.mjs'
import { moduleNativeSourceSha256 } from '../../scripts/module-qualification.mjs'
import { AVAILABLE_MODULES } from './availability'
import { MODULE_DOCUMENTS_BY_ID } from './documents'
import { CATALOG_SOURCE } from './modules'

// Compared with native octabam by the earlier every-combination suites (docs/VERIFICATION.md), at this code. A change to a
// module's code needs a record from `npm run module:verify` instead.
const COMPARED_BEFORE_RECORDS: Readonly<Record<string, string>> = {
  miniverb: 'fb8b72025be70d4e62021a6699992f9cdeb63684cef8db66949a41f6b1d887d0',
  tapeecho: '909110e5e066943bb304e3020775cc4fcf6e6ae36492eb7e328888938ac9a257',
  euclid: '44e44e1575e4bbf638894ffa51b06ca739e78e0f9bb1995bfd3a77190549d5ea',
  repitch: '21cb5bd5724890ed877c04ad2f6b5e7b554ee49904d2901960ece6d11f277437',
  tapehead: '9b005a4f1a186cc7731c5bf973d59ebef9538190ac63fddba26f0e60c96c8646',
  'analog-bassdrum': '24d5ebdc2c7ca54ca372c442e11fef0bd85b21d3a240dce0fc4b2ffa14e2d315',
  'usb-audio-out-tracks-main-cue': '430ff104d1488ca5117fb6f35550f4575547355bfcd17bd13a3740d20caa3b3a',
  quantizer: 'e7203592f0b312ac4833fec7aee714004f94a53c762a5e73f2279813520851de',
  previewvol: '86deed960c094df1d0d2a4a9d3a955a62e804175f2f22d8ac53f5eff141aeaca',
  'cc-map': '85ac180b75837d7681c74325b29a3a78416d3b2a8890fb6394f033c27993393d',
}

describe('native comparison records', () => {
  it('has a native comparison of the current code for every offered module', async () => {
    const pool = comparisonPool(AVAILABLE_MODULES.map(module => module.id))
    for (const module of AVAILABLE_MODULES) {
      if (module.id === 'midi-scenes') continue   // builds only on its own; its standalone parity is checked separately
      const document = MODULE_DOCUMENTS_BY_ID[module.id]
      const code = await moduleNativeSourceSha256(fileURLToPath(new URL('../../sdk/octabam/modules/' + module.id, import.meta.url)), document)
      const path = fileURLToPath(new URL('../../sdk/native-comparisons/' + module.id + '.json', import.meta.url))
      const hint = module.id + ': run npm run module:verify -- ' + module.id + ' --os <your OCTATRACK_OS1.40C.bin> (docs/ADD_A_MODULE.md, step 5)'
      if (!existsSync(path)) { expect(COMPARED_BEFORE_RECORDS[module.id], hint).toBe(code); continue }
      const record = JSON.parse(readFileSync(path, 'utf8'))
      expect([record.moduleId, record.revision, record.originalOsSha256]).toEqual([module.id, CATALOG_SOURCE.revision, stock.sourceSha256])
      expect(record.moduleSourceSha256, hint).toBe(code)
      // The pool can grow later: each newer module's own record covers it beside this one.
      expect(record.pool.every((id: string) => pool.includes(id) || MODULE_DOCUMENTS_BY_ID[id]), module.id).toBe(true)
      expect(record.selections.map((row: { moduleIds: string[]; keepStockFx2: boolean }) => selectionKey(row.moduleIds, row.keepStockFx2)))
        .toEqual(coverageSelections(module.id, record.pool).map(({ ids, keepStockFx2 }) => selectionKey(ids, keepStockFx2)))
      expect(record.summary.mismatches).toBe(0)
      expect(record.selections.every((row: { result: string }) => ['identical', 'masked', 'refused'].includes(row.result))).toBe(true)
    }
  })
})

describe('coverage sets', () => {
  it('compare a module alone, beside each other module and in the fullest selections, with and without stock FX2', () => {
    const pool = ['a', 'b', 'c', 'd', 'analog-bassdrum']
    const sets = new Set(coverageSelections('a', pool, { sample: 2 }).map(row => row.ids.join('+') + ':' + row.keepStockFx2))
    for (const ids of ['a', 'a+b', 'a+c', 'a+d', 'a+analog-bassdrum', 'a+b+c+d', 'a+c+d', 'a+b+d', 'a+b+c']) for (const keep of [true, false]) expect(sets).toContain(ids + ':' + keep)
    expect([...sets].filter(key => key.includes('analog-bassdrum'))).toEqual(['a+analog-bassdrum:true', 'a+analog-bassdrum:false'])
    expect(coverageSelections('a', pool)).toEqual(coverageSelections('a', pool))
    expect(() => coverageSelections('z', pool)).toThrow('not in the comparison pool')
  })
})
