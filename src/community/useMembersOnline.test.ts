// @vitest-environment jsdom
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api } from './api'
import { CommunityContext } from './context'
import { ForumOnlineNow, MembersOnlineChip, MembersOnlineList } from './MembersOnline'
import { useMembersOnline } from './useMembersOnline'
import type { MembersOnline } from './forum-contract'

vi.mock('./api', () => ({ api: vi.fn() }))
const presence: MembersOnline = { online: 3, members: [{ username: 'alpha', avatar: null }], more: 2, guests: 1 }
let root: Root, container: HTMLDivElement, current: MembersOnline | null, visible: boolean
function Harness({ poll = true, registerPresence = true }: { poll?: boolean; registerPresence?: boolean }) {
  const value = useMembersOnline(poll,registerPresence)
  useEffect(() => { current = value },[value])
  return null
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
  vi.mocked(api).mockResolvedValue(presence)
  visible = true
  vi.spyOn(document,'visibilityState','get').mockImplementation(() => visible ? 'visible' : 'hidden')
  localStorage.clear()
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(() => root.unmount()); container.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const render = (poll = true) => act(async () => root.render(createElement(Harness,{ poll })))

it('checks in visitors without accounts only while visible and refreshes when the tab becomes visible',async () => {
  await render()
  expect(api).toHaveBeenLastCalledWith('/community/online',expect.objectContaining({ method: 'POST', body: '{}', referrerPolicy: 'no-referrer' }))
  expect(current).toEqual(presence)
  await act(() => vi.advanceTimersByTimeAsync(60000))
  expect(api).toHaveBeenCalledTimes(2)
  visible = false
  await act(() => vi.advanceTimersByTimeAsync(120000))
  expect(api).toHaveBeenCalledTimes(2)
  visible = true
  await act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(api).toHaveBeenCalledTimes(3)
})

it('reads without registering a visitor when mounted hidden, opted out or used as a one-off forum consumer',async () => {
  visible = false; await render()
  expect(api).toHaveBeenLastCalledWith('/community/online',expect.not.objectContaining({ method: 'POST' }))
  visible = true
  localStorage.setItem('modwerk.usage.anonymous-off','1')
  await act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(api).toHaveBeenLastCalledWith('/community/online',expect.not.objectContaining({ method: 'POST' }))
  localStorage.clear(); await render(false)
  expect(api).toHaveBeenLastCalledWith('/community/online',expect.not.objectContaining({ method: 'POST' }))
  const calls = vi.mocked(api).mock.calls.length
  await act(() => vi.advanceTimersByTimeAsync(120000))
  expect(api).toHaveBeenCalledTimes(calls)
})

it('respects browser privacy signals before sending a check-in',async () => {
  vi.stubGlobal('navigator',{ doNotTrack: '1' })
  await render()
  expect(api).toHaveBeenLastCalledWith('/community/online',expect.not.objectContaining({ method: 'POST' }))
  vi.stubGlobal('navigator',{ globalPrivacyControl: true })
  await act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(api).toHaveBeenLastCalledWith('/community/online',expect.not.objectContaining({ method: 'POST' }))
})

it('refreshes the forum count without starting another visitor heartbeat',async () => {
  await act(() => root.render(createElement(Harness,{ registerPresence: false })))
  await act(() => vi.advanceTimersByTimeAsync(60000))
  expect(api).toHaveBeenCalledTimes(2)
  expect(vi.mocked(api).mock.calls.every(([,options]) => !options?.method)).toBe(true)
})

it('falls back to the public read if check-ins are unavailable during backend rollout',async () => {
  vi.mocked(api).mockRejectedValueOnce(new Error('Check-in unavailable'))
  await render()
  expect(api).toHaveBeenCalledTimes(2)
  expect(api).toHaveBeenLastCalledWith('/community/online',expect.not.objectContaining({ method: 'POST' }))
  expect(current).toEqual(presence)
})

it('checks in immediately when the signed-in account changes and aborts the previous effect',async () => {
  await render()
  const previous = vi.mocked(api).mock.calls[0][1]!.signal!
  const context = { session: { available: true, admin: false, user: { id: 'alpha', username: 'alpha', displayName: 'Alpha', verified: true } }, developer: null, catalog: [], refresh: async () => {}, refreshDeveloper: async () => {} }
  await act(() => root.render(createElement(CommunityContext.Provider,{ value: context },createElement(Harness))))
  const signedIn = vi.mocked(api).mock.calls.at(-1)![1]!.signal!
  await act(() => root.render(createElement(CommunityContext.Provider,{ value: { ...context, session: { ...context.session, user: null } } },createElement(Harness))))
  expect(previous.aborted).toBe(true); expect(signedIn.aborted).toBe(true)
  expect(api).toHaveBeenLastCalledWith('/community/online',expect.objectContaining({ method: 'POST' }))
})

it('labels the count as people and includes visitors without exposing guest identities',() => {
  const chip = renderToStaticMarkup(createElement(MembersOnlineChip,{ presence }))
  const list = renderToStaticMarkup(createElement(MembersOnlineList,{ presence }))
  expect(chip).toContain('3 people online'); expect(chip).toContain('active in the last 5 minutes')
  expect(list).toContain('People online'); expect(list).toContain('@alpha'); expect(list).toContain('1 guest'); expect(list).toContain('1 more member')
  expect(list).not.toContain('and 2 more')
  expect(renderToStaticMarkup(createElement(MembersOnlineList,{ presence: { online: 2, members: [], more: 2, guests: 2 } }))).toContain('2 guests')
  // A frontend deployed before the new backend can still render the old contract.
  expect(renderToStaticMarkup(createElement(MembersOnlineList,{ presence: { online: 1, members: [], more: 1 } }))).toContain('1 person online')
  expect(renderToStaticMarkup(createElement(MembersOnlineList,{ presence: { online: 3, members: presence.members, more: 2 } }))).toContain('and 2 more')
})

it('shows the complete online total alongside the forum names and guest subtotal',async () => {
  await act(() => root.render(createElement(ForumOnlineNow)))
  expect(container.textContent).toContain('3 online now')
  expect(container.textContent).toContain('@alpha')
  expect(container.textContent).toContain('1 guest')
  expect(container.textContent).toContain('1 more member')
})
