import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api, post } from './api'
import { ForumTime } from './ForumTime'
import { useCommunity } from './context'

export type GithubReply = { id: number; author: string; body: string; url: string; created_at: string; updated_at: string }
export type GithubReplies = { replies: GithubReply[]; hasMore: boolean }

export function GithubReplyForm({ moduleId, issueId, onSent }: { moduleId: string; issueId: string; onSent: () => void }) {
  const { session } = useCommunity()
  const [draft, setDraft] = useState({ body: '', requestId: '' }), [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false)
  async function send() {
    if (busy) return
    const requestId = draft.requestId || crypto.randomUUID()
    setDraft({ ...draft, requestId }); setBusy(true); setError(''); setSent(false)
    try {
      await post('/modules/' + moduleId + '/issues/' + issueId + '/replies', { body: draft.body, requestId })
      setDraft({ body: '', requestId: '' }); setSent(true); onSent()
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to send your reply. Your draft is kept below.') }
    finally { setBusy(false) }
  }
  if (!session.user) return <p className="service-note"><a href="#account">Sign in to reply on Modwerk</a>.</p>
  if (!session.user.verified) return <p className="service-note"><a href="#account">Verify your email</a> to reply.</p>
  return <form className="community-form" onSubmit={event => { event.preventDefault(); void send() }}>
    <label>Public reply<textarea value={draft.body} disabled={busy} onChange={event => { setDraft({ body: event.target.value, requestId: '' }); setSent(false) }} maxLength={4000} required rows={3}/></label>
    <p className="service-note">Your reply and Modwerk username will appear publicly here and on GitHub. Keep logs and private configuration details in your private report.</p>
    {error && <p className="file-error" role="alert">{error}</p>}{sent && <p role="status">Your reply was sent to the GitHub conversation.</p>}
    <button className="button button-primary" disabled={busy || !draft.body.trim()}>{busy ? 'Sending…' : 'Send public reply'}</button>
  </form>
}

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
    {open && <div><p className="service-note">The same public conversation appears here and <a href={githubUrl} target="_blank" rel="noopener noreferrer">on GitHub ↗</a>. You can reply below without a GitHub account.</p>
      {!current ? <p role="status">Loading replies…</p> : current.error ? <><p className="file-error" role="alert">{current.error}</p><button className="button button-quiet" onClick={() => setRevision(value => value + 1)}>Try again</button></> : current.data && <>
        {current.data.replies.length ? <GithubReplyList replies={current.data.replies}/> : <p className="service-note">{page ? 'No more replies.' : 'No GitHub replies yet.'}</p>}
        {(page > 0 || current.data.hasMore) && <nav className="module-issue-pagination" aria-label="GitHub reply pages"><button className="button button-quiet" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous replies</button><span>Page {page + 1}</span><button className="button button-quiet" disabled={!current.data.hasMore} onClick={() => setPage(value => value + 1)}>Next replies</button></nav>}
        <button className="text-button" onClick={() => setRevision(value => value + 1)}>Refresh replies</button>
      </>}
      <GithubReplyForm moduleId={moduleId} issueId={issueId} onSent={() => setRevision(value => value + 1)}/>
    </div>}
  </details>
}
