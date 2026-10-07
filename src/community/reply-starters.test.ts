import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReplyStarters } from './ReplyStarters'
import { starterBody, starterHint, starterLabel } from './reply-starters'

describe('reply starters on module discussions', () => {
  it('labels a reply with its own bold line and leaves an unlabelled reply alone', () => {
    expect(starterBody('question', 'Octatrack', 'Does it sync to tempo?')).toBe('**Question**\n\nDoes it sync to tempo?')
    expect(starterBody('works', 'Digitakt', '- Lovely on drums')).toBe('**Works on my Digitakt**\n\n- Lovely on drums')
    expect(starterBody('', 'Octatrack', 'Plain reply')).toBe('Plain reply')
  })
  it('names the machine and gives each kind a hint', () => {
    expect(starterLabel('works', 'Digitone')).toBe('Works on my Digitone')
    expect(starterHint('settings')).toContain('values')
    expect(starterHint('')).toContain('just write')
  })
  it('shows the chosen kind as pressed and links new threads to the module', () => {
    const html = renderToStaticMarkup(createElement(ReplyStarters, { machine: 'octatrack', machineName: 'Octatrack', moduleId: 'miniverb', value: 'tip', onChange: () => {} }))
    expect(html).toContain('aria-pressed="true">Tip</button>')
    expect(html).toContain('Works on my Octatrack')
    expect(html).toContain('href="#forum/new?category=configs&amp;machine=octatrack&amp;module=miniverb"')
    expect(html).toContain('href="#forum/new?category=showcase&amp;machine=octatrack&amp;module=miniverb"')
  })
})
