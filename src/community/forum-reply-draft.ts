import { useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'
import { communityBase } from '../hosting'

const drafts = new Map<string, string>()
const listeners = new Set<() => void>()
const draftKey = (threadId: string, memberId: string) => 'modwerk-forum-reply:' + JSON.stringify([communityBase(), memberId, threadId])
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }

/** Reply text stays in this tab, scoped to the signed-in member and conversation. */
export function readForumReplyDraft(threadId: string, memberId: string): string {
  if (!memberId) return ''
  const key = draftKey(threadId, memberId)
  if (drafts.has(key)) return drafts.get(key)!
  let body = ''
  try { body = sessionStorage.getItem(key) ?? '' } catch { /* Keep navigation working without browser storage. */ }
  drafts.set(key, body)
  return body
}
export function saveForumReplyDraft(threadId: string, memberId: string, body: string) {
  if (!memberId) return
  const key = draftKey(threadId, memberId)
  drafts.set(key, body)
  try { if (body) sessionStorage.setItem(key, body); else sessionStorage.removeItem(key) } catch { /* The in-memory draft still survives navigation. */ }
  for (const listener of listeners) listener()
}
export function useForumReplyDraft(threadId: string, memberId: string): readonly [string, Dispatch<SetStateAction<string>>] {
  const reply = useSyncExternalStore(subscribe, () => readForumReplyDraft(threadId, memberId), () => '')
  const setReply: Dispatch<SetStateAction<string>> = value => saveForumReplyDraft(threadId, memberId, typeof value === 'function' ? value(readForumReplyDraft(threadId, memberId)) : value)
  return [reply, setReply]
}
