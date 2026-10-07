import { it, expect } from 'vitest'
import parity from '../sdk/native-comparisons/synth.json' with { type: 'json' }
import catalog from '../sdk/catalog.json' with { type: 'json' }
import { nativeParityCoversPool } from './synth-release.mjs'
  it('allows fresh composition coverage without altering the frozen release report and rejects missing or failed cases',async()=>{
    const ids=catalog.modules.map(module=>module.id)
    expect(await nativeParityCoversPool(parity,ids)).toBe(true)
    for(const mutate of [
      (p)=>{p.selections.pop()},
      (p)=>{p.summary.built++},
      (p)=>{p.summary.mismatches=1},
      (p)=>{p.pool.push('unknown-module')},
      (p)=>{p.selections[0].result='failed'},
    ]) {const changed=structuredClone(parity);mutate(changed);expect(await nativeParityCoversPool(changed,ids)).toBe(false)}
  })
