import type { BugReportResult, IssueTracker } from './issue-tracker'

export function BugReportNotice({ tracker }: { tracker: IssueTracker | null }) {
  if (tracker?.tracker === 'github') return <p className="service-note">Posting opens a public issue on GitHub, where the module’s developers track and fix bugs. They are notified there. Your title, reproduction steps, results, device, module version and username will be public. Your full configuration, build fingerprint and any attached log stay private to you, the administrator and verified module maintainers. You don’t need a GitHub account: replies and status changes appear in your bell and unread activity emails. Leave out firmware and personal information.</p>
  return <p className="service-note">Posting sends this bug to the module’s verified developers and creates a public thread in <a href="#forum?category=issues">Bug reports</a>. Your title, reproduction steps, results, device and module version will be public under your username. Your full configuration, build fingerprint and any attached log are shared privately with you, the administrator and verified module maintainers. Leave out firmware and personal information.</p>
}

/** Open issues first, so a reporter can add to one instead of filing it again. */
export function ExistingIssues({ id, tracker }: { id: string; tracker: IssueTracker | null }) {
  if (tracker?.tracker !== 'github') return <a href={'#forum?category=issues&module=' + encodeURIComponent(id)}>Check existing bug reports →</a>
  return <div className="issue-report-existing">
    {tracker.issues.length ? <><p className="service-note">Is it one of these open issues? If so, comment there with your setup instead of reporting it again.</p>
      <ul>{tracker.issues.map(issue => <li key={issue.url}><a href={issue.url} target="_blank" rel="noreferrer">{issue.title} ↗</a></li>)}</ul></>
      : <p className="service-note">No open issues were reported for this module from Modwerk.</p>}
    {tracker.allUrl && <a href={tracker.allUrl} target="_blank" rel="noreferrer">All open issues for this module on GitHub ↗</a>}
  </div>
}

export function BugReportSuccess({ report }: { report: BugReportResult }) {
  const account = <>Manage the private details under <a href={'#account/report/' + report.id}>Your account</a>. Status changes reach your bell and unread activity emails, following your <a href="#account/notifications">notification settings</a>.</>
  if (report.githubUrl) return <><strong>Your bug report is on GitHub</strong><p>The module developers have been notified. <a href={report.githubUrl} target="_blank" rel="noreferrer">Open the issue ↗</a> to follow public replies. {account}</p></>
  if (report.forumThreadId) return <><strong>Your bug report is posted</strong><p>It is in the Bug Reports forum and the module developers’ inbox. <a href={'#forum/thread/' + report.forumThreadId}>Open the discussion</a> to follow public replies. {account}</p></>
  return <><strong>Your bug report is saved</strong><p>It reached the module developers’ inbox and will be posted to GitHub shortly. {account}</p></>
}
