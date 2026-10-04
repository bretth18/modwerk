import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { destination, TARGET } from '../redirect/redirect.js'

const at = (pathname, search = '', hash = '') => ({ pathname, search, hash })
const file = name => readFileSync(new URL('../redirect/' + name, import.meta.url), 'utf8')

describe('octamod.app redirect', () => {
  it('keeps the path, query and fragment so shared links and account-mail links still work', () => {
    expect(destination(at('/'))).toBe('https://modwerk.app/')
    expect(destination(at('/module/miniverb/'))).toBe('https://modwerk.app/module/miniverb/')
    expect(destination(at('/module/miniverb/index.html'))).toBe('https://modwerk.app/module/miniverb/')
    expect(destination(at('/index.html'))).toBe('https://modwerk.app/')
    expect(destination(at('/', '?a=b%20c', '#account/verify/abc.def'))).toBe('https://modwerk.app/?a=b%20c#account/verify/abc.def')
    expect(destination(at('/', '', '#library'))).toBe('https://modwerk.app/#library')
  })

  it.each(['//evil.example/x', '/\\evil.example', '\\\\evil.example', '///evil.example', '/%2f%2fevil.example', '//evil.example\\@modwerk.app', 'https://evil.example/', '/..//evil.example'])('never leaves modwerk.app for %s', pathname => {
    expect(new URL(destination(at(pathname, '?q=1', '#h'))).origin).toBe(TARGET)
  })

  it('serves the same page for the home page and for every unknown path, and sets the domain', () => {
    expect(file('404.html')).toBe(file('index.html'))
    expect(file('CNAME')).toBe('octamod.app\n')
    expect(file('index.html')).toContain('<noscript><meta http-equiv="refresh" content="0; url=https://modwerk.app/" /></noscript>')
  })

  it('runs no inline script, so its Content-Security-Policy can forbid them', () => {
    const page = file('index.html')
    expect(page).toContain("script-src 'self'")
    expect([...page.matchAll(/<script\b[^>]*>/g)].every(match => /\bsrc="/.test(match[0]))).toBe(true)
  })
})
