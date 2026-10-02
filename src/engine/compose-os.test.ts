import { describe, expect, it } from 'vitest'
import { composeOs } from './compose-os'
import proofs from './assets/composition-proofs.json'
import staticProofs from './assets/static-composition-proofs.json'
import { DSP_LOADER, FIRMWARE_VERSION } from './protocol'
import { CATALOG_SOURCE } from '../catalog/modules'
describe('complete local OS composer', () => {
  it('keeps the dynamic loader off and pins every loader-free selection and packaging identity', () => {
    expect(DSP_LOADER).toBe(false)
    expect(staticProofs.revision).toBe(CATALOG_SOURCE.revision)
    expect(staticProofs.staticStock).toBe(true)
    expect(staticProofs.packing?.version).toBe(FIRMWARE_VERSION)
    expect(staticProofs.proofs).toHaveLength(512)
    expect(new Set(staticProofs.proofs.map(proof => [...proof.moduleIds].sort().join('+') + ':' + proof.keepStockFx2)).size).toBe(512)
    const accepted = staticProofs.proofs.filter(proof => !proof.error)
    expect(accepted).toHaveLength(264)
    // Keeping the stock FX2 effects the modules do not need accepts exactly what the compact FX2 menu accepts.
    expect(accepted.filter(proof => proof.keepStockFx2)).toHaveLength(132)
    for (const proof of accepted) {
      expect(proof.firmware?.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.firmware?.containerSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.firmware?.version).toBe(FIRMWARE_VERSION)
      expect(proof).not.toHaveProperty('code')
      expect(proof).not.toHaveProperty('image')
    }
  })
  it('rejects changed firmware before creating a runtime or output', async () => {
    await expect(composeOs(new Uint8Array(64), ['repitch'])).rejects.toThrow('original, unmodified OS image')
  })
  it('pins complete native identities without keeping image bytes', () => {
    expect(proofs.revision).toBe(CATALOG_SOURCE.revision)
    for (const proof of proofs.proofs.filter(proof => !proof.error)) {
      expect(proof.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.osSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.appendSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.bytes).toBeGreaterThan(1112560)
      expect(proof.firmware?.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.firmware?.containerSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.firmware?.version).toBe('OCTAMOD79')
      expect(proof).not.toHaveProperty('code')
      expect(proof).not.toHaveProperty('image')
    }
  })
})
