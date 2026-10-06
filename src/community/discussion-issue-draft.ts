import { useState } from 'react'

export type DiscussionIssueDraft = { title: string; body: string }
const drafts = new Map<string, DiscussionIssueDraft>()
const storageKey = (moduleId: string) => 'modwerk-discussion-issue-draft:' + moduleId

/** Keep the text in this tab while the reporter changes pages or signs in. */
export function saveDiscussionIssueDraft(moduleId: string, draft: DiscussionIssueDraft) {
  drafts.set(moduleId, draft)
  try { sessionStorage.setItem(storageKey(moduleId), JSON.stringify(draft)) } catch { /* The in-memory draft still survives navigation. */ }
}
export function readDiscussionIssueDraft(moduleId: string): DiscussionIssueDraft | null {
  try {
    const stored = sessionStorage.getItem(storageKey(moduleId))
    if (stored) {
      const draft: unknown = JSON.parse(stored)
      if (draft && typeof draft === 'object' && 'title' in draft && typeof draft.title === 'string' && draft.title.length <= 160 && 'body' in draft && typeof draft.body === 'string' && draft.body.length <= 12000) return { title: draft.title, body: draft.body }
    }
  } catch { /* Storage can be unavailable in private browsing. */ }
  return drafts.get(moduleId) ?? null
}
export function clearDiscussionIssueDraft(moduleId: string) {
  drafts.delete(moduleId)
  try { sessionStorage.removeItem(storageKey(moduleId)) } catch { /* The in-memory copy has been removed. */ }
}
export function moveDiscussionIssueDraft(from: string, to: string) {
  const draft = readDiscussionIssueDraft(from)
  if (!draft) return
  saveDiscussionIssueDraft(to, draft)
  clearDiscussionIssueDraft(from)
}

export function useDiscussionIssueDraft(id: string) {
  const [draft] = useState(() => readDiscussionIssueDraft(id))
  return { draft, clearDraft: () => clearDiscussionIssueDraft(id) }
}
