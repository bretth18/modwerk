import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react'

export type DiscussionIssueDraft = { title: string; body: string }
const drafts = new Map<string, DiscussionIssueDraft>()
const listeners = new Set<() => void>()
const storageKey = (moduleId: string) => 'modwerk-discussion-issue-draft:' + moduleId
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }

/** Keep the text in this tab while the reporter changes pages or signs in. */
export function saveDiscussionIssueDraft(moduleId: string, draft: DiscussionIssueDraft) {
  drafts.set(moduleId, draft)
  try { sessionStorage.setItem(storageKey(moduleId), JSON.stringify(draft)) } catch { /* The in-memory draft still survives navigation. */ }
  for (const listener of listeners) listener()
}
export function readDiscussionIssueDraft(moduleId: string): DiscussionIssueDraft | null {
  if (drafts.has(moduleId)) return drafts.get(moduleId)!
  try {
    const stored = sessionStorage.getItem(storageKey(moduleId))
    if (stored) {
      const draft: unknown = JSON.parse(stored)
      if (draft && typeof draft === 'object' && 'title' in draft && typeof draft.title === 'string' && draft.title.length <= 160 && 'body' in draft && typeof draft.body === 'string' && draft.body.length <= 12000) {
        const saved = { title: draft.title, body: draft.body }
        drafts.set(moduleId, saved)
        return saved
      }
    }
  } catch { /* Storage can be unavailable in private browsing. */ }
  return drafts.get(moduleId) ?? null
}
export function clearDiscussionIssueDraft(moduleId: string) {
  drafts.delete(moduleId)
  try { sessionStorage.removeItem(storageKey(moduleId)) } catch { /* The in-memory copy has been removed. */ }
  for (const listener of listeners) listener()
}
export function moveDiscussionIssueDraft(from: string, to: string) {
  const draft = readDiscussionIssueDraft(from)
  if (!draft) return
  saveDiscussionIssueDraft(to, draft)
  clearDiscussionIssueDraft(from)
}

export function useDiscussionIssueDraft(id: string, report: RefObject<HTMLDetailsElement | null>) {
  const draft = useSyncExternalStore(subscribe, () => readDiscussionIssueDraft(id), () => readDiscussionIssueDraft(id))
  const applied = useRef<{ title: HTMLInputElement; actual: HTMLTextAreaElement; draft: DiscussionIssueDraft } | null>(null)
  useEffect(() => {
    if (!draft) { applied.current = null; return }
    const title = report.current?.querySelector<HTMLInputElement>('input[name="title"]')
    const actual = report.current?.querySelector<HTMLTextAreaElement>('textarea[name="actual"]')
    if (!title || !actual) return
    // The form may already be mounted. Copy into empty/unedited fields without replacing the reporter's edits.
    const previous = applied.current
    if (!title.value || previous?.title === title && title.value === previous.draft.title) title.value = draft.title
    if (!actual.value || previous?.actual === actual && actual.value === previous.draft.body) actual.value = draft.body
    applied.current = { title, actual, draft }
  }, [draft, report])
  return { draft, clearDraft: () => clearDiscussionIssueDraft(id) }
}
