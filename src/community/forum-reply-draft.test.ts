import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readForumReplyDraft, saveForumReplyDraft } from './forum-reply-draft'

const threads = ['module-miniverb', 'module-digitakt-digihealth', 'module-digitone-digihealth']
const members = ['draft-member', 'other-member']
beforeEach(() => {
  const items = new Map<string, string>()
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => items.set(key, value), removeItem: (key: string) => items.delete(key) })
})
afterEach(() => { for (const thread of threads) for (const member of members) saveForumReplyDraft(thread, member, ''); vi.unstubAllGlobals() })

describe('reply drafts when leaving a module discussion', () => {
  it('restores the full Markdown reply independently for each conversation and member', () => {
    const body = '**A question**, not a report.\n\n> The comment I was answering\n\n' + 'More context. '.repeat(900)
    saveForumReplyDraft(threads[0], members[0], body)
    saveForumReplyDraft(threads[1], members[0], 'Digitakt question')
    saveForumReplyDraft(threads[0], members[1], 'Another member’s reply')
    expect(readForumReplyDraft(threads[0], members[0])).toBe(body)
    expect(readForumReplyDraft(threads[1], members[0])).toBe('Digitakt question')
    expect(readForumReplyDraft(threads[2], members[0])).toBe('')
    expect(readForumReplyDraft(threads[0], members[1])).toBe('Another member’s reply')
    expect(readForumReplyDraft(threads[0], '')).toBe('')
  })

  it('keeps text in memory when session storage becomes unavailable', () => {
    vi.stubGlobal('sessionStorage', { getItem() { throw new Error('Blocked') }, setItem() { throw new Error('Blocked') }, removeItem() { throw new Error('Blocked') } })
    saveForumReplyDraft(threads[0], members[0], 'Keep this when I back out of reporting.')
    expect(readForumReplyDraft(threads[0], members[0])).toBe('Keep this when I back out of reporting.')
  })

  it('clears only the posted reply, including its stored copy', () => {
    saveForumReplyDraft(threads[0], members[0], 'Posted reply')
    saveForumReplyDraft(threads[1], members[0], 'Still editing')
    saveForumReplyDraft(threads[0], members[0], '')
    expect(readForumReplyDraft(threads[0], members[0])).toBe('')
    expect(readForumReplyDraft(threads[1], members[0])).toBe('Still editing')
    const key = 'modwerk-forum-reply:' + JSON.stringify(['/api', members[0], threads[0]])
    expect(sessionStorage.getItem(key)).toBeNull()
  })
})
