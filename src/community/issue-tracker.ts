import { useEffect, useState } from 'react'
import { api } from './api'

export type BugReportResult = { id: string; author: string; forumThreadId: string | null; github: 'none' | 'synced' | 'syncing' | 'failed'; githubUrl: string | null }
/** Where public bug reports for a module are tracked, and its open GitHub issues for a duplicate check. */
export type IssueTracker = { tracker: 'github' | 'forum'; issues: { title: string; url: string; created_at: string }[]; allUrl: string | null }

/** Loads once the report form is opened, so module pages do not each ask for it. */
export function useIssueTracker(id: string, enabled: boolean) {
  const [tracker, setTracker] = useState<IssueTracker | null>(null)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void api<IssueTracker>('/modules/' + id + '/issues').then(value => { if (!cancelled) setTracker(value) }).catch(() => { if (!cancelled) setTracker({ tracker: 'forum', issues: [], allUrl: null }) })
    return () => { cancelled = true }
  }, [id, enabled])
  return tracker
}
