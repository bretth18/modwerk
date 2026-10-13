import type { PublicModuleIssue, useModuleIssues } from './issue-tracker'
import { ForumPostBody } from './ForumPostBody'
import { ForumTime } from './ForumTime'
import { Icon } from '../components/Icon'
import { GithubIssueReplies } from './GithubIssueReplies'
import { modulePageHref } from './modules'
import { REPORT_KINDS, reportStatusLabel, isConfirmedBug } from './report-closure'

export function IssueCount({ count }: { count: number }) {
  return <span className="tab-count module-issue-count" data-open={count > 0} aria-label={count + (count === 1 ? ' open issue' : ' open issues')}>{count}</span>
}

export function ModuleIssueCard({ issue, moduleId }: { issue: PublicModuleIssue; moduleId?: string }) {
  const github = issue.url.startsWith('https://github.com/'), configuration = issue.scope === 'configuration' ? issue.details?.modules ?? [] : null
  return <article className="module-issue-card" aria-labelledby={'issue-title-' + issue.id}>
    <header className="module-issue-header">
      <div className="module-issue-heading">
        <span className="module-issue-state" data-open={issue.status === 'open'} data-confirmed={issue.status === 'open' && isConfirmedBug(issue)}><Icon name={issue.closure_reason === 'fixed' ? 'check' : 'message'} size={14}/>{reportStatusLabel(issue)}</span>
        {issue.report_kind && issue.report_kind !== 'bug' && <span className="pill">{REPORT_KINDS[issue.report_kind]}</span>}
        {isConfirmedBug(issue) && !['confirmed','awaiting_verification'].includes(issue.triage_state ?? '') && issue.status === 'open' && <span className="pill">Confirmed bug</span>}
        {issue.number !== null && <span className="module-issue-number">#{issue.number}</span>}
        {configuration && <span className="pill">Whole configuration</span>}
        <h3 id={'issue-title-' + issue.id}>{issue.title}</h3>
      </div>
      <a className="text-button" href={issue.url} {...(github ? { target: '_blank', rel: 'noreferrer' } : {})}>{github ? 'View on GitHub' : 'View discussion'} ↗</a>
    </header>
    <div className="module-issue-meta">
      {issue.reporter && <span>Reported by <a href={'#forum/profile/' + encodeURIComponent(issue.reporter)}>@{issue.reporter}</a></span>}
      <ForumTime value={issue.created_at}/>
    </div>
    {isConfirmedBug(issue) && <p className="service-note">Affected version: {issue.affected_version ?? 'Unknown'}{configuration && ' · Cause has not been attributed to one module.'}</p>}
    {(issue.status === 'closed' ? issue.closure_note : issue.triage_note) && <div className="module-issue-triage"><strong>Maintainer update</strong><ForumPostBody body={(issue.status === 'closed' ? issue.closure_note : issue.triage_note)!}/></div>}
    {issue.details ? <>
      <dl className="module-issue-device"><div><dt>Device</dt><dd>{issue.details.device}</dd></div>{configuration ? <div><dt>Configuration</dt><dd>{configuration.map((module, index) => <span key={module.id}>{index > 0 && ', '}<a href={modulePageHref(module.id)}>{module.name}</a> {module.version}</span>)}</dd></div> : <div><dt>Module version</dt><dd>{issue.details.version}</dd></div>}</dl>
      <div className="module-issue-description"><section><h4>Steps to reproduce</h4><ForumPostBody body={issue.details.steps}/></section>
        <div className="module-issue-results"><section><h4>Expected result</h4><ForumPostBody body={issue.details.expected}/></section><section><h4>Actual result</h4><ForumPostBody body={issue.details.actual}/></section></div>
      </div>
    </> : <p className="service-note">The description for this older report is available {github ? 'on GitHub' : 'in its discussion'}.</p>}
    {github && moduleId && issue.details && <GithubIssueReplies moduleId={moduleId} issueId={issue.id} githubUrl={issue.url}/>}
  </article>
}

export function ModuleIssues({ id, issues, onReportIssue }: { id: string; issues: ReturnType<typeof useModuleIssues>; onReportIssue: () => void }) {
  const { data, error, loading, status, page, setStatus, setPage, retry } = issues
  return <section className="detail-section module-issues forum-page">
    <div className="section-title"><h2>Issues {data && <IssueCount count={data.openCount}/>}</h2><button className="button button-quiet module-issue-action" onClick={onReportIssue}><Icon name="message" size={16}/>Report an issue</button></div>
    <p className="module-issues-intro">Reports for this module, and for whole configurations that include it. An open report may be waiting for review or more information. Check existing reports before opening a new issue.</p>
    {data?.confirmedCount !== undefined && <p className="service-note">{data.confirmedCount} confirmed {data.confirmedCount === 1 ? 'report' : 'reports'} · {data.needsInfoCount ?? 0} waiting for reporter. Configuration reports do not establish which module caused the problem.</p>}
    <div className="module-issue-filters" role="group" aria-label="Filter issues by status">
      <button type="button" aria-pressed={status === 'open'} onClick={() => setStatus('open')}><Icon name="message" size={14}/>Open{data && <IssueCount count={data.openCount}/>}</button>
      <button type="button" aria-pressed={status === 'closed'} onClick={() => setStatus('closed')}><Icon name="check" size={14}/>Closed{data && <span className="tab-count">{data.closedCount}</span>}</button>
    </div>
    {error ? <><p className="file-error" role="alert">Issues could not load. {error}</p><button className="button button-quiet" onClick={retry}>Try again</button></> : loading ? <p role="status">Loading issues…</p> : data && <>
      {data.issues.length ? <ul className="module-issue-list">{data.issues.map(issue => <li key={issue.id}><ModuleIssueCard issue={issue} moduleId={id}/></li>)}</ul> : <div className="module-issues-empty" role="status"><Icon name="message" size={24}/><div><h3>{status === 'open' ? 'No open issues' : 'No closed issues yet'}</h3><p>{status === 'open' ? data.closedCount ? 'All reported issues have been closed. You can browse them in the Closed tab.' : 'No public reports have been filed for this module.' : 'Closed reports appear here with their outcome when it is recorded.'}</p></div></div>}
      {(page > 0 || data.hasMore) && <nav className="module-issue-pagination" aria-label="Issue pages"><button className="button button-quiet" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button className="button button-quiet" disabled={!data.hasMore} onClick={() => setPage(page + 1)}>Next</button></nav>}
      <a className="text-button" href={data.allUrl ?? '#forum?category=issues&module=' + encodeURIComponent(id)} {...(data.allUrl ? { target: '_blank', rel: 'noreferrer' } : {})}>{data.allUrl ? 'View all ' + status + ' issues on GitHub' : 'Open bug reports in the forum'} ↗</a>
    </>}
  </section>
}
