import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MissingNote, type ProjectNeeds } from './OctatrackUpdate'

const note = (needs: ProjectNeeds) => renderToStaticMarkup(createElement(MissingNote, { needs, onSync: () => {} })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

describe('what the unit’s project needs', () => {
  it('names the missing modules and offers the next available action', () => {
    expect(note({ names: ['E-Verb', 'Tape Echo'], unknown: [], add: () => {} })).toBe('2 modules missing from your Octatrack E-Verb Tape Echo Your project uses these modules. Add to set')
    expect(note({ names: ['E-Verb'], unknown: [] })).toBe('1 module missing from your Octatrack E-Verb Your project uses this module. Sync to Octatrack')
  })
  it('names modules the library does not know, and nothing when nothing is missing', () => {
    expect(note({ names: ['E-Verb'], unknown: ['Foo'] })).toContain('Foo isn’t in the library yet.')
    expect(note({ names: [], unknown: ['Foo', 'Bar'] })).toBe('2 modules missing from your Octatrack Foo Bar Foo and Bar aren’t in the library yet. Your project uses these modules.')
    expect(note({ names: [], unknown: [] })).toBe('')
  })
})
