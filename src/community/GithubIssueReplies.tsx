import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from './api'
import { ForumTime } from './ForumTime'

export type GithubReply = { id: number; author: string; body: string; url: string; created_at: string; updated_at: string }
export type GithubReplies = { replies: GithubReply[]; hasMore: boolean }

export function GithubReplyList({ replies }: { replies: GithubReply[] }) {
  return <ul className="github-issue-replies">{replies.map(reply => <li key={reply.id}>
    <div className="module-issue-meta"><strong>{reply.author}</strong><ForumTime value={reply.created_at}/>{reply.updated_at !== reply.created_at && <span>Edited</span>}<a href={reply.url} target="_blank" rel="noopener noreferrer">View reply on GitHub ↗</a></div>
    <div className="forum-post-body"><Markdown remarkPlugins={[remarkGfm]} skipHtml allowedElements={['p','br','strong','em','del','a','code','pre','blockquote','ul','ol','li','h1','h2','h3','h4','hr','table','thead','tbody','tr','th','td']} unwrapDisallowed components={{ a: ({ href, children }) => {
      let link: URL | null = null
      try { if (href) link = new URL(href, reply.url) } catch { /* Invalid links remain text. */ }
      return link && ['https:', 'http:'].includes(link.protocol) ? <a href={link.href} target="_blank" rel="noopener noreferrer nofollow">{children}</a> : <span>{children}</span>
    } }}>{reply.body}</Markdown></div>
  </li>)}</ul>
}

export function GithubIssueReplies({ moduleId, issueId, githubUrl, initiallyOpen = false }: { moduleId: string; issueId: string; githubUrl: string; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen), [page, setPage] = useState(0), [revision, setRevision] = useState(0)
  const request = `${moduleId}:${issueId}:${page}:${revision}`
  const [result, setResult] = useState<{ request: string; data: GithubReplies | null; error: string } | null>(null)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void api<GithubReplies>('/modules/' + moduleId + '/issues/' + issueId + '/replies?page=' + page)
      .then(data => { if (!cancelled) setResult({ request, data, error: '' }) })
      .catch(error => { if (!cancelled) setResult({ request, data: null, error: error instanceof Error ? error.message : 'Unable to load replies.' }) })
    return () => { cancelled = true }
  }, [open, moduleId, issueId, page, request])
  const current = result?.request === request ? result : null
  return <details className="github-issue-conversation" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>GitHub replies</summary>
    {open && <div><p className="service-note">Public replies appear here from GitHub. <a href={githubUrl} target="_blank" rel="noopener noreferrer">Reply on GitHub ↗</a></p>
      {!current ? <p role="status">Loading replies…</p> : current.error ? <><p className="file-error" role="alert">{current.error}</p><button className="button button-quiet" onClick={() => setRevision(value => value + 1)}>Try again</button></> : current.data && <>
        {current.data.replies.length ? <GithubReplyList replies={current.data.replies}/> : <p className="service-note">{page ? 'No more replies.' : 'No GitHub replies yet.'}</p>}
        {(page > 0 || current.data.hasMore) && <nav className="module-issue-pagination" aria-label="GitHub reply pages"><button className="button button-quiet" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous replies</button><span>Page {page + 1}</span><button className="button button-quiet" disabled={!current.data.hasMore} onClick={() => setPage(value => value + 1)}>Next replies</button></nav>}
        <button className="text-button" onClick={() => setRevision(value => value + 1)}>Refresh replies</button>
      </>}
    </div>}
  </details>
}
