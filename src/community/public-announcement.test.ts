import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PublicAnnouncementCard } from './PublicAnnouncement'
import type { BellItem } from './notification-contract'
import type { NotificationLine } from './notification-text'

let storage: Map<string, string>, news: typeof import('./public-announcement')
const id = (character: string) => 'announcement-' + character.repeat(32)
const item = (character: string, seen = false): BellItem => ({ id: id(character), kind: 'announcement', seen, title: 'A new module', excerpt: 'Explore its features.', created_at: '2026-10-08 12:00:00', url: '#digitakt/module/digipoly', module_id: 'digitakt-digipoly', actor: null, actorOfficial: true, thread_id: null, post_id: null, rating: null, issue_id: null, github_actor: null })
beforeEach(async () => {
  vi.resetModules(); storage = new Map()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) })
  news = await import('./public-announcement')
})
afterEach(() => vi.unstubAllGlobals())

describe('quiet public announcements', () => {
  it('shows only the newest announcement and never replaces a dismissed card with the older backlog', async () => {
    expect(news.latestPublicAnnouncement([item('a'), item('b')])?.id).toBe(id('a'))
    news.dismissPublicAnnouncement(id('a'))
    expect(news.latestPublicAnnouncement([item('a'), item('b')])).toBeNull()
    vi.resetModules()
    const nextVisit = await import('./public-announcement')
    expect(nextVisit.latestPublicAnnouncement([item('a'), item('b')])).toBeNull()
    expect(nextVisit.latestPublicAnnouncement([item('c'), item('a')])?.id).toBe(id('c'))
    expect(nextVisit.latestPublicAnnouncement([item('c', true), item('b')])).toBeNull()
    expect(nextVisit.latestPublicAnnouncement([])).toBeNull()
  })
  it('keeps news dismissed for this visit when storage is blocked and tolerates damaged saved data', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('full') } })
    news.dismissPublicAnnouncement(id('a'))
    expect(news.latestPublicAnnouncement([item('a')])).toBeNull()
    expect(news.latestPublicAnnouncement([item('b')])?.id).toBe(id('b'))
    vi.stubGlobal('localStorage', { getItem: () => '{broken json' })
    expect(news.latestPublicAnnouncement([item('b')])?.id).toBe(id('b'))
  })
  it('renders module and external actions accessibly, using the real logo and escaped announcement copy', () => {
    const line: NotificationLine = { kind: 'announcement', text: '<script>test</script>', excerpt: 'A new module for your configuration.', href: '#digitakt/module/digipoly', ids: [id('a')], seen: false, created_at: '', actor: null, official: true, avatar: null }
    const render = (value: NotificationLine) => renderToStaticMarkup(createElement(PublicAnnouncementCard, { line: value, onDismiss() {}, onOpen() {} }))
    const module = render(line)
    expect(module).toContain('modwerk-mark.svg'); expect(module).toContain('aria-label="Dismiss announcement"')
    expect(module).toContain('Explore module'); expect(module).toContain('&lt;script&gt;test&lt;/script&gt;')
    expect(module).not.toContain('target="_blank"')
    const external = render({ ...line, href: 'https://modwerk.app/#library' })
    expect(external).toContain('target="_blank" rel="noreferrer"')
    expect(external).toContain('opens in a new tab')
  })
})
