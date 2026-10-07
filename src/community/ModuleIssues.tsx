import { useEffect, useState } from 'react'
import { api } from './api'
import type { IssueTracker } from './issue-tracker'
import type { ForumThread } from './forum-contract'
import { ForumThreadList } from './ForumThreadList'
import { Icon } from '../components/Icon'

type Data = { tracker: IssueTracker; threads: ForumThread[]; hasMore: boolean }
export function ModuleIssues({ id, onReportIssue }: { id: string; onReportIssue: () => void }) {
  const [data,setData] = useState<Data | null>(null), [error,setError] = useState(''), [revision,setRevision] = useState(0)
  const forumHref = '#forum?category=issues&module='+encodeURIComponent(id)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const tracker = await api<IssueTracker>('/modules/'+id+'/issues')
      const forum = tracker.tracker==='forum'?await api<{threads:ForumThread[];hasMore:boolean}>('/forum/threads?category=issues&module='+encodeURIComponent(id)):{threads:[],hasMore:false}
      if(!cancelled){setData({tracker,...forum});setError('')}
    })().catch(error=>{if(!cancelled)setError(error.message)})
    return () => {cancelled=true}
  },[id,revision])
  return <section className="detail-section module-issues forum-page">
    <div className="section-title"><h2>Issues</h2><button className="button button-danger" onClick={onReportIssue}><Icon name="message" size={15}/>Report an issue</button></div>
    {error?<><p className="file-error" role="alert">Issues could not load. {error}</p><button className="button button-quiet" onClick={()=>{setError('');setRevision(value=>value+1)}}>Try again</button></>:!data?<p role="status">Loading issues…</p>:data.tracker.tracker==='github'?<>
      {data.tracker.issues.length?<ul className="module-issue-list">{data.tracker.issues.map(issue=><li key={issue.url}><a href={issue.url} target="_blank" rel="noreferrer">{issue.title} ↗</a><span className="pill">Open</span></li>)}</ul>:<p className="service-note">No open issues reported from Modwerk for this module.</p>}
      {data.tracker.allUrl&&<a className="text-button" href={data.tracker.allUrl} target="_blank" rel="noreferrer">View all open issues on GitHub ↗</a>}
    </>:<>
      {data.threads.length?<ForumThreadList threads={data.threads}/>:<p className="service-note">No public bug reports for this module yet.</p>}
      <a className="text-button" href={forumHref}>{data.hasMore?'View more bug reports':'Open bug reports in the forum'} ↗</a>
    </>}
  </section>
}
