import { describe, expect, it } from 'vitest'
import { canonicalRouteUrl, moduleHref, routeFromUrl } from './routing'

const moduleIds = ['analog-bassdrum', 'miniverb', 'tapeecho', 'synth']

describe.each(['https://modwerk.app/', 'https://example.github.io/octamod/'])('module links at %s', root => {
  const appUrl = new URL(root)
  it('opens a direct module URL and its index.html on static hosting', () => {
    expect(routeFromUrl(new URL('module/analog-bassdrum/', appUrl), appUrl)).toBe('module/analog-bassdrum')
    expect(routeFromUrl(new URL('module/miniverb/index.html', appUrl), appUrl)).toBe('module/miniverb')
  })
  it('opens FM Synth through its public slug and redirects upstream-ID links', () => {
    for (const path of ['module/fm-synth/', 'module/fm-synth/index.html', 'module/synth/', 'module/synth/index.html', '#module/synth', '#module/fm-synth']) {
      const url = new URL(path, appUrl)
      url.search = '?utm_source=forum'
      expect(routeFromUrl(url, appUrl)).toBe('module/synth')
      expect(canonicalRouteUrl(url, appUrl, moduleIds).href).toBe(root + 'module/fm-synth/?utm_source=forum')
    }
    expect(moduleHref('synth')).toMatch(/module\/fm-synth\/$/)
  })
  it('preserves the FM Synth report form in public hash links', () => {
    const url = new URL('#module/fm-synth?report=1', appUrl)
    expect(routeFromUrl(url, appUrl)).toBe('module/synth?report=1')
    expect(canonicalRouteUrl(url, appUrl, moduleIds).href).toBe(url.href)
    const legacy = new URL('#module/synth?report=1', appUrl)
    expect(canonicalRouteUrl(legacy, appUrl, moduleIds).href).toBe(url.href)
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
  it('opens the remembered machine when the URL names no route', () => {
    expect(routeFromUrl(new URL('', appUrl), appUrl, 'digitakt')).toBe('digitakt')
    expect(routeFromUrl(new URL('#forum', appUrl), appUrl, 'digitakt')).toBe('forum')
    expect(routeFromUrl(new URL('', appUrl), appUrl)).toBe('library')
  })
  it('preserves old navigation aliases', () => {
    expect(routeFromUrl(new URL('#account', appUrl), appUrl)).toBe('account')
    expect(routeFromUrl(new URL('#activity', appUrl), appUrl)).toBe('account')
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
