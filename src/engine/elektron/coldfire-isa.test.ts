import { describe, expect, it } from 'vitest'
import { FPU, ILLEGAL, PCREL, decodeColdFire, readerAt, wholeInstructions } from './coldfire-isa'

// Hand-assembled ColdFire words; no firmware involved.
const code = (...words: number[]) => Uint8Array.from(words.flatMap(word => [word >> 8, word & 0xff]))
const decode = (...words: number[]) => decodeColdFire(readerAt(code(...words), 0x1000)(0x1000), 0x1000)

describe('ColdFire decoder', () => {
  it('measures common instructions', () => {
    expect(decode(0x4e71)).toMatchObject({ length: 2, op: 'nop' })
    expect(decode(0x4eb9, 0x4000, 0x1234)).toMatchObject({ length: 6, flow: 'jsr', target: 0x40001234 })
    expect(decode(0x203c, 0x1234, 0x5678)).toMatchObject({ length: 6, op: 'move' })
    expect(decode(0x4e75)).toMatchObject({ length: 2, flow: 'rts' })
  })

  it('follows branches and marks PC-relative operands', () => {
    expect(decode(0x6006)).toMatchObject({ length: 2, flow: 'bra', target: 0x1000 + 2 + 6 })
    expect(decode(0x6600, 0xfffe)).toMatchObject({ length: 4, flow: 'bcc', target: 0x1000 })
    expect(decode(0x41fa, 0x0010).flags & PCREL).toBe(PCREL)
  })

  it('reports opcodes the MCF5441x cannot run', () => {
    expect(decode(0x4afc).flags & ILLEGAL).toBe(ILLEGAL)
    expect(decode(0xf200, 0x0000).flags & FPU).toBe(FPU)
  })

  it('checks that a span holds whole instructions', () => {
    const body = code(...Array(64).fill(0x4e71), 0x4eb9, 0x4000, 0x1234, 0x4e71)
    const at = 0x1000 + 128
    expect(wholeInstructions(body, 0x1000, at, 6).ok).toBe(true)
    expect(wholeInstructions(body, 0x1000, at, 4).ok).toBe(false)
    expect(wholeInstructions(body, 0x1000, at + 2, 4).ok).toBe(false)
  })
})
