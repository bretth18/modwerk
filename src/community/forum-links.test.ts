import { describe, expect, it } from 'vitest'
import { forumHashRoute, postExcerpt, profilePath, threadIdFromSegment, threadPath, threadSlug } from './forum-links'
const id = '0f3a1b2c-4d5e-4f60-8a9b-0c1d2e3f4a5b'
describe('thread and profile paths', () => {
  it('derives a slug from the title and keeps the ID authoritative', () => {
    expect(threadSlug('  Granular pad — from “Tapehead”, v2.1!  ')).toBe('granular-pad-from-tapehead-v2-1')
    expect(threadSlug('Ünïcödé Straße')).toBe('unicode-strasse')
    expect(threadSlug('<script>alert(1)</script>')).toBe('script-alert-1-script')
    expect(threadSlug('x'.repeat(100)).length).toBe(60)
    expect(threadSlug('***')).toBe('')
    expect(threadPath(id, 'Granular pad')).toBe('forum/thread/' + id + '-granular-pad/')
    expect(threadPath(id, '***')).toBe('forum/thread/' + id + '/')
    expect(threadPath(id)).toBe('forum/thread/' + id + '/')
    expect(threadPath('module-miniverb', 'Miniverb discussion')).toBe('forum/thread/module-miniverb/')
    expect(threadIdFromSegment(id + '-granular-pad')).toBe(id)
    expect(threadIdFromSegment(id)).toBe(id)
    expect(threadIdFromSegment('module-miniverb')).toBe('module-miniverb')
    expect(profilePath('synth_fan')).toBe('forum/profile/synth_fan/')
  })
  it('maps paths back to hash routes for the push service worker', () => {
    expect(forumHashRoute('forum/thread/' + id + '-granular-pad/?post=p1&page=2')).toBe('#forum/thread/' + id + '?post=p1&page=2')
    expect(forumHashRoute('forum/thread/module-miniverb/')).toBe('#forum/thread/module-miniverb')
    expect(forumHashRoute('forum/profile/synth_fan/')).toBe('#forum/profile/synth_fan')
    expect(forumHashRoute('https://github.com/repeat98/octamod/issues/1')).toBeUndefined()
  })
  it('turns Markdown into a short plain excerpt', () => {
    expect(postExcerpt('# Heading\n\n> quoted\n\nTry **short** _decay_ with `LFO` and [a link](https://example.test) ![img](https://x.test/a.png)\n\n```js\ncode\n```\n- one\n1. two')).toBe('Heading quoted Try short decay with LFO and a link one two')
    expect(postExcerpt('<b>bold</b> &amp; raw')).toBe('bold &amp; raw')
    expect(postExcerpt('word '.repeat(100), 40)).toBe('word word word word word word word word…')
    expect(postExcerpt('')).toBe('')
  })
})
