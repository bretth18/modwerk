export type BugReportResult = { id: string; author: string; forumThreadId: string }

export function BugReportNotice() {
  return <p className="service-note">Posting sends this bug to the module’s verified developers and creates a public thread in <a href="#forum?category=issues">Bug reports</a>. Your title, reproduction steps, results, device and module version will be public under your username. Your full configuration, build fingerprint and any attached log are shared privately with you, the administrator and verified module maintainers. Leave out firmware and personal information.</p>
}

export function BugReportSuccess({report}:{report:BugReportResult}) {
  return <><strong>Your bug report is posted</strong><p>It is in the Bug Reports forum and the module developers’ inbox. <a href={'#forum/thread/'+report.forumThreadId}>Open the discussion</a> to follow public replies. Manage the private details under <a href={'#account/report/'+report.id}>Your account</a>.</p></>
}
