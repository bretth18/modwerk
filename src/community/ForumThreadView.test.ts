// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ForumThreadView } from './ForumThreadView'
import { api } from './api'
import type { ThreadDetail } from './forum-contract'

vi.mock('./api', () => ({ api: vi.fn(), apiFetch: vi.fn(), post: vi.fn() }))
const detail: ThreadDetail = {
  thread: { id: 'thread', title: 'A working discussion', category: 'general', machine: null, module_id: null, username: 'member', status: 'open', request_status: 'open', votes: 0, locked: 0, pinned: 0, created_at: '2026-10-09 10:00:00', updated_at: '2026-10-09 10:00:00', replies: 0 },
  posts: [{ id: 'reply', body: 'A public reply', username: 'member', created_at: '2026-10-09 10:00:00', edited_at: null, hidden: 0, likes: 0, liked: false, canEdit: false, attachments: [] }],
  configuration: null, issue: null, following: false, bookmarked: false, voted: false, canSetRequestStatus: false, hasMore: false,
}
let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const view = (id: string, embedded = false) => createElement('div', null, createElement('nav', null, 'Module library'), createElement(ForumThreadView, { id, embedded }))

it.each([false, true])('contains a thread rendering error and recovers when navigating to another thread (embedded=%s)', async embedded => {
  vi.mocked(api).mockResolvedValue({ ...detail, posts: [{ ...detail.posts[0], created_at: 'invalid date' }] })
  await act(async () => root.render(view('broken', embedded)))
  expect(container.querySelector('nav')?.textContent).toBe('Module library')
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Discussion could not open')
  expect(container.querySelector('button')?.textContent).toBe('Reload discussion')
  vi.mocked(api).mockResolvedValue(detail)
  await act(async () => root.render(view('working', embedded)))
  expect(container.querySelector('nav')?.textContent).toBe('Module library')
  expect(container.querySelector('[role="alert"]')).toBeNull()
  expect(container.textContent).toContain('A public reply')
})
