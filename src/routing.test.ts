import { describe, expect, it } from 'vitest'
import { canonicalRouteUrl, routeFromUrl } from './routing'

const moduleIds = ['analog-bassdrum', 'miniverb', 'tapeecho']

describe.each(['https://octamod.app/', 'https://example.github.io/octamod/'])('module links at %s', root => {
  const appUrl = new URL(root)
  it('opens a direct module URL and its index.html on static hosting', () => {
    expect(routeFromUrl(new URL('module/analog-bassdrum/', appUrl), appUrl)).toBe('module/analog-bassdrum')
    expect(routeFromUrl(new URL('module/miniverb/index.html', appUrl), appUrl)).toBe('module/miniverb')
  })
  it('turns legacy links into shareable paths while preserving query parameters', () => {
    const url = new URL('?utm_source=forum#module/analog-bassdrum', appUrl)
    expect(canonicalRouteUrl(url, appUrl, moduleIds).href).toBe(root + 'module/analog-bassdrum/?utm_source=forum')
  })
  it('supports switching modules and leaving a module via the existing hash routes', () => {
    const current = new URL('module/analog-bassdrum/', appUrl)
    expect(canonicalRouteUrl(new URL('#module/tapeecho', current), appUrl, moduleIds).href).toBe(root + 'module/tapeecho/')
    expect(canonicalRouteUrl(new URL('#configuration', current), appUrl, moduleIds).href).toBe(root + '#configuration')
  })
  it('preserves old navigation aliases', () => {
    expect(routeFromUrl(new URL('#account', appUrl), appUrl)).toBe('activity')
    expect(routeFromUrl(new URL('#remixes', appUrl), appUrl)).toBe('module-sets')
    expect(routeFromUrl(new URL('#remix/miniverb-solo', appUrl), appUrl)).toBe('module-set/miniverb-solo')
  })
  it('keeps unknown legacy modules on the app missing-page route', () => {
    const url = new URL('#module/octakit', appUrl)
    expect(canonicalRouteUrl(url, appUrl, moduleIds).href).toBe(url.href)
    expect(routeFromUrl(url, appUrl)).toBe('module/octakit')
  })
  it('does not intercept external links, files, API requests or paths outside the app', () => {
    for (const href of ['https://github.com/repeat98/octamod', 'licenses/THIRD_PARTY_NOTICES.html', 'module-thumbnails/miniverb.jpg', 'api/session', '../other/']) {
      expect(routeFromUrl(new URL(href, appUrl), appUrl)).toBeUndefined()
    }
  })
})
