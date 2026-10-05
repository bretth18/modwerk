import { describe, expect, it } from 'vitest'
import { composeChoosers, defaultChoosers, validateChoosers } from './choosers'
import metadata from './assets/chooser-metadata.json'
import proofs from './assets/composition-proofs.json'
import { MODULES } from '../catalog/modules'
import { moduleBuildPending } from '../catalog/build-support'
describe('effect chooser composition', () => {
  it('preserves stock effects and puts selected effects in their working slots', () => {
    const ids = MODULES.filter(module=>!moduleBuildPending(module.id)&&module.id!=='sidechain-compressor').map(module => module.id), profile = defaultChoosers(ids, true, true)
    expect(profile.fx1.slice(0, metadata.stockFx1.length)).toEqual(metadata.stockFx1)
    expect(profile.fx2.slice(0, metadata.stockFx2.length)).toEqual(metadata.stockFx2)
    for (const key of ['SPECTRUM','MODULATION','CHARACTER']) {
      expect(profile.fx1).toContain(key); expect(profile.fx2).not.toContain(key)
    }
    expect(profile.fx2).toContain('MINIVERB'); expect(profile.fx2).toContain('TAPE ECHO')
    expect(profile.fx1).not.toContain('MINIVERB'); expect(profile.fx1).not.toContain('TAPE ECHO')
    expect(profile.fx1).toContain('EUCLID'); expect(profile.fx2).toContain('EUCLID')
    expect(validateChoosers(ids, profile).hidden).toEqual(['SPECTRUM','MODULATION','CHARACTER'])
    const compact = defaultChoosers(ids, false)
    expect(compact.fx1).toEqual(profile.fx1)
    expect(compact.fx2).toEqual(['MINIVERB','TAPE ECHO','EUCLID','TAPEHEAD'])
  })
  it('without the loader, leaves out only the stock FX2 effects whose code the modules take', () => {
    const others = (ids: string[]) => metadata.stockFx2.filter(key => !defaultChoosers(ids).fx2.includes(key))
    expect(defaultChoosers(['repitch'])).toEqual(defaultChoosers(['repitch'], true, true))
    expect(others(['tapeecho'])).toEqual(['SPRING REV'])
    expect(defaultChoosers(['tapeecho']).fx2).toEqual([...metadata.stockFx2.filter(key => key !== 'SPRING REV'), 'TAPE ECHO'])
    expect(others(['miniverb', 'tapeecho', 'euclid'])).toEqual(['DARK REV'])
    expect(others(['analog-bassdrum'])).toEqual(['SPRING REV'])
    expect(defaultChoosers(['modulation']).fx1).toEqual([...metadata.stockFx1, 'MODULATION'])
    expect(defaultChoosers(['euclid'], false).fx2).toEqual(['EUCLID'])
  })
  it('rejects wrong-slot, missing, duplicate and unavailable effect rows', () => {
    expect(() => validateChoosers(['miniverb'], { fx1: ['MINIVERB'], fx2: [] })).toThrow('FX2 only')
    expect(() => validateChoosers(['tapeecho'], { fx1: ['TAPE ECHO'], fx2: [] })).toThrow('FX2 only')
    expect(() => validateChoosers(['spectrum'], { fx1: [], fx2: ['SPECTRUM'] })).toThrow('FX1 only')
    expect(() => validateChoosers([], { fx1: ['PLATE REV'], fx2: [] })).toThrow('FX2 only')
    expect(() => validateChoosers([], { fx1: [], fx2: ['EUCLID'] })).toThrow('does not include')
    expect(() => validateChoosers(['euclid'], { fx1: [], fx2: [] })).toThrow('needs a row')
    expect(() => validateChoosers([], { fx1: [], fx2: ['FILTER','FILTER'] })).toThrow('unique effects')
    expect(() => validateChoosers(['character'], { fx1: ['CHARACTER'], fx2: [] })).toThrow('X-table placement')
    expect(() => validateChoosers(['invented'], { fx1: [], fx2: [] })).toThrow('Unknown module')
  })
  it('requires the original firmware and covers native crowded-chooser rejection', async () => {
    await expect(composeChoosers(new Uint8Array(20), [])).rejects.toThrow('original OS fingerprint')
    expect(proofs.proofs.filter(proof => proof.error)).toHaveLength(1)
    expect(proofs.proofs.filter(proof => proof.default && !proof.error)).toHaveLength(4)
  })
})
