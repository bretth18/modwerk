// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ForumPage } from './ForumPage'
import { CommunityContext } from './context'
import { api, post } from './api'
import type { ForumVisit } from './forum-contract'

vi.mock('./api', () => ({ api: vi.fn(), apiFetch: vi.fn(), post: vi.fn() }))
vi.mock('./GetStarted', () => ({ GetStarted: () => null }))
vi.mock('./MembersOnline', () => ({ ForumOnlineNow: () => null }))
vi.mock('./ForumShowcase', () => ({ ForumShowcase: () => null }))
vi.mock('./ForumHighlights', () => ({ ForumHighlights: () => null }))
vi.mock('./ForumDirectory', () => ({ ForumDirectory: () => null }))
vi.mock('./ForumRecentPosts', () => ({ ForumRecentPosts: () => null }))

const session = { available: true, admin: false, user: { id: 'member', displayName: 'Member', username: 'member', verified: true } }
const caughtUp: ForumVisit = { since: '2026-10-09 10:00:00', newThreads: 0, newReplies: 0, unreadFollowed: 0 }
let root: Root, container: HTMLDivElement, visit: ForumVisit
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.clearAllMocks()
  visit = caughtUp
  vi.mocked(api).mockImplementation(async path => path === '/forum/visit' ? visit : { threads: [], hasMore: false })
  vi.mocked(post).mockResolvedValue({ ok: true })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })
const render = (route = 'forum') => act(async () => root.render(createElement(CommunityContext.Provider, { value: { session, developer: null, catalog: [], refresh: async () => {}, refreshDeveloper: async () => {} } }, createElement(ForumPage, { route, configurations: [], onCopy: () => {} }))))
const banner = () => container.querySelector('.forum-since-visit')

it('hides the visit banner when caught up and on the first visit', async () => {
  await render()
  expect(banner()).toBeNull()
  expect(container.textContent).not.toContain('You’re all caught up.')
  await render('forum?following=1')
  visit = { ...caughtUp, since: null, unreadFollowed: 1 }
  await render()
  expect(banner()).toBeNull()
})

it('links positive counts to their unread views and omits empty activity categories', async () => {
  visit = { ...caughtUp, newReplies: 2, unreadFollowed: 1 }
  await render()
  const links = [...banner()!.querySelectorAll('li a')]
  expect(links.map(link => link.getAttribute('href'))).toEqual(['#forum?following=1&unread=1', '#forum?following=1&unread=1'])
  expect(links.map(link => link.textContent)).toEqual(['2new replies in threads you follow', '1unread followed thread'])
  await render('forum?following=1&unread=1')
  visit = { ...caughtUp, newThreads: 1 }
  await render()
  expect(banner()!.querySelector('li a')?.getAttribute('href')).toBe('#forum?sort=newest&unread=1')
  expect(banner()!.querySelectorAll('li')).toHaveLength(1)
})

it('hides the banner on returning home after reading the followed activity', async () => {
  visit = { ...caughtUp, newReplies: 1, unreadFollowed: 1 }
  await render()
  expect(banner()).not.toBeNull()
  await render('forum?following=1&unread=1')
  visit = caughtUp
  await render()
  expect(banner()).toBeNull()
  expect(vi.mocked(api).mock.calls.filter(([path]) => path === '/forum/visit')).toHaveLength(2)
})

it('keeps the banner after a failed mark-read request and removes it after success', async () => {
  visit = { ...caughtUp, newThreads: 1, newReplies: 2, unreadFollowed: 1 }
  await render()
  const readAll = () => banner()!.querySelector('button')!.click()
  vi.mocked(post).mockRejectedValueOnce(new Error('Offline'))
  await act(async () => readAll())
  expect(banner()).not.toBeNull()
  expect(banner()!.querySelector('button')?.disabled).toBe(false)
  await act(async () => readAll())
  expect(post).toHaveBeenLastCalledWith('/forum/read-all', {})
  expect(banner()).toBeNull()
  expect(vi.mocked(api).mock.calls.filter(([path]) => path.startsWith('/forum/threads?'))).toHaveLength(2)
})
